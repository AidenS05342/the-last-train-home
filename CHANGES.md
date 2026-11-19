# The Last Train Home: Revision Notes (DH200)

**Original:** `The Last Train Home (1).html` (Twine 2.12.1, Harlowe 3.3.9, 16 passages). It is kept **unchanged**: its SHA-256 fingerprint is checked on every build and test run.
**Revised game:** `docs/index.html`, published at https://aidens05342.github.io/the-last-train-home/
**Readable source:** `story.twee` (Twee 3). It can be imported back into Twine, or compiled with Tweego.

The revision keeps the original concept, characters, text and sepia/brass/typewriter look. It finishes the journey, makes choices matter, and rebuilds the interface around the story.

---

## 1. Summary

| | Original | Revised |
|---|---|---|
| Passages | 16 | 37 (all 16 originals kept, plus 21 new) |
| Story sections | Carriages I–II; III is a stub ("End of the current chapter") | Carriages I–V: Passenger, Dining, Sleeper, the gangway, the Locomotive |
| Endings | 0 | 5 |
| Variables that affect the story | 1 check (`$sanity`), which could never trigger | 20 variables, all of them used |
| Clues the player can see | 0 (`$clues` collected silently) | 10 clues, shown in a Journal |
| Items | `$hasLantern` and `$hasKeycard` declared, never used | Lantern, keycard and pocket watch, each of which opens or protects a path |
| Undo | Harlowe's ↶ undo button | Removed, so choices are final |
| Save | None | Autosave on every passage, Continue on the title screen, Restart in the toolbar |
| Sound | None | Optional ambient sound (off by default) |
| Accessibility | None | Reduce-motion and larger-text options, keyboard play, phone layout |

---

## 2. Narrative changes

### The story's answer, revealed through clues
The train carries people who have not accepted a death, a loss or something left unfinished. "Home" means facing the truth and letting go. The game never states this outright. Players piece it together from the 1891 newspaper, the conductor's notebook, the dated place cards, Thomas's girl in the yellow coat, Mara's umbrella "found at Ashgrove crossing", and the player's own unsent letter.

### Setups from the original that now pay off
| Original detail | Where it pays off |
|---|---|
| Conductor: "If you hear someone calling your name… do not answer." | **The Voice**: a timed scene where answering leads to *Nowhere Station* |
| Armrest: "DON'T FALL ASLEEP." | **Sleeper Car**: lying down leads to *The Long Sleep*, where you turn out to be the one who scratched the words |
| Newspaper dated October 28, 1891 | The headline names the missing conductor and "a boy, nine years old" (Thomas) |
| "SHE NEVER BOARDED." | Mara's daughter never boarded because Mara never reached her. Mara can learn this in Lost Property. |
| "THE HUNGRY ARE NEVER SATISFIED." | **The Feast**: eating restores sanity but erases one of your memories (a journal clue) |
| "That station no longer exists." | The platform sign: **ASHGROVE — CLOSED** |
| "Seat 13" (mentioned in the original, never introduced) | Now introduced when you first meet Mara, and listed in the conductor's notebook |

### Missing scenes now written
- **Search the Carriage:** the conductor's notebook (your name in wet ink) and the lantern.
- **Return to the Platform:** the abandoned Ashgrove platform and the figure under the lamp.

### New sections (Carriages III–V)
- **III Dining:** Thomas and the watch that runs backward, the feast, and the place cards with the keycard. A hub passage lets players explore in any order.
- **IV Sleeper:** what you can see depends on the lantern, sleep is a real danger, and Lost Property is where Mara faces the truth if you tell her.
- **The Voice:** someone calls your name from the fog, on a 20-second timer. Saying nothing is a valid choice.
- **V Locomotive:** the conductor feeds the firebox with tickets, three objects can be examined, and the final choice comes here.

### Five endings
| # | Ending | How to reach it |
|---|---|---|
| I | **Home** | Hand over your ticket (needs at least 4 clues and at least 25 sanity) |
| II | **Together** | As for Home, with Mara still following, trusting you (trust ≥ 3), and told the truth |
| III | **The New Conductor** | Take the ticket punch |
| IV | **The Long Sleep** | Lie down in the sleeper car, give in to sleep at low sanity, or go back to your seat at the end |
| V | **Nowhere Station** | Answer the voice, or let sanity reach 0 |

Text inside the endings changes depending on what happened to Mara (lost to the fog, asleep, left in Seat 13, or still with you) and to Thomas.

### How each variable now shapes the story
- **`$sanity`:** controls visual distortion, changes descriptions (for example in the feast and the sleeper), decides whether you can resist sleep, is required to hand over the ticket, and leads to *Nowhere Station* at 0.
- **`$maraTrust`:** below 0, Mara gives up in the sleeper car. Below 2, she follows the voice unless you hold her hand. At 3 or more, she can reach *Together*.
- **`$maraFollowing` / `$maraWaiting`:** if you told Mara to wait, she catches up with you later, as long as her trust is at least 0.
- **`$clues`:** you need at least 4 to let go. Specific clues unlock lines of dialogue (for example, telling Mara the truth requires the photograph clue or Thomas's story).
- **`$hasLantern`:** without it, the sleeper car is dark, costs more sanity, and hides your suitcase.
- **`$hasKeycard`:** opens the engine door without having to force it.
- **`$hasWatch`:** guarantees you stay awake in the sleeper car.
- **`$trustsConductor`:** if you ignored the conductor at the start, you can't knock to be let in, and his final scene changes tone.
- **`$ateFeast`:** you lose a memory, and the conductor comments on it.

### Edits to original text (kept to a minimum)
- Straight quotes changed to typographic quotes.
- One sentence added in Carriage 2 to introduce Seat 13.
- The PA announcements were placed in styled "speaker" boxes. The wording is unchanged.
- The "End of the current chapter" line in Carriage 3 was replaced with choices.
- New `(set:)` commands were added to existing links (for example, ignoring the conductor now sets `$trustsConductor` to false).

---

## 3. Visual design and atmosphere
- **Original look kept:** the Libre Baskerville and Special Elite fonts, the sepia/brass colors, and the ticket image with the player's name written on it.
- **Fog:** three layers drift slowly behind the story, plus a vignette darkening the screen edges.
- **Flickering lights:** the screen flickers on passages where the text says the lights flicker.
- **Visible sanity:** four levels. As sanity drops, the fog thickens, the edges darken, the text picks up a red-and-blue offset ("chromatic aberration"), and below 25% a red tint appears and the text occasionally twitches.
- **Typewriter announcements:** PA messages type out with a blinking recording light.
- **Brass choice buttons:** choices are shown as buttons, separate from the story text. Objects you can examine have a ⌕ lens icon.

## 4. Interface, navigation and readability
- **Title screen:** includes a content note, how-to-play instructions, Begin/Continue and the endings gallery.
- **HUD:** shows the passenger's name, a sanity meter, carriage progress (I–V) and who is travelling with you. It's hidden on the title and intro screens.
- **Toolbar:** Journal (with a badge for new entries), Sound, Reduce motion, Text size and Restart. Restart asks for confirmation.
- **Name entry:** a large, touch-friendly field under the ticket replaces the tiny field that sat on the image. A blank name becomes "Traveler".
- **Undo removed.** Instead, the game autosaves every passage, refreshing the page keeps your place, Continue appears when a save exists, and finishing an ending clears the save.
- **Phone layout:** works at 390px wide with no horizontal scrolling, and toolbar buttons are icon-only at 44px or larger.
- **Original bug fixed:** a gap of about 540px above the first screen, caused by the `startup` passage's line breaks.

## 5. Interactive elements
- **Examinable objects:** 11 objects, such as the newspaper, armrest, lantern, napkin, suitcase and firebox. They reveal text in place and can add a clue or an item.
- **Journal:** a pop-up listing clues, items and companions. Forgotten memories show as "a page has been torn out".
- **Timed choice:** the voice in the fog.
- **Endings gallery:** remembers which endings you've found in this browser and gives hints for the rest.
- **Optional ambient sound:** generated live in the browser, with no audio files. It includes rumbling, rail-joint clacks, an engine hum, metal creaks and radio static that gets more frequent as sanity drops. It's **off by default** and only starts when you press the Sound button.

## 6. Accessibility
- **Reduce motion:** follows the operating system's setting by default and can be changed in the toolbar. It turns off the fog drift, flicker, jitter and typewriter effect.
- **Text:** a larger-text option. Both settings are remembered.
- **Keyboard:** all choices and toolbar buttons can be reached and used from the keyboard. The journal closes with Escape.
- **Screen readers:** the HUD has text labels, for example "Sanity 72 percent".

---

## 7. Testing
All of these pass on the published version:

| Test | What it checks |
|---|---|
| `tests/static_check.py` | Every link target exists, every passage and ending is reachable, every variable is set up and used, and the original file is unchanged |
| `tests/endings.js` | Scripted playthroughs reaching all 5 endings (6 routes, including sanity reaching 0), with checks along the way |
| `tests/features.js` | 48 checks: save/continue/refresh/restart, journal, examining objects, the feast's memory cost, Mara's trust outcomes, the voice timer, locked choices, settings, the sound toggle, phone width, ending restart |
| `tests/fuzz.js` | 380 random playthroughs (6,500+ clicks, with motion effects on and off): no Harlowe errors, console errors, dead ends or endless runs |

The **Together** ending was never reached in the random runs because it needs a deliberate chain of choices. The scripted test covers it.

## 8. Before and after screenshots
See `docs/screenshots/`:
- **Intro:** `before-intro-*` compared with `after-intro-*`.
- **Carriage 1:** `before-carriage1-*` compared with `after-carriage1-*`.
- **Feature screenshots:** `after-title`, `after-examine`, `after-journal`, `after-lowsanity` and `after-locomotive`.

## 9. How the project is built
I edit the source files in `src/`: the passages, stylesheet and script. Running `python3 build.py` produces the playable `docs/index.html` and the complete `story.twee`. The Harlowe 3.3.9 engine is copied byte-for-byte from the original export, so the revision runs on the same story format as the original.
