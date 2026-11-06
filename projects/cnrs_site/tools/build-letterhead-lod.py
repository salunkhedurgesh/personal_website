#!/usr/bin/env python3
"""Build lettering-only robot LODs without changing the source GLB node graph.

Run with ordinary Python; Blender performs per-mesh edge-collapse decimation.
Original high-resolution GLBs and the playground STL files are never modified.
The output uses ordinary non-interleaved float32 geometry and uint16 indices,
matching the small GLB reader in js/clay/arms.js.
"""

from pathlib import Path
import copy
import hashlib
import json
import math
import os
import shutil
import struct
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "models/letterhead"
SOURCES = ("abb-gofa-crb15000.glb", "kuka-iiwa7.glb")
RATIO = 0.13


def read_glb(path):
    raw = path.read_bytes()
    magic, version, size = struct.unpack_from("<III", raw)
    assert magic == 0x46546C67 and version == 2 and size == len(raw)
    json_length, chunk_type = struct.unpack_from("<II", raw, 12)
    assert chunk_type == 0x4E4F534A
    document = json.loads(raw[20 : 20 + json_length])
    cursor = 20 + json_length
    bin_length, chunk_type = struct.unpack_from("<II", raw, cursor)
    assert chunk_type == 0x004E4942
    return raw, document, raw[cursor + 8 : cursor + 8 + bin_length]


def accessor(document, binary, index):
    import numpy as np

    item = document["accessors"][index]
    view = document["bufferViews"][item["bufferView"]]
    assert not view.get("byteStride") and not item.get("sparse")
    types = {5121: "<u1", 5123: "<u2", 5125: "<u4", 5126: "<f4"}
    widths = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}
    width = widths[item["type"]]
    data = np.frombuffer(
        binary,
        dtype=types[item["componentType"]],
        count=item["count"] * width,
        offset=view.get("byteOffset", 0) + item.get("byteOffset", 0),
    )
    return data.reshape((-1, width)) if width > 1 else data


def smooth_normals(positions, faces):
    """Split hard edges and area-average normals on each smooth surface fan."""
    import numpy as np

    faces = np.asarray(faces, dtype=np.int32)
    cross = np.cross(
        positions[faces[:, 1]] - positions[faces[:, 0]],
        positions[faces[:, 2]] - positions[faces[:, 0]],
    )
    lengths = np.linalg.norm(cross, axis=1)
    valid = lengths > 1e-14
    faces, cross, lengths = faces[valid], cross[valid], lengths[valid]
    flat = cross / lengths[:, None]
    parent = list(range(len(faces) * 3))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    edges = {}
    for face_index, face in enumerate(faces):
        for corner in range(3):
            a, b = int(face[corner]), int(face[(corner + 1) % 3])
            edges.setdefault(tuple(sorted((a, b))), []).append((face_index, corner))
    threshold = math.cos(math.radians(55))
    for (a, b), adjacent in edges.items():
        if len(adjacent) != 2:
            continue
        f, g = adjacent[0][0], adjacent[1][0]
        if np.dot(flat[f], flat[g]) < threshold:
            continue
        for vertex in (a, b):
            first = f * 3 + int(np.flatnonzero(faces[f] == vertex)[0])
            second = g * 3 + int(np.flatnonzero(faces[g] == vertex)[0])
            parent[find(first)] = find(second)
    vectors = {}
    for f, face in enumerate(faces):
        for c, vertex in enumerate(face):
            root = find(f * 3 + c)
            if root not in vectors:
                vectors[root] = cross[f].copy()
            else:
                vectors[root] += cross[f]
    vertices, normals, indices, lookup = [], [], [], {}
    for f, face in enumerate(faces):
        for c, vertex in enumerate(face):
            root = find(f * 3 + c)
            if root not in lookup:
                lookup[root] = len(vertices)
                vertices.append(positions[vertex])
                normal = vectors[root]
                length = np.linalg.norm(normal)
                normals.append(normal / length if length > 1e-14 else flat[f])
            indices.append(lookup[root])
    return (
        np.asarray(vertices, dtype="<f4"),
        np.asarray(normals, dtype="<f4"),
        np.asarray(indices, dtype="<u2"),
    )


def decimate(positions, indices, name, ratio):
    import bpy
    import numpy as np

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(positions.tolist(), [], indices.reshape((-1, 3)).tolist())
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    modifier = obj.modifiers.new("Letterhead silhouette LOD", "DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    mesh = obj.data
    mesh.calc_loop_triangles()
    coords = np.empty((len(mesh.vertices), 3), dtype="<f4")
    mesh.vertices.foreach_get("co", coords.ravel())
    triangles = [tuple(t.vertices) for t in mesh.loop_triangles]
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.meshes.remove(mesh)
    return smooth_normals(coords, triangles)


def build(name):
    import numpy as np

    source = ROOT / "models" / name
    raw, original, binary = read_glb(source)
    source_hash = hashlib.sha256(raw).hexdigest()
    result = copy.deepcopy(original)
    result["accessors"], result["bufferViews"] = [], []
    packed = bytearray()
    stats = []

    def add(data, kind, component, target):
        while len(packed) % 4:
            packed.append(0)
        body = data.tobytes()
        view_index = len(result["bufferViews"])
        result["bufferViews"].append(
            {"buffer": 0, "byteOffset": len(packed), "byteLength": len(body), "target": target}
        )
        packed.extend(body)
        record = {
            "bufferView": view_index,
            "byteOffset": 0,
            "componentType": component,
            "count": len(data),
            "type": kind,
        }
        minimum, maximum = np.min(data, axis=0), np.max(data, axis=0)
        record["min"] = [minimum.item()] if kind == "SCALAR" else minimum.tolist()
        record["max"] = [maximum.item()] if kind == "SCALAR" else maximum.tolist()
        result["accessors"].append(record)
        return len(result["accessors"]) - 1

    for mesh_index, mesh in enumerate(original["meshes"]):
        assert len(mesh["primitives"]) == 1
        primitive = mesh["primitives"][0]
        assert primitive.get("mode", 4) == 4
        assert set(primitive["attributes"]) <= {"POSITION", "NORMAL"}
        positions = accessor(original, binary, primitive["attributes"]["POSITION"])
        indices = accessor(original, binary, primitive["indices"])
        ratio = RATIO
        while True:
            reduced, normals, triangles = decimate(positions, indices, mesh["name"], ratio)
            delta = np.max(
                np.abs(
                    np.stack((reduced.min(axis=0), reduced.max(axis=0)))
                    - np.stack((positions.min(axis=0), positions.max(axis=0)))
                ),
                axis=0,
            )
            relative_error = float(np.max(delta / np.maximum(np.ptp(positions, axis=0), 1e-5)))
            if relative_error <= 0.01 or ratio >= 0.6:
                break
            ratio = min(0.6, ratio * 1.5)
        assert len(reduced) < 65536 and np.max(triangles) < len(reduced)
        assert np.isfinite(reduced).all() and np.isfinite(normals).all()
        assert np.max(np.abs(np.linalg.norm(normals, axis=1) - 1)) < 0.001
        new_primitive = result["meshes"][mesh_index]["primitives"][0]
        new_primitive["attributes"] = {
            "POSITION": add(reduced, "VEC3", 5126, 34962),
            "NORMAL": add(normals, "VEC3", 5126, 34962),
        }
        new_primitive["indices"] = add(triangles, "SCALAR", 5123, 34963)
        bounds_before = [positions.min(axis=0).tolist(), positions.max(axis=0).tolist()]
        bounds_after = [reduced.min(axis=0).tolist(), reduced.max(axis=0).tolist()]
        error = float(np.max(np.abs(np.asarray(bounds_after) - np.asarray(bounds_before))))
        stats.append(
            {
                "name": mesh["name"],
                "sourceTriangles": len(indices) // 3,
                "triangles": len(triangles) // 3,
                "vertices": len(reduced),
                "collapseRatio": ratio,
                "sourceBounds": bounds_before,
                "bounds": bounds_after,
                "maxBoundsDifference": error,
                "maxRelativeBoundsDifference": relative_error,
            }
        )
        print(
            name,
            mesh["name"],
            len(indices) // 3,
            "->",
            len(triangles) // 3,
            "triangles; bounds delta",
            round(error, 6),
            flush=True,
        )

    # No object transform is passed through Blender's glTF import/export path.
    # All original hierarchy, materials, source metadata, and mesh names remain.
    for key in ("nodes", "materials", "scenes", "scene", "asset"):
        assert result[key] == original[key], "Changed " + key
    result["buffers"] = [{"byteLength": len(packed)}]
    while len(packed) % 4:
        packed.append(0)
    text = json.dumps(result, separators=(",", ":")).encode()
    text += b" " * ((-len(text)) % 4)
    body = (
        struct.pack("<III", 0x46546C67, 2, 28 + len(text) + len(packed))
        + struct.pack("<II", len(text), 0x4E4F534A)
        + text
        + struct.pack("<II", len(packed), 0x004E4942)
        + packed
    )
    OUTPUT.mkdir(exist_ok=True)
    destination = OUTPUT / name
    destination.write_bytes(body)
    _, checked, checked_binary = read_glb(destination)
    for mesh in checked["meshes"]:
        primitive = mesh["primitives"][0]
        points = accessor(checked, checked_binary, primitive["attributes"]["POSITION"])
        indexes = accessor(checked, checked_binary, primitive["indices"])
        assert np.max(indexes) < len(points)
    assert hashlib.sha256(source.read_bytes()).hexdigest() == source_hash
    return {
        "source": "models/" + name,
        "file": "models/letterhead/" + name,
        "sourceSha256": source_hash,
        "sha256": hashlib.sha256(body).hexdigest(),
        "sourceBytes": len(raw),
        "bytes": len(body),
        "sourceTriangles": sum(s["sourceTriangles"] for s in stats),
        "triangles": sum(s["triangles"] for s in stats),
        "meshes": stats,
        "hierarchyTransformsMaterialsPreserved": True,
    }


def validate_silhouettes():
    import numpy as np
    from PIL import Image, ImageDraw

    path = OUTPUT / "manifest.json"
    manifest = json.loads(path.read_text())
    for record in manifest["models"]:
        _, original, original_binary = read_glb(ROOT / record["source"])
        _, reduced, reduced_binary = read_glb(ROOT / record["file"])
        checks = []
        for index, mesh in enumerate(original["meshes"]):
            first = mesh["primitives"][0]
            second = reduced["meshes"][index]["primitives"][0]
            a = accessor(original, original_binary, first["attributes"]["POSITION"])
            b = accessor(reduced, reduced_binary, second["attributes"]["POSITION"])
            triangles_a = accessor(original, original_binary, first["indices"]).reshape((-1, 3))
            triangles_b = accessor(reduced, reduced_binary, second["indices"]).reshape((-1, 3))
            views = []
            for yaw, pitch in [
                (0, 0),
                (math.pi / 2, 0),
                (0, math.pi / 2),
                (0.65, 0.4),
                (-0.65, -0.3),
            ]:
                rotation = np.asarray(
                    [
                        [math.cos(yaw), 0, math.sin(yaw)],
                        [
                            math.sin(yaw) * math.sin(pitch),
                            math.cos(pitch),
                            -math.cos(yaw) * math.sin(pitch),
                        ],
                    ]
                )
                x, y = a @ rotation.T, b @ rotation.T
                minimum, maximum = x.min(axis=0), x.max(axis=0)
                scale = 86 / max(maximum - minimum)
                offset = (np.asarray([96, 96]) - (maximum - minimum) * scale) / 2
                x, y = (x - minimum) * scale + offset, (y - minimum) * scale + offset

                def raster(points, triangles):
                    image = Image.new("1", (96, 96))
                    draw = ImageDraw.Draw(image)
                    for triangle in triangles:
                        draw.polygon([tuple(p) for p in points[triangle]], fill=1)
                    return np.asarray(image, dtype=bool)

                mask_a, mask_b = raster(x, triangles_a), raster(y, triangles_b)
                views.append(float((mask_a & mask_b).sum() / (mask_a | mask_b).sum()))
            checks.append({"mesh": mesh["name"], "minimumIoU": min(views)})
        minimum_iou = min(row["minimumIoU"] for row in checks)
        assert minimum_iou >= 0.96, record["file"] + " lost too much silhouette detail"
        record["silhouetteCheck"] = {
            "resolutionPx": 96,
            "viewsPerMesh": 5,
            "minimumIoU": minimum_iou,
            "meshes": checks,
        }
        print(record["file"], "minimum silhouette IoU", round(minimum_iou, 4), flush=True)
    path.write_text(json.dumps(manifest, indent=2) + "\n")


def main():
    try:
        import bpy
    except ImportError:
        blender = shutil.which("blender")
        if not blender:
            raise SystemExit("Blender is required to regenerate the lettering LODs.")
        subprocess.run(
            [
                blender,
                "--background",
                "--factory-startup",
                "--python-exit-code",
                "1",
                "--python",
                str(Path(__file__).resolve()),
                "--",
                "--inside",
            ],
            cwd=ROOT,
            check=True,
        )
        validate_silhouettes()
        return
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    manifest = {
        "purpose": "Low-resolution letterhead robots only; original high-resolution sources remain unchanged.",
        "generator": "tools/build-letterhead-lod.py",
        "blenderVersion": bpy.app.version_string,
        "collapseRatio": RATIO,
        "models": [build(name) for name in SOURCES],
    }
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        json.dumps(
            {
                m["file"]: {"bytes": m["bytes"], "triangles": m["triangles"]}
                for m in manifest["models"]
            },
            indent=2,
        ),
        flush=True,
    )


if __name__ == "__main__":
    if "--inside" in sys.argv:
        # This is a disposable background Blender process. Once all files have
        # closed, exit directly rather than waiting for optional audio shutdown.
        try:
            main()
        except BaseException:
            import traceback

            traceback.print_exc()
            sys.stdout.flush()
            sys.stderr.flush()
            os._exit(1)
        sys.stdout.flush()
        sys.stderr.flush()
        os._exit(0)
    else:
        main()
