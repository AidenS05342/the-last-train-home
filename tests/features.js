// Feature tests: save / continue / refresh / restart, timed voice, the feast's
// memory cost, Mara's trust consequences, journal, settings, undo removal.
const { launch, openGame, snapshot, choose, settle, GAME_URL } = require('./lib');

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? '\n      ' + detail : ''}`);
}
async function play(page, steps) { for (const s of steps) await choose(page, s); return snapshot(page); }

(async () => {
  const browser = await launch();

  // ---- 1. Undo removed, autosave, Continue from title, refresh resume, Restart ----
  {
    const { context, page, errors } = await openGame(browser);
    const sidebarVisible = await page.evaluate(() => { const sb = document.querySelector('tw-sidebar'); return !!sb && getComputedStyle(sb).display !== 'none'; });
    check('Undo/redo sidebar is hidden', !sidebarVisible);
    check('No Continue button on first visit', !(await page.isVisible('.continue-wrap tw-link')));

    let s = await play(page, ['Begin', 'Board', 'Ask the conductor', 'Continue', 'Investigate the crying']);
    check('Reached Carriage 2', s.state.passage === 'Carriage 2', s.state.passage);
    const sanityBefore = s.state.sanity;

    // refresh: Harlowe resumes the session
    await page.reload(); await page.waitForSelector('tw-passage'); await page.waitForTimeout(300);
    s = await snapshot(page);
    check('Page refresh resumes the same passage', s.state && s.state.passage === 'Carriage 2', JSON.stringify(s.state));

    // new tab (fresh session, same browser storage) -> title shows Continue
    const page2 = await context.newPage();
    await page2.goto(GAME_URL); await page2.waitForSelector('tw-passage'); await page2.waitForTimeout(300);
    check('Title shows Continue when an autosave exists', await page2.isVisible('.continue-wrap tw-link'));
    await choose(page2, 'Continue your journey'); await page2.waitForTimeout(300);
    s = await snapshot(page2);
    check('Continue restores passage and variables', s.state.passage === 'Carriage 2' && s.state.sanity === sanityBefore && s.state.clues.includes('warning'), JSON.stringify(s.state));

    // Restart button -> confirm -> back to title with no save
    await page2.click('.ltth-toolbar [data-act="restart"]');
    check('Restart asks for confirmation', await page2.isVisible('.ltth-dialog [data-c="yes"]'));
    await Promise.all([page2.waitForEvent('load'), page2.click('.ltth-dialog [data-c="yes"]')]);
    await page2.waitForSelector('tw-passage'); await page2.waitForTimeout(300);
    s = await snapshot(page2);
    check('Restart returns to the title screen', s.tags.includes('title'), s.tags.join(','));
    check('Restart clears the autosave', !(await page2.isVisible('.continue-wrap tw-link')));
    check('No errors in save/restart flow', errors.length === 0, errors.join(' / '));
    await context.close();
  }

  // ---- 2. Journal, examine objects, HUD ----
  {
    const { context, page } = await openGame(browser);
    await play(page, ['Begin', 'Board', 'Ignore him']);
    let s = await snapshot(page);
    check('Newspaper clue is NOT recorded until examined', !s.state.clues.includes('newspaper'));
    await choose(page, 'Read the headline'); await page.waitForTimeout(200);
    s = await snapshot(page);
    check('Examining the newspaper records a clue mid-passage', s.state.clues.includes('newspaper'), JSON.stringify(s.state.clues));
    check('Examined text appears', /MIDNIGHT EXPRESS LOST IN FOG/.test(s.text));
    check('Journal badge counts the new entry', (await page.textContent('.ltth-toolbar .badge')) === '1');
    await page.click('.ltth-toolbar [data-act="journal"]');
    const jtext = await page.textContent('.ltth-dialog .body');
    check('Journal lists the newspaper clue', /October 28, 1891/.test(jtext));
    check('Journal lists the ticket with player name', /Passenger: Traveler/.test(jtext));
    await page.keyboard.press('Escape');
    check('Journal closes with Escape', !(await page.isVisible('.ltth-dialog[open]')));
    const hud = await page.textContent('.hud');
    check('HUD shows sanity and carriage', /Sanity/.test(hud) && /95%/.test(hud) && /Carriage/.test(hud), hud);
    check('HUD marks carriage I as current', (await page.textContent('.hud-cars li.current')) === 'I');
    check('Ignoring the conductor reduces sanity by 5', s.state.sanity === 95, s.state.sanity);
    await context.close();
  }

  // ---- 3. Blank name falls back to Traveler ----
  {
    const { context, page } = await openGame(browser);
    await choose(page, 'Begin');
    await page.fill('.name-field textarea', '   ');
    check('Ticket shows Traveler while field is blank', (await page.textContent('.ticket-ink')) === 'Traveler');
    const s = await play(page, ['Board']);
    check('Blank name becomes "Traveler" in the story', /Ah, Traveler\./.test(s.text), s.text.slice(0, 300));
    await context.close();
  }

  // ---- 4. Feast costs a memory; Dining Car reacts to where you came from ----
  {
    const { context, page } = await openGame(browser);
    let s = await play(page, ['Begin', 'Board', 'Ask the conductor', 'Continue', 'Investigate the crying',
      'Sit beside her', 'Continue', 'Let Mara accompany', 'Enter Carriage Three', 'Sit down at one of the set tables']);
    const before = s.state;
    check('Mara warns you at the feast when she is with you', /Don’t,” she says quietly/.test(s.text));
    s = await play(page, ['Eat']);
    check('Eating restores sanity', s.state.sanity > before.sanity, `${before.sanity} -> ${s.state.sanity}`);
    check('Eating erases the oldest clue', before.clues.length === 1 && s.state.clues.length === 0 && s.state.forgotten === 'warning', JSON.stringify(s.state));
    check('Dining Car describes the forgotten memory', /pale square on wallpaper/.test(s.text));
    check('Feast option is removed after use', !s.links.some((l) => /set tables/.test(l.text)));
    await page.click('.ltth-toolbar [data-act="journal"]');
    await page.keyboard.press('Escape');
    s = await play(page, ['Talk to the boy', 'Sit with him and listen']);
    check('Thomas gives you the pocket watch', s.state.watch === true, JSON.stringify(s.state));
    await page.click('.ltth-toolbar [data-act="journal"]');
    check('Journal lists the pocket watch as an item', /pocket watch/.test(await page.textContent('.ltth-dialog .body')));
    check('Journal shows a torn-out page', /A page has been torn out/.test(await page.textContent('.ltth-dialog .body')));
    await context.close();
  }

  // ---- 5. Mara told to wait rejoins if trust >= 0; low trust loses her at the Voice ----
  {
    const { context, page } = await openGame(browser);
    let s = await play(page, ['Begin', 'Board', 'take a seat', 'Continue', 'Investigate the crying', 'Sit beside her',
      'Continue', 'Tell Mara to wait', 'Enter Carriage Three', 'Late for what', 'Leave him', 'Go on to the next carriage']);
    check('Mara catches up after being told to wait', s.state.maraF && /I couldn’t sit there alone/.test(s.text), JSON.stringify(s.state));
    check('Passenger count increases when Mara rejoins', s.state.passengers === 1);
    check('HUD lists Mara as a passenger', /Mara/.test(await page.textContent('.hud')));
    await page.click('.ltth-toolbar [data-act="journal"]');
    check('Journal lists Mara as travelling with you', /Mara/.test(await page.textContent('.ltth-dialog .body')));
    await page.keyboard.press('Escape');
    await context.close();
  }
  {
    const { context, page } = await openGame(browser);
    let s = await play(page, ['Begin', 'Board', 'take a seat', 'Continue', 'Investigate the crying', 'Examine the photograph',
      'Continue', 'Let Mara accompany', 'Enter Carriage Three', 'Late for what', 'Leave him', 'Go on to the next carriage',
      'Enter Carriage Four', 'Keep moving']);
    check('Voice passage offers to hold Mara', s.links.some((l) => /Take Mara/.test(l.text)));
    s = await play(page, ['Say nothing']);
    check('Mara (trust < 2, not held) is lost to the fog', !s.state.maraF && /Mara is gone/.test(s.text), JSON.stringify(s.state));
    await context.close();
  }
  {
    const { context, page } = await openGame(browser);
    let s = await play(page, ['Begin', 'Board', 'take a seat', 'Continue', 'Investigate the crying', 'Ask why she believes',
      'Continue', 'Let Mara accompany', 'Enter Carriage Three', 'Late for what', 'Leave him', 'Go on to the next carriage',
      'Enter Carriage Four']);
    check('Distrustful Mara lies down in the sleeper car', !s.state.maraF && /I’ll just rest here/.test(s.text), JSON.stringify(s.state));
    await context.close();
  }

  // ---- 6. The Voice times out into silence (not answering is a choice) ----
  {
    const { context, page } = await openGame(browser);
    await play(page, ['Begin', 'Board', 'take a seat', 'Continue', 'Investigate the crying', 'Ignore the woman',
      'Continue', 'Refuse', 'Enter Carriage Three', 'Late for what', 'Leave him', 'Go on to the next carriage',
      'Enter Carriage Four', 'Keep moving']);
    await page.waitForTimeout(21500); await settle(page);
    const s = await snapshot(page);
    check('After 20 seconds of silence the story moves on without answering', s.state.passage === 'The Silence', s.state.passage);
    await context.close();
  }

  // ---- 7. Locked final choice without enough understanding ----
  {
    const { context, page } = await openGame(browser);
    const s = await play(page, ['Begin', 'Board', 'take a seat', 'Continue', 'Investigate the crying', 'Ignore the woman',
      'Continue', 'Refuse', 'Enter Carriage Three', 'Late for what', 'Leave him', 'Go on to the next carriage',
      'Enter Carriage Four', 'Keep moving', 'Say nothing', 'Approach the engine door', 'Knock']);
    check('Cannot hand over ticket with fewer than 4 clues', !s.links.some((l) => /Hand the conductor/.test(l.text)) && /do not yet understand/.test(s.text), s.state.clues.join(','));
    await context.close();
  }

  // ---- 8. Settings: reduce motion / large text persist ----
  {
    const { context, page } = await openGame(browser, { reducedMotion: 'no-preference' });
    await page.click('.ltth-toolbar [data-act="motion"]');
    await page.click('.ltth-toolbar [data-act="text"]');
    await page.reload(); await page.waitForSelector('tw-passage');
    const cls = await page.evaluate(() => document.body.className);
    check('Reduce motion and large text persist across reloads', /reduce-motion/.test(cls) && /large-text/.test(cls), cls);
    await page.click('.ltth-toolbar [data-act="sound"]');
    check('Sound toggle turns on and reports state', (await page.getAttribute('.ltth-toolbar [data-act="sound"]', 'aria-pressed')) === 'true');
    await page.click('.ltth-toolbar [data-act="sound"]');
    check('Sound toggle turns off again', (await page.getAttribute('.ltth-toolbar [data-act="sound"]', 'aria-pressed')) === 'false');
    await context.close();
  }

  // ---- 9. Ending -> "Return to the station" restarts cleanly; endings gallery persists ----
  {
    const { context, page, errors } = await openGame(browser, { viewport: { width: 390, height: 844 } });
    const overflow = [];
    const steps = ['Begin', 'Board', 'Ignore him', 'Read the headline', 'Continue', 'Investigate', 'Ignore the woman', 'Continue', 'Refuse',
      'Enter Carriage Three', 'Late for', 'Leave him', 'Go on', 'Enter Carriage Four', 'Lie down'];
    for (const st of steps) {
      await choose(page, st);
      const w = await page.evaluate(() => document.documentElement.scrollWidth);
      if (w > 390) overflow.push(`${st}: ${w}px`);
    }
    check('No horizontal scrolling at 390px phone width', overflow.length === 0, overflow.join(', '));
    check('Ending shows the gallery with this ending unlocked', /The Long Sleep/.test(await page.textContent('.gallery')) && /1 of 5/.test(await page.textContent('.gallery h2')));
    await Promise.all([page.waitForEvent('load'), choose(page, 'Return to the station')]);
    await page.waitForSelector('tw-passage'); await page.waitForTimeout(300);
    const s = await snapshot(page);
    check('"Return to the station" goes back to a fresh title screen', s.tags.includes('title') && !(await page.isVisible('.continue-wrap tw-link')));
    check('Endings gallery remembers discovered endings', /1 of 5/.test(await page.textContent('.gallery h2')));
    const s2 = await play(page, ['Begin', 'Board']);
    check('A new game after an ending starts with fresh variables', s2.state.sanity === 100 && s2.state.clues.length === 0, JSON.stringify(s2.state));
    check('No errors across ending and restart', errors.length === 0, errors.join(' / '));
    await context.close();
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `${failed} FEATURE CHECK(S) FAILED` : `ALL ${results.length} FEATURE CHECKS PASSED`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
