#!/usr/bin/env python3
"""Optional one-time installation of the official single-threaded Jolt module for self-hosting.
No npm, build step, API keys or runtime Python. Run from any directory with Python 3.9+ and Internet access.
"""

import argparse, base64, hashlib, hmac, io, json, os, tarfile, urllib.request
from pathlib import Path

VERSION = "1.1.0"
ROOT = Path(__file__).resolve().parent.parent
MARKER = "/* Optional self-hosted Jolt settings. */"


def read(url, limit):
    req = urllib.request.Request(url, headers={"User-Agent": "letter-atelier-vendor/1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read(limit + 1)
    if len(data) > limit:
        raise ValueError("Unexpected package size")
    return data


def write_atomic(path, data):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(data)
    os.replace(tmp, path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--standalone", type=Path, help="Also embed Jolt in a generated copy of the standalone HTML"
    )
    args = parser.parse_args()
    meta = json.loads(read(f"https://registry.npmjs.org/jolt-physics/{VERSION}", 512_000))
    if meta["name"] != "jolt-physics" or meta["version"] != VERSION:
        raise ValueError("Unexpected package")
    payload = read(
        f"https://registry.npmjs.org/jolt-physics/-/jolt-physics-{VERSION}.tgz", 32_000_000
    )
    integrity = meta["dist"]["integrity"].split()
    digest = "sha512-" + base64.b64encode(hashlib.sha512(payload).digest()).decode("ascii")
    if not any(hmac.compare_digest(digest, s) for s in integrity):
        raise ValueError("Package failed registry integrity check")
    with tarfile.open(fileobj=io.BytesIO(payload), mode="r:gz") as archive:
        js = archive.extractfile("package/dist/jolt-physics.wasm-compat.js").read()
        notice = archive.extractfile("package/LICENSE").read()
    bundle = f"lib/jolt-physics-{VERSION}.mjs"
    config = ROOT / "js/clay/jolt-config.js"
    write_atomic(ROOT / bundle, js)
    write_atomic(ROOT / "notices/JoltPhysics-js-MIT.txt", notice)
    write_atomic(
        config,
        (
            MARKER + f'\nwindow.ATELIER_JOLT_URL=new URL("{bundle}",document.baseURI).href;\n'
        ).encode(),
    )
    print(
        "Local Jolt installed and configured. Serve index.html over HTTP(S), then choose Marionette."
    )
    if args.standalone:
        original = args.standalone.expanduser()
        html = original.read_text(encoding="utf-8")
        if MARKER not in html:
            raise ValueError("Use the accompanying Letter Atelier standalone HTML.")
        data = "data:text/javascript;base64," + base64.b64encode(js).decode("ascii")
        result = original.with_name(original.stem + "-with-jolt.html")
        html = html.replace(MARKER, "window.ATELIER_JOLT_URL=" + json.dumps(data) + ";", 1)
        # Keep the redistribution notice in the offline document as well as the website archive.
        html = html.replace(
            "</body>",
            '<script type="text/plain" id="jolt-license">'
            + notice.decode().replace("</script", "<\\/script")
            + "</script></body>",
            1,
        )
        write_atomic(result, html.encode())
        print(result)


if __name__ == "__main__":
    main()
