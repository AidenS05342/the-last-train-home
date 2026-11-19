# The Last Train Home (Revised)

An interactive horror/mystery game made in Twine (Harlowe 3.3.9) for DH200. This is a revised and expanded version of the original game.

**Play it here:** https://aidens05342.github.io/the-last-train-home/

| Path | What it is |
|---|---|
| `The Last Train Home (1).html` | The **original** Twine export. It is unchanged. |
| `docs/index.html` | The **revised** playable game, which GitHub Pages serves. |
| `story.twee` | The complete, readable Twee 3 source of the revised game. |
| `src/` | The source files: passages, stylesheet, script, and image. |
| `build.py` | Builds `docs/index.html` and `story.twee` from `src/`, reusing the original file's Harlowe engine. |
| `tests/` | Automated checks: link checks, scripted playthroughs of every ending, feature tests, and random playthroughs. |
| `CHANGES.md` | What changed from the original version, and why. |

Rebuild: `python3 build.py`
Tests: `python3 tests/static_check.py`, then in `tests/` run `npm install` followed by `node endings.js`, `node features.js` and `node fuzz.js`. The browser tests need Google Chrome.
