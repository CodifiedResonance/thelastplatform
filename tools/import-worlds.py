#!/usr/bin/env python3
"""Bring World Vault and Moonline onto The Last Platform.

  python3 tools/import-worlds.py <path to moonline repo> <path to world-vault-assets repo>

Their own repos stay the source. This copies them into public/moonline/ and public/world-vault/,
rewriting the addresses that pointed at codifiedresonance.com so everything runs from here.
Run it again whenever either world changes, then push."""
import os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(HERE, "..", "public")
SITE = "https://thelastplatform.com"
moon_src, wv_src = sys.argv[1], sys.argv[2]

def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f: f.write(text)

# ---------------------------------------------------------------- World Vault
wv = os.path.join(PUB, "world-vault")
shutil.rmtree(wv, ignore_errors=True)
os.makedirs(os.path.join(wv, "assets"))
for f in os.listdir(wv_src):
    if f.startswith("world-vault-") and f.endswith((".js", ".css")):
        shutil.copy(os.path.join(wv_src, f), os.path.join(wv, "assets", f))

def localise(t):
    t = t.replace("https://cdn.jsdelivr.net/gh/CodifiedResonance/world-vault-assets@main/", "/world-vault/assets/")
    t = t.replace("https://codifiedresonance.com/world-vault", SITE + "/world-vault")
    t = re.sub(r"https://cdn\.prod\.website-files\.com/[^\"]+", SITE + "/world-vault/og.png", t)
    # World Vault belongs to the platform now
    t = t.replace(" · Codified Resonance</title>", " · The Last Platform</title>").replace(" — Codified Resonance</title>", " · The Last Platform</title>")
    t = t.replace(" Part of Codified Resonance.", "")
    t = t.replace('content="Codified Resonance"', 'content="The Last Platform"')
    t = re.sub(r'\{ "@type": "WebSite", "@id": "https://codifiedresonance.com/#website"[^}]*\}',
               '{ "@type": "WebSite", "@id": "%s/#website", "url": "%s/", "name": "The Last Platform" }' % (SITE, SITE), t)
    t = t.replace('"@id": "https://codifiedresonance.com/#website"', '"@id": "%s/#website"' % SITE)
    t = t.replace('"name": "Codified Resonance",\n          "item": "https://codifiedresonance.com/"', '"name": "The Last Platform",\n          "item": "%s/"' % SITE)
    return t

raw = open(os.path.join(HERE, "world-vault-webflow-veils.txt"), encoding="utf-8").read()
raw = re.sub(r"^\s*\d+\t", "", raw, flags=re.M)              # in case it was copied with line numbers
pages = re.split(r'(?=<meta charset="UTF-8">)|(?=<!-- ═+\s*\n\s*WORLD VAULT · THRESHOLD)', raw)
pages = [p for p in pages if p.strip()]
names = []
for p in pages:
    m = re.search(r'<link rel="canonical" href="[^"]*/world-vault/?([a-z]*)"', p)
    names.append(m.group(1) if m else "?")
threshold_head = ""
for name, p in zip(names, pages):
    if "THRESHOLD — SEO HEAD BLOCK" in p:                   # the threshold's SEO block
        threshold_head = p[p.index("<!-- ─── Primary meta"):] if "<!-- ─── Primary meta" in p else p
        continue
    cut = p.index("</style>") + len("</style>")
    head, body = p[:cut], p[cut:]
    if name == "lift":
        head = head  # the lift page carries its own styles
    veil = name if name != "lift" else ""
    doc = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n' + localise(head).strip() +
           '\n</head>\n<body' + (' data-veil="%s"' % veil if veil else "") + '>\n' + localise(body).strip() + '\n</body>\n</html>\n')
    write(os.path.join(wv, name + ".html"), doc)

th = open(os.path.join(HERE, "world-vault-webflow-threshold.html"), encoding="utf-8").read()
th = th.replace("<title>World Vault · Codified Resonance</title>", localise(threshold_head).strip())
th = th.replace('<a href="/">Codified Resonance</a>', '<a href="/">The Last Platform</a>')
th = re.sub(r'\s*<footer class="footer">.*?</footer>', '', th, flags=re.S)       # no footer line: the threshold ends on the veils
shutil.copy(os.path.join(HERE, "world-vault-og.png"), os.path.join(wv, "og.png"))
th = localise(th)
th = th.replace('"https://codifiedresonance.com/#organization"', '"%s/#organization"' % SITE).replace('"https://codifiedresonance.com/"', '"%s/"' % SITE)
th = th.replace('"name": "Codified Resonance"', '"name": "The Last Platform"').replace("The unified field of the new world.", "A new gravity centre.")
write(os.path.join(wv, "index.html"), th)

# ---------------------------------------------------------------- Moonline
ml = os.path.join(PUB, "moonline")
shutil.rmtree(ml, ignore_errors=True)
skip = {".git", "platform", "README.md", "CNAME", ".nojekyll", "index.html", "og-last-platform.png"}
for f in os.listdir(moon_src):
    if f in skip: continue
    s, d = os.path.join(moon_src, f), os.path.join(ml, f)
    (shutil.copytree if os.path.isdir(s) else shutil.copy)(s, d)

def moon(t):
    t = t.replace("https://codifiedresonance.com/last-platform/moonline", "/moonline/")
    t = t.replace("https://moonline.codifiedresonance.com/", SITE + "/moonline/")
    t = t.replace("fillText('moonline.codifiedresonance.com", "fillText('thelastplatform.com/moonline")
    t = t.replace("MOONLINE · Codified Resonance", "MOONLINE · The Last Platform")
    t = t.replace("h==='codifiedresonance.com'", "h==='thelastplatform.com'||h==='codifiedresonance.com'")
    return t
for root, _, files in os.walk(ml):
    for f in files:
        if f.endswith((".html", ".js", ".css")):
            p = os.path.join(root, f); t = open(p, encoding="utf-8").read()
            t = moon(t)
            if f == "descent.js":
                t = t.replace("var TRACKS_BASE = '" + SITE + "/moonline/';", "var TRACKS_BASE = window.location.origin + '/moonline/';")
                t = t.replace('href=\\"/last-platform/node\\"', 'href=\\"/\\"')
            write(p, t)

write(os.path.join(ml, "index.html"), """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MOONLINE · The Last Platform</title>
<meta name="description" content="Five crossings. A re-feel of the forces at play in the universe, and the science is the antagonist.">
<link rel="canonical" href="%(s)s/moonline/">
<meta property="og:type" content="website">
<meta property="og:title" content="MOONLINE">
<meta property="og:description" content="Five crossings, and the voyage beyond them. The science is the antagonist.">
<meta property="og:url" content="%(s)s/moonline/">
<meta property="og:image" content="%(s)s/moonline/og-moonline.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#020408">
<style>html,body{margin:0;background:#020408}</style>
<link rel="stylesheet" href="/moonline/descent/descent.css">
</head>
<body>
<div id="moonline-descent"></div>
<script src="/moonline/descent/descent.js"></script>
</body>
</html>
""" % {"s": SITE})
print("world vault:", sorted(os.listdir(wv)), "| moonline:", sorted(os.listdir(ml)))
