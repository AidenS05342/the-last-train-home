const { launch, openGame, snapshot } = require('./lib');
(async () => {
  const b = await launch(); const { page } = await openGame(b);
  const info = await page.evaluate(() => [...document.querySelectorAll('tw-link')].map(l => l.textContent.trim() + ' tabindex=' + l.getAttribute('tabindex')));
  console.log(info);
  // Tab through toolbar into the story and press Enter on "Begin"
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const t = await page.evaluate(() => document.activeElement.textContent.trim());
    if (/Begin the journey/.test(t)) { await page.keyboard.press('Enter'); break; }
  }
  await page.waitForTimeout(400);
  const s = await snapshot(page); console.log('after Enter:', s.tags);
  await b.close();
})();
