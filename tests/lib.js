// Shared helpers for driving the Harlowe game in headless Chrome.
const path = require('path');
const { chromium } = require('playwright-core');

const GAME_URL = process.env.GAME_URL || ('file://' + path.resolve(__dirname, '..', 'docs', 'index.html'));

async function launch() {
  return chromium.launch({ channel: 'chrome' });
}

// Opens a fresh page and records every console error, page error and Harlowe <tw-error>.
async function openGame(browser, { viewport = { width: 1280, height: 900 }, reducedMotion = process.env.MOTION || 'reduce' } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text()) && !/favicon\.ico$/.test((m.location() || {}).url || '')) errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(GAME_URL);
  await page.waitForSelector('tw-passage');
  return { context, page, errors };
}

async function snapshot(page) {
  return page.evaluate(() => {
    const passage = document.querySelector('tw-passage');
    const story = document.querySelector('tw-story');
    const twErrors = [...document.querySelectorAll('tw-error')].map((e) => e.textContent.trim().slice(0, 200));
    const links = [...document.querySelectorAll('tw-passage tw-link')].map((l) => ({
      text: l.textContent.trim(),
      examine: !!l.closest('.examine'),
    }));
    return {
      tags: ((passage && passage.getAttribute('tags')) || (story && story.getAttribute('tags')) || '').split(/\s+/).filter(Boolean),
      text: passage ? passage.innerText : '',
      links,
      twErrors,
      state: window.LTTH ? window.LTTH.readState() : null,
    };
  });
}

// Clicks the first passage link whose text includes `fragment`; waits for Harlowe to finish.
async function choose(page, fragment) {
  const clicked = await page.evaluate((frag) => {
    const link = [...document.querySelectorAll('tw-passage tw-link')].find((l) => l.textContent.includes(frag));
    if (!link) return false;
    link.click();
    return true;
  }, fragment);
  if (!clicked) {
    const s = await snapshot(page);
    throw new Error(`No link containing "${fragment}". Links here: ${s.links.map((l) => l.text).join(' | ')}\n---\n${s.text.slice(0, 400)}`);
  }
  await settle(page);
}

async function clickIndex(page, i) {
  await page.evaluate((idx) => document.querySelectorAll('tw-passage tw-link')[idx].click(), i);
  await settle(page);
}

async function settle(page) {
  await page.waitForTimeout(60);
  await page.waitForSelector('tw-passage');
}

module.exports = { launch, openGame, snapshot, choose, clickIndex, settle, GAME_URL };
