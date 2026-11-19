// Captures matching screenshots of the ORIGINAL (read-only) and the REVISED game.
const path = require('path');
const { launch, openGame, choose } = require('./lib');
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');
const ORIGINAL = 'file://' + path.resolve(__dirname, '..', 'The Last Train Home (1).html');
(async () => {
  const b = await launch();
  for (const [vw, vh, tag] of [[1280, 900, 'desktop'], [390, 844, 'mobile']]) {
    // original
    const ctx = await b.newContext({ viewport: { width: vw, height: vh }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.goto(ORIGINAL); await p.waitForSelector('tw-passage'); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/before-intro-${tag}.png` });
    await p.evaluate(() => [...document.querySelectorAll('tw-link')].find(l => /Board/.test(l.textContent)).click());
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/before-carriage1-${tag}.png` });
    await ctx.close();
    // revised
    const { context, page } = await openGame(b, { viewport: { width: vw, height: vh } });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/after-title-${tag}.png` });
    await choose(page, 'Begin'); await page.fill('.name-field textarea', 'Aiden'); await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/after-intro-${tag}.png` });
    await choose(page, 'Board'); await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/after-carriage1-${tag}.png` });
    await context.close();
  }
  // a few feature shots (desktop)
  const shots = [
    ['after-examine', ['Begin', 'Board', 'Ignore him', 'Read the headline']],
    ['after-journal', ['Begin', 'Board', 'take a seat', 'Continue', 'Search the carriage', 'Look under the seats', 'Go toward', 'Examine the photograph', 'Continue', 'Promise', 'Enter Carriage Three', 'Late for', 'Sit with him', 'JOURNAL']],
    ['after-lowsanity', ['Begin', 'Board', 'Ignore him', 'Continue', 'Attempt to return', 'Go toward', 'Examine the photograph', 'Continue', 'Refuse', 'Enter Carriage Three', 'Read the place cards', 'Step back', 'Sit down at one', 'Push the plate', 'Go on', 'Enter Carriage Four', 'Search the berths', 'Keep moving', 'Lean over the railing']],
    ['after-locomotive', ['Begin', 'Board', 'Ask the conductor', 'Continue', 'Search the carriage', 'Look under the seats', 'Go toward', 'Sit beside her', 'Continue', 'Refuse', 'Enter Carriage Three', 'Read the place cards', 'Step back', 'Talk to the boy', 'Sit with him', 'Leave him', 'Go on', 'Enter Carriage Four', 'Search the berths', 'Keep moving', 'Say nothing', 'Approach', 'Knock', 'Look into the firebox']],
  ];
  for (const [name, steps] of shots) {
    const { context, page } = await openGame(b, { viewport: { width: 1280, height: 900 } });
    for (const st of steps) {
      if (st === 'JOURNAL') { await page.click('[data-act="journal"]'); continue; }
      await choose(page, st);
    }
    await page.waitForTimeout(3000);
    if (name === 'after-examine' || name === 'after-locomotive') await page.evaluate(() => document.querySelector('.examined').scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: `${OUT}/${name}.png` });
    await context.close();
  }
  await b.close();
  console.log('screenshots written to docs/screenshots');
})().catch(e => { console.error(e); process.exit(1); });
