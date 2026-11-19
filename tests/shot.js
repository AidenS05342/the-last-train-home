// usage: node shot.js name width height [choices...]
const { launch, openGame, choose } = require('./lib');
(async () => {
  const [name, w, h, ...steps] = process.argv.slice(2);
  const b = await launch();
  const { page, errors } = await openGame(b, { viewport: { width: +w, height: +h }, reducedMotion: 'reduce' });
  for (const s of steps) {
    if (s.startsWith('name=')) await page.fill('.name-field textarea', s.slice(5));
    else if (s.startsWith('eval=')) await page.evaluate(s.slice(5));
    else await choose(page, s);
  }
  await page.waitForTimeout(1500);
  console.log(await page.evaluate(() => [...document.querySelectorAll('tw-story, tw-passage, .title-screen, tw-include')].map(e => e.tagName + ' ' + (e.getAttribute('type')||e.className) + ' y=' + Math.round(e.getBoundingClientRect().top) + ' h=' + Math.round(e.getBoundingClientRect().height)).join('\n')));
  await page.screenshot({ path: __dirname + '/screenshots/' + name + '.png', fullPage: process.env.FULL === '1' });
  console.log('errors', errors);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
