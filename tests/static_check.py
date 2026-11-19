#!/usr/bin/env python3
"""Static checks on the story source.

- every link / (go-to:) target exists
- every passage is reachable from the start passage
- every ending is reachable
- every $variable that is read is initialised in `startup`
- the original HTML file is byte-for-byte unchanged
"""
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from build import ORIGINAL, ORIGINAL_SHA256, SRC, parse_twee  # noqa: E402

ok = True


def fail(msg):
    global ok
    ok = False
    print("FAIL:", msg)


passages = {p["name"]: p for p in parse_twee((SRC / "passages.twee").read_text(encoding="utf-8"))
            if p["name"] not in ("StoryTitle", "StoryData")}

LINK_RE = re.compile(r"\[\[(?:[^\]]*?->)?([^\]]+?)\]\]")
GOTO_RE = re.compile(r'\(go-to:\s*"([^"]+)"\)')
edges = {}
for name, p in passages.items():
    targets = set(LINK_RE.findall(p["text"])) | set(GOTO_RE.findall(p["text"]))
    edges[name] = targets
    for t in targets:
        if t not in passages:
            fail(f'"{name}" links to missing passage "{t}"')

# header can redirect anywhere it names
special = {n for n, p in passages.items() if {"header", "footer", "startup"} & set(p["tags"])}
seen, stack = set(), ["Title"] + [t for n in special for t in edges[n]]
while stack:
    n = stack.pop()
    if n in seen:
        continue
    seen.add(n)
    stack.extend(edges.get(n, ()))
for n in passages:
    if n not in seen and n not in special:
        fail(f'passage "{n}" is unreachable')

endings = [n for n, p in passages.items() if "ending" in p["tags"]]
for e in endings:
    if e not in seen:
        fail(f'ending "{e}" is unreachable')
if len(endings) != 5:
    fail(f"expected 5 endings, found {len(endings)}")

all_text = "\n".join(p["text"] for p in passages.values())
startup = "\n".join(p["text"] for p in passages.values() if "startup" in p["tags"])
initialised = set(re.findall(r"\(set:\s*\$(\w+)", startup))
used = set(re.findall(r"\$(\w+)", all_text))
for v in sorted(used - initialised):
    fail(f"${v} is used but never initialised in startup")
for v in sorted(initialised):
    reads = len(re.findall(r"\$" + v + r"\b(?!\s+to\b)", all_text))  # occurrences that are not assignments
    if reads <= 0:
        fail(f"${v} is initialised but never used")

if hashlib.sha256(ORIGINAL.read_bytes()).hexdigest() != ORIGINAL_SHA256:
    fail("original HTML file has been modified")

print(f"{len(passages)} passages, {sum(len(e) for e in edges.values())} links, {len(endings)} endings, "
      f"{len(initialised)} variables")
print("STATIC CHECKS PASSED" if ok else "STATIC CHECKS FAILED")
sys.exit(0 if ok else 1)
