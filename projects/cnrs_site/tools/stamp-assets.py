#!/usr/bin/env python3
"""Stamp deferred assets with a content-derived release ID for safe HTTP caching."""
from pathlib import Path
import hashlib
import re

ROOT=Path(__file__).resolve().parents[1]
HTML=[ROOT/'index.html',ROOT/'projects/main/tour/index.html',ROOT/'navigation-models.html']


def html_version(text,version):
    text=re.sub(r'(<script\b[^>]*src="[^"?]+\.js)(?:\?v=[^"&]*)?("[^>]*>)',lambda m:m[1]+'?v='+version+m[2],text)
    text=re.sub(r'(<link\b[^>]*href="[^"?]+\.css)(?:\?v=[^"&]*)?(")',lambda m:m[1]+'?v='+version+m[2],text)
    text=re.sub(r'(src="images/previews/cnrs-logo\.webp)(?:\?v=[^"]*)?(")',lambda m:m[1]+'?v='+version+m[2],text)
    if 'window.ATLAS_ASSETS=' in text:
        if 'window.ATLAS_VERSION=' not in text:
            text=text.replace('<script>window.ATLAS_ASSETS=',"<script>window.ATLAS_VERSION='BUILD';</script><script>window.ATLAS_ASSETS=",1)
        text=re.sub(r"window\.ATLAS_VERSION='[^']*'","window.ATLAS_VERSION='"+version+"'",text)
    return text


def css_version(text,version):
    return re.sub(r'url\((images/nav-(?:home|publications|projects|teaching)\.png)(?:\?v=[A-Za-z0-9._-]+)?\)',lambda m:'url('+m[1]+'?v='+version+')',text)


files=set(HTML+[ROOT/'styles.css'])
for pattern in ['js/**/*.js','projects/main/tour/src/*.js','projects/main/tour/src/*.css','images/previews/*.webp','images/nav-*.png','images/occasions/*.png','models/letterhead/*.glb','models/zamanov-6rss-kinematics.json']:
    files.update(ROOT.glob(pattern))
digest=hashlib.sha256()
for path in sorted(files):
    data=path.read_bytes()
    if path.suffix in ['.html','.css','.js']:
        text=data.decode()
        if path in HTML:text=html_version(text,'BUILD')
        if path==ROOT/'styles.css':text=css_version(text,'BUILD')
        if path==ROOT/'js/assets.js':text=re.sub(r"const version='[^']*'","const version='BUILD'",text)
        text=re.sub(r'([?&]v=)[A-Za-z0-9._-]+',r'\1BUILD',text)
        data=text.encode()
    digest.update(str(path.relative_to(ROOT)).encode()+b'\0'+data)
version=digest.hexdigest()[:12]
for path in HTML:path.write_text(html_version(path.read_text(),version))
path=ROOT/'styles.css'
path.write_text(css_version(path.read_text(),version))
path=ROOT/'js/assets.js'
path.write_text(re.sub(r"const version='[^']*'","const version='"+version+"'",path.read_text()))
print('Asset release:',version)
