#!/usr/bin/env python3
"""Restore pinned engine assets and verify their hashes; no package manager needed."""
from pathlib import Path
import hashlib
import json
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'lib/chess'
MANIFEST = json.loads((BASE / 'manifest.json').read_text())


def verify(data, entry):
    if hashlib.sha256(data).hexdigest() != entry['sha256']:
        raise ValueError('SHA-256 mismatch: ' + entry['file'])
    return data


def restore():
    for entry in MANIFEST['downloads']:
        destination = BASE / entry['file']
        if destination.exists():
            verify(destination.read_bytes(), entry)
        else:
            with urllib.request.urlopen(entry['url'], timeout=60) as response:
                data = verify(response.read(), entry)
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
        print('Verified', entry['file'])

    archive = BASE / 'source/stockfish-19.0.1.tar.gz'
    with tarfile.open(archive) as source:
        license_data = source.extractfile('stockfish.js-19.0.1/Copying.txt').read()
    (ROOT / 'notices/Stockfish-GPL-3.0.txt').write_bytes(license_data)

    # The release embeds the complete NNUE. Recover it without depending on a
    # separate weights server; verify the full official network SHA-256.
    data = (BASE / 'stockfish-19-lite-single.wasm').read_bytes()

    def leb(position):
        value, shift = 0, 0
        while True:
            byte = data[position]
            position += 1
            value |= (byte & 127) << shift
            shift += 7
            if byte < 128:
                return value, position

    position, segments = 8, []
    while position < len(data):
        section = data[position]
        size, start = leb(position + 1)
        if section == 11:
            count, cursor = leb(start)
            for _ in range(count):
                flags, cursor = leb(cursor)
                assert flags == 0 and data[cursor] == 0x41
                offset, cursor = leb(cursor + 1)
                assert data[cursor] == 0x0b
                length, cursor = leb(cursor + 1)
                segments.append((offset, data[cursor:cursor + length]))
                cursor += length
        position = start + size
    memory = bytearray(max(offset + len(chunk) for offset, chunk in segments))
    for offset, chunk in segments:
        memory[offset:offset + len(chunk)] = chunk
    start = memory.index(bytes.fromhex('fa8a446a'))
    entry = MANIFEST['network']
    network = verify(bytes(memory[start:start + entry['bytes']]), entry)
    (BASE / entry['file']).write_bytes(network)
    print('Verified source network', entry['sha256'])


if __name__ == '__main__':
    restore()
