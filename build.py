#!/usr/bin/env python3
"""Build "The Last Train Home (Revised)".

Inputs (hand-edited):
  src/passages.twee   story passages (Twee 3)
  src/style.css       story stylesheet
  src/script.js       story JavaScript
  src/assets/         images

Outputs (generated, do not edit by hand):
  story.twee          complete, readable Twee 3 source (passages + stylesheet + script)
  docs/index.html     playable game, served by GitHub Pages from /docs

The Harlowe 3.3.9 story-format engine is copied from the original Twine export,
"The Last Train Home (1).html", which is only ever READ, never written.
"""
import base64
import hashlib
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ORIGINAL = ROOT / "The Last Train Home (1).html"
ORIGINAL_SHA256 = "5e2b46a2036ce1131909557141ac151b39e2e30d611cf9d987d1fa21a358c9dc"
SRC = ROOT / "src"
OUT_HTML = ROOT / "docs" / "index.html"
OUT_TWEE = ROOT / "story.twee"

HEADER_RE = re.compile(r"^:: *(?P<name>[^\[{\n]+?)\s*(?:\[(?P<tags>[^\]]*)\])?\s*(?:(?P<meta>\{.*\}))?\s*$")


def parse_twee(text):
    passages, cur = [], None
    for line in text.splitlines():
        m = HEADER_RE.match(line) if line.startswith("::") else None
        if m:
            cur = {
                "name": m.group("name").strip(),
                "tags": (m.group("tags") or "").split(),
                "meta": json.loads(m.group("meta")) if m.group("meta") else {},
                "lines": [],
            }
            passages.append(cur)
        elif cur is not None:
            cur["lines"].append(line)
    for p in passages:
        p["text"] = "\n".join(p.pop("lines")).strip("\n")
    return passages


def original_positions(orig):
    pos = {}
    for m in re.finditer(r'<tw-passagedata[^>]*name="([^"]*)"[^>]*position="([^"]*)"', orig):
        pos[html.unescape(m.group(1))] = m.group(2)
    return pos


def main():
    orig_bytes = ORIGINAL.read_bytes()
    digest = hashlib.sha256(orig_bytes).hexdigest()
    if digest != ORIGINAL_SHA256:
        sys.exit(f"Original file has changed (sha256 {digest}); refusing to build.")
    orig = orig_bytes.decode("utf-8")

    passages = parse_twee((SRC / "passages.twee").read_text(encoding="utf-8"))
    css = (SRC / "style.css").read_text(encoding="utf-8")
    js = (SRC / "script.js").read_text(encoding="utf-8")

    special = {p["name"]: p for p in passages if p["name"] in ("StoryTitle", "StoryData")}
    story = [p for p in passages if p["name"] not in special]
    title = special["StoryTitle"]["text"].strip()
    data = json.loads(special["StoryData"]["text"])

    names = [p["name"] for p in story]
    dupes = {n for n in names if names.count(n) > 1}
    if dupes:
        sys.exit(f"Duplicate passage names: {dupes}")
    if data["start"] not in names:
        sys.exit("Start passage missing")

    # ---- Twine map positions: originals keep theirs, new passages go in a grid below ----
    old_pos = original_positions(orig)
    grid_i = 0
    for p in story:
        if p["name"] in old_pos:
            p["position"] = old_pos[p["name"]]
        else:
            col, row = grid_i % 8, grid_i // 8
            p["position"] = f"{200 + col * 175},{1700 + row * 175}"
            grid_i += 1

    # ---- 1. complete Twee source ----
    tw = [f":: StoryTitle\n{title}\n", ":: StoryData\n" + json.dumps(data, indent=2) + "\n"]
    tw.append(":: StoryStylesheet [stylesheet]\n" + css.strip() + "\n")
    tw.append(":: StoryScript [script]\n" + js.strip() + "\n")
    for p in story:
        tags = f" [{' '.join(p['tags'])}]" if p["tags"] else ""
        meta = json.dumps({"position": p["position"], "size": "100,100"})
        tw.append(f":: {p['name']}{tags} {meta}\n{p['text']}\n")
    OUT_TWEE.write_text("\n\n".join(tw), encoding="utf-8")

    # ---- 2. playable HTML ----
    def data_uri(match):
        path = SRC / match.group(1)
        mime = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}[path.suffix]
        return f'url("data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}")'

    css_inline = re.sub(r'url\("(assets/[^"]+)"\)', data_uri, css)

    pid = {p["name"]: i + 1 for i, p in enumerate(story)}
    tag_colors = {"header": "blue", "startup": "yellow", "intro-bg": "green", "title": "purple", "ending": "red", "flicker": "orange"}
    used_tags = sorted({t for p in story for t in p["tags"]})
    parts = [
        f'<tw-storydata name="{html.escape(title)}" startnode="{pid[data["start"]]}" creator="Twine" '
        f'creator-version="2.12.1" format="{data["format"]}" format-version="{data["format-version"]}" '
        f'ifid="{data["ifid"]}" options="" tags="" zoom="{data.get("zoom", 1)}" hidden>',
        f'<style role="stylesheet" id="twine-user-stylesheet" type="text/twine-css">{css_inline}</style>',
        f'<script role="script" id="twine-user-script" type="text/twine-javascript">{js}</script>',
    ]
    for t in used_tags:
        if t in tag_colors:
            parts.append(f'<tw-tag name="{t}" color="{tag_colors[t]}"></tw-tag>')
    for p in story:
        parts.append(
            f'<tw-passagedata pid="{pid[p["name"]]}" name="{html.escape(p["name"])}" '
            f'tags="{html.escape(" ".join(p["tags"]))}" position="{p["position"]}" size="100,100">'
            f'{html.escape(p["text"])}</tw-passagedata>'
        )
    parts.append("</tw-storydata>")

    start = orig.index("<tw-storydata")
    end = orig.index("</tw-storydata>") + len("</tw-storydata>")
    out = orig[:start] + "".join(parts) + orig[end:]
    out = out.replace("<title>The Last Train Home</title>", "<title>The Last Train Home</title>\n"
                      '<meta name="description" content="An interactive horror mystery aboard the Midnight Express. A revised Twine (Harlowe 3.3.9) game for DH200.">', 1)
    OUT_HTML.parent.mkdir(exist_ok=True)
    OUT_HTML.write_text(out, encoding="utf-8")
    (OUT_HTML.parent / ".nojekyll").write_text("")

    print(f"Built {OUT_HTML.relative_to(ROOT)} ({len(out) // 1024} KB) and {OUT_TWEE.name}: {len(story)} passages")


if __name__ == "__main__":
    main()
