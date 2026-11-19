// Scripted playthroughs: one route to each of the five endings (plus the
// sanity-zero variant of Nowhere Station), with assertions along the way.
const { launch, openGame, snapshot, choose } = require('./lib');

const ROUTES = {
  'Together (Ending II)': {
    ending: 'end-together',
    steps: ['Begin', 'name=Aiden', 'Board', 'take a seat', 'Continue', 'Search the carriage', 'Look under the seats',
      'Go toward the crying', 'Examine the photograph', 'Continue', 'Promise to help', 'Enter Carriage Three',
      'Late for what', 'Sit with him and listen', 'Ask Thomas to come', 'Read the place cards', 'Lift the conductor',
      'Step back', 'Go on to the next carriage', 'Enter Carriage Four', 'Follow Mara', 'Tell her what you saw',
      'Keep moving', 'Take Mara', 'Approach the engine door', 'Slide the brass card', 'Look into the firebox',
      'Ask him who he really is', 'Look at your ticket', 'Hand the conductor your ticket'],
    expect: { 'Hand the conductor your ticket': (s) => s.state.clues.length >= 4 },
  },
  'Home (Ending I)': {
    ending: 'end-home',
    steps: ['Begin', 'Board', 'Ask the conductor', 'Continue', 'Search the carriage', 'Look under the seats',
      'Go toward the crying', 'Sit beside her', 'Continue', 'Refuse to help', 'Enter Carriage Three',
      'Read the place cards', 'Step back', 'Talk to the boy', 'Sit with him and listen', 'Leave him',
      'Go on to the next carriage', 'Enter Carriage Four', 'Search the berths', 'Open the suitcase', 'Keep moving',
      'Say nothing', 'Approach the engine door', 'Knock', 'Hand the conductor your ticket'],
  },
  'The New Conductor (Ending III)': {
    ending: 'end-conductor',
    steps: ['Begin', 'Board', 'take a seat', 'Continue', 'Investigate the crying', 'Sit beside her', 'Continue',
      'Let Mara accompany you', 'Enter Carriage Three', 'Sit down at one of the set tables', 'Eat',
      'Go on to the next carriage', 'Enter Carriage Four', 'Keep moving', 'Say nothing', 'Approach the engine door',
      'Force the door', 'Take the ticket punch'],
  },
  'The Long Sleep (Ending IV)': {
    ending: 'end-sleep',
    steps: ['Begin', 'Board', 'Ignore him', 'Continue', 'Investigate the crying', 'Ignore the woman', 'Continue',
      'Refuse to help', 'Enter Carriage Three', 'Late for what', 'Leave him', 'Go on to the next carriage',
      'Enter Carriage Four', 'Lie down'],
  },
  'Nowhere Station (Ending V, answering the voice)': {
    ending: 'end-nowhere',
    steps: ['Begin', 'Board', 'Ask the conductor', 'Continue', 'Investigate the crying', 'Sit beside her', 'Continue',
      'Tell Mara to wait', 'Enter Carriage Three', 'Late for what', 'Leave him', 'Go on to the next carriage',
      'Enter Carriage Four', 'Keep moving', 'Answer the voice'],
  },
  'Nowhere Station (Ending V, sanity reaches zero)': {
    ending: 'end-nowhere',
    steps: ['Begin', 'Board', 'Ignore him', 'Continue', 'Attempt to return', 'Go toward the crying',
      'Examine the photograph', 'Continue', 'Refuse to help', 'Enter Carriage Three', 'Read the place cards',
      'Step back', 'Sit down at one of the set tables', 'Push the plate away', 'Go on to the next carriage',
      'Enter Carriage Four', 'Search the berths', 'Keep moving', 'Lean over the railing', 'Say nothing',
      'Approach the engine door', 'Force the door'],
    expectText: /The fog gets in/,
  },
};

(async () => {
  const browser = await launch();
  let failures = 0;
  for (const [label, route] of Object.entries(ROUTES)) {
    const { context, page, errors } = await openGame(browser);
    let s;
    try {
      for (const step of route.steps) {
        if (step.startsWith('name=')) { await page.fill('.name-field textarea', step.slice(5)); continue; }
        s = await snapshot(page);
        if (route.expect && route.expect[step] && !route.expect[step](s)) throw new Error(`expectation before "${step}" failed: ${JSON.stringify(s.state)}`);
        await choose(page, step);
        s = await snapshot(page);
        if (s.twErrors.length) throw new Error(`Harlowe error after "${step}": ${s.twErrors.join(' / ')}`);
      }
      await page.waitForTimeout(300);
      s = await snapshot(page);
      if (!s.tags.includes(route.ending)) throw new Error(`expected ${route.ending}, got tags [${s.tags}]\n${s.text.slice(0, 300)}`);
      if (route.expectText && !route.expectText.test(s.text)) throw new Error(`ending text did not match ${route.expectText}`);
      const found = await page.evaluate(() => window.LTTH.endings());
      const saveCleared = !(await page.evaluate(() => window.LTTH.hasSave()));
      if (!saveCleared) throw new Error('autosave was not cleared at the ending');
      if (errors.length) throw new Error('console errors: ' + errors.join(' / '));
      console.log(`PASS  ${label}  → endings recorded: [${found}]`);
    } catch (e) {
      failures += 1;
      console.log(`FAIL  ${label}\n      ${e.message.split('\n').join('\n      ')}`);
    }
    await context.close();
  }
  await browser.close();
  console.log(failures ? `${failures} ROUTE(S) FAILED` : 'ALL ENDING ROUTES PASSED');
  process.exit(failures ? 1 : 0);
})();
