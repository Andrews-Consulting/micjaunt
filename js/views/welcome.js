// The welcome screen (R81): what the app is for and the first steps, shown
// the first time the app opens, before there is anything to see. It sits on
// top of the Songs scope, where the steps lead first (adding songs), so Get
// started and the back gesture both land there. It shows at every launch
// until Get started is tapped, or until there are songs, so a singer who
// already has songs never sees it. The dock hides while it is up
// (body[data-screen="welcome"], cleared by the screen stack on the next
// render). The words are Help's (R76), so the two never drift apart, and a
// crawler that runs scripts reads them too (R80).
import { el, viewEl, closeScreen } from '../ui.js';
import { db } from '../db.js';
import { runningInstalled } from '../reminder.js';
import { CONCEPTS, FIRST_STEPS, WHAT_FOR } from './help.js';

// Before Help's first steps, in a browser tab: install first, since Safari
// on an iPhone deletes a website's data, and songs and a catalog loaded
// there never follow the app to the Home Screen (R65).
const INSTALL_STEP = ['Home Screen', 'put the app there before anything else, on an iPhone especially. '
  + 'Safari deletes a website\'s data after seven days away, and the KaraFun catalog and your songs would go with it; '
  + 'installed, they are kept for good.'];

const titleEl = document.getElementById('view-title');

// When Get started was tapped, in localStorage like the banners' snoozes:
// it is about this device, not worth backing up.
export const WELCOME_SEEN_KEY = 'welcomeSeenAt';

function readItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the screen comes back next time, until there are songs.
  }
}

export function markWelcomeSeen(now = new Date()) {
  writeItem(WELCOME_SEEN_KEY, now.toISOString());
}

// True at a first launch: Get started never tapped and no songs yet. The
// storage check is first so a returning singer costs no database read.
export async function welcomeDue() {
  if (readItem(WELCOME_SEEN_KEY)) return false;
  try {
    return (await db.count('songs')) === 0;
  } catch (err) {
    console.debug('Welcome skipped:', err);
    return false;
  }
}

function line(entry) {
  return Array.isArray(entry)
    ? el('li', {}, el('strong', { text: entry[0] }), `: ${entry[1]}`)
    : el('li', { text: entry });
}

function section(id, heading, ...content) {
  return el('section', { class: 'card stack help-card', 'aria-labelledby': id },
    el('h3', { id, text: heading }), ...content);
}

// `onInstallHelp()` opens Help at its Install card (R65), on top of this
// screen, so Back returns here. In an installed copy the install step and
// its button are left out.
export function renderWelcome({ onInstallHelp } = {}) {
  titleEl.textContent = 'Welcome';
  document.body.dataset.screen = 'welcome';

  const installing = !runningInstalled() && !!onInstallHelp;
  const steps = installing ? [INSTALL_STEP, ...FIRST_STEPS] : FIRST_STEPS;
  const done = () => {
    markWelcomeSeen();
    closeScreen();
  };

  viewEl.replaceChildren(el('div', { class: 'stack help-view welcome-view' },
    el('h2', { text: 'Welcome to Mic Jaunt' }),
    el('p', { class: 'welcome-lead', text: `${WHAT_FOR} Everything stays on your phone.` }),
    section('welcome-concepts', 'How it fits together', el('ul', {}, ...CONCEPTS.map(line))),
    section('welcome-first', 'First steps',
      el('ol', {}, ...steps.map(line)),
      installing ? el('button', {
        type: 'button', class: 'btn', text: 'Show me how to install',
        onclick: () => {
          markWelcomeSeen();
          onInstallHelp();
        },
      }) : null),
    el('button', { type: 'button', class: 'btn primary welcome-start', text: 'Get started', onclick: done }),
    el('p', { class: 'muted welcome-guide' },
      'Help, at the top of Settings, has all of this again. ',
      el('a', { href: 'help/', target: '_blank', rel: 'noopener', onclick: () => markWelcomeSeen() },
        'Full guide', el('span', { 'aria-hidden': 'true', text: ' ↗' })),
      ' opens in the browser.')));
  viewEl.scrollTop = 0;
}
