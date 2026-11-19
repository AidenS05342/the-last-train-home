// Random playthroughs. Each run starts a fresh game and picks random choices
// (and randomly examines objects) until an ending. Fails on any Harlowe error,
// console error, dead end (a non-ending passage with nothing to click), or a
// run that never ends. Reports which passages and endings were reached.
// usage: node fuzz.js [runs=300] [seed=1]
const { launch, openGame, snapshot, clickIndex } = require('./lib');

const RUNS = parseInt(process.argv[2] || '300', 10);
let seed = parseInt(process.argv[3] || '1', 10);
function rand() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
const ALL_PASSAGES = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'passages.twee'), 'utf8')
  .split('\n').filter((l) => l.startsWith(':: ')).map((l) => l.slice(3).replace(/\s*[\[{].*$/, '').trim())
  .filter((n) => !['StoryTitle', 'StoryData', 'startup', 'header', 'footer'].includes(n));

(async () => {
  const browser = await launch();
  const { context, page, errors } = await openGame(browser);
  const visited = new Map(), endings = new Map();
  const problems = [];
  let steps = 0;

  for (let run = 1; run <= RUNS; run++) {
    // fresh game each run
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload(); await page.waitForSelector('tw-passage');
    const trail = [];
    let ended = false;
    for (let step = 0; step < 90; step++) {
      const s = await snapshot(page);
      const where = (s.state && s.state.passage) || (s.tags.includes('title') ? 'Title' : '?');
      trail.push(where);
      visited.set(where, (visited.get(where) || 0) + 1);
      if (s.twErrors.length) { problems.push(`run ${run}: Harlowe error in "${where}": ${s.twErrors[0]}`); break; }
      if (errors.length) { problems.push(`run ${run}: console error in "${where}": ${errors.splice(0).join(' / ')}`); break; }
      const endTag = s.tags.find((t) => t.startsWith('end-'));
      if (endTag) { endings.set(endTag, (endings.get(endTag) || 0) + 1); ended = true; break; }

      const visible = await page.evaluate(() => [...document.querySelectorAll('tw-passage tw-link')]
        .map((l, i) => ({ i, text: l.textContent.trim(), examine: !!l.closest('.examine'), shown: l.offsetParent !== null })));
      const options = visible.filter((l) => l.shown);
      if (!options.length) { problems.push(`run ${run}: dead end at "${where}"`); break; }
      if (where === 'Introduction' && rand() < 0.3) await page.fill('.name-field textarea', rand() < 0.5 ? '' : 'Ada Lovelace-Byron');
      const examines = options.filter((o) => o.examine), choices = options.filter((o) => !o.examine);
      const pick = examines.length && (rand() < 0.6 || !choices.length)
        ? examines[Math.floor(rand() * examines.length)]
        : choices[Math.floor(rand() * choices.length)];
      await clickIndex(page, pick.i);
      steps++;
    }
    if (!ended && !problems.some((p) => p.startsWith(`run ${run}:`))) problems.push(`run ${run}: no ending after 90 steps: ${trail.slice(-6).join(' > ')}`);
    if (run % 50 === 0) console.log(`  ${run} runs…`);
  }
  await context.close();
  await browser.close();

  console.log(`\n${RUNS} random playthroughs, ${steps} clicks`);
  console.log('Endings reached:', Object.fromEntries([...endings.entries()].sort()));
  const missed = ALL_PASSAGES.filter((n) => !visited.has(n));
  console.log(`Passages visited: ${ALL_PASSAGES.length - missed.length} of ${ALL_PASSAGES.length}` + (missed.length ? `  (never reached: ${missed.join(', ')})` : ''));
  if (problems.length) { console.log(`\n${problems.length} PROBLEM(S):\n` + problems.slice(0, 20).join('\n')); process.exit(1); }
  console.log('NO ERRORS, DEAD ENDS, OR ENDLESS RUNS');
})().catch((e) => { console.error(e); process.exit(1); });
