// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. The game moves between
// title, crew select (jobs + shop), play, paused, caught, job-done and win.
//
// ?seed=N fixes the random pattern. ?shot=play|vault|select|getaway (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { BEST_KEY, COINS_KEY, JOBS, STEP, UPGRADES } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_CRACK, EVENT_JOBDONE, EVENT_PICKUP, EVENT_SPOTTED } from './world.js';
import {
  ACTION_COIN, ACTION_CONFIRM, ACTION_HACK, ACTION_MUTE, ACTION_PAUSE, ACTION_USE, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, SCREEN_CAUGHT, SCREEN_JOBDONE, SCREEN_PAUSED, SCREEN_PLAY,
  SCREEN_SELECT, SCREEN_TITLE, SCREEN_WIN,
} from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readNumber(keyName) {
  try {
    return Number.parseInt(window.localStorage.getItem(keyName) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveNumber(keyName, value) {
  try {
    window.localStorage.setItem(keyName, String(value));
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}

function readJson(keyName, fallback) {
  try {
    const raw = window.localStorage.getItem(keyName);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(keyName, value) {
  try {
    window.localStorage.setItem(keyName, JSON.stringify(value));
  } catch {
    // See saveNumber.
  }
}

// Meta progress that lives outside any one job: best score, crew coins, owned
// upgrades, cleared jobs, the highest unlocked job and the running total.
const meta = {
  best: readNumber(BEST_KEY),
  coins: readNumber(COINS_KEY),
  upgrades: readJson('velvet-heist-upgrades', {}),
  completed: readJson('velvet-heist-completed', []),
  unlocked: readNumber('velvet-heist-unlocked'),
  ghostRun: false,
  totalScore: 0,
  muted: false,
  selectedJob: 0,
};

function saveMeta() {
  saveNumber(BEST_KEY, meta.best);
  saveNumber(COINS_KEY, meta.coins);
  saveJson('velvet-heist-upgrades', meta.upgrades);
  saveJson('velvet-heist-completed', meta.completed);
  saveNumber('velvet-heist-unlocked', meta.unlocked);
}

function runShot(name) {
  const scene = stageShot(name, world);
  const shotMeta = {
    ...meta,
    coins: 85,
    upgrades: { lockpick: true, soles: true },
    completed: [0],
    unlocked: 1,
    ghostRun: false,
  };
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, shotMeta);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startJob(index) {
    meta.selectedJob = index;
    world.loadJob(index, meta.upgrades, meta.ghostRun);
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.startPad();
    announce(`Job ${index + 1}: ${JOBS[index].name}. Reach the green exit.`);
  }

  function toSelect() {
    screen = SCREEN_SELECT;
    audio.stopPad();
    announce('Crew menu. Pick a job or buy an upgrade.');
  }

  function endJob() {
    const result = world.state.result;
    meta.totalScore += result.score;
    meta.coins += result.coinsEarned;
    if (!meta.completed.includes(result.jobIndex)) meta.completed.push(result.jobIndex);
    meta.unlocked = Math.max(meta.unlocked, Math.min(JOBS.length - 1, result.jobIndex + 1));
    if (meta.totalScore > meta.best) meta.best = meta.totalScore;
    saveMeta();
    audio.win();
    audio.stopPad();
    screen = meta.completed.length >= JOBS.length ? SCREEN_WIN : SCREEN_JOBDONE;
    announce(`Job done. Score ${result.score}. ${result.rating}.`);
  }

  function endCaught() {
    audio.caught();
    audio.stopPad();
    screen = SCREEN_CAUGHT;
    announce('Caught. The job is blown.');
  }

  function clickButton(id) {
    if (screen === SCREEN_TITLE && id === 'start') {
      toSelect();
      return;
    }
    if (screen === SCREEN_SELECT) {
      if (id === 'start') {
        startJob(meta.selectedJob);
        return;
      }
      if (id === 'ghost') {
        meta.ghostRun = !meta.ghostRun;
        return;
      }
      if (id.startsWith('job-')) {
        const index = Number.parseInt(id.slice(4), 10);
        if (index <= meta.unlocked) meta.selectedJob = index;
        return;
      }
      if (id.startsWith('buy-')) {
        const upgrade = UPGRADES.find((up) => up.id === id.slice(4));
        if (upgrade && !meta.upgrades[upgrade.id] && meta.coins >= upgrade.cost) {
          meta.coins -= upgrade.cost;
          meta.upgrades[upgrade.id] = true;
          saveMeta();
        }
        return;
      }
      return;
    }
    if (screen === SCREEN_PAUSED && id === 'resume') {
      screen = SCREEN_PLAY;
      return;
    }
    if (screen === SCREEN_CAUGHT && id === 'retry') {
      startJob(meta.selectedJob);
      return;
    }
    if (screen === SCREEN_CAUGHT && id === 'menu') {
      toSelect();
      return;
    }
    if (screen === SCREEN_JOBDONE && id === 'next') {
      startJob(Math.min(JOBS.length - 1, meta.selectedJob + 1));
      return;
    }
    if ((screen === SCREEN_JOBDONE || screen === SCREEN_WIN) && id === 'menu') {
      if (screen === SCREEN_WIN) meta.totalScore = 0;
      toSelect();
    }
  }

  function handleClick() {
    const click = input.takeClick();
    if (!click) return;
    audio.unlock();
    for (const button of renderer.buttonsFor(screen, meta)) {
      if (click.x >= button.x && click.x <= button.x + button.w
        && click.y >= button.y && click.y <= button.y + button.h) {
        clickButton(button.id);
        return;
      }
    }
    if (screen === SCREEN_TITLE) toSelect();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      meta.muted = audio.toggleMute();
      return;
    }
    if (screen === SCREEN_TITLE && (actions & ACTION_CONFIRM)) {
      toSelect();
      return;
    }
    if (screen === SCREEN_SELECT && (actions & ACTION_CONFIRM)) {
      startJob(meta.selectedJob);
      return;
    }
    if (screen === SCREEN_PLAY && (actions & ACTION_PAUSE)) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (screen === SCREEN_PAUSED && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen !== SCREEN_PLAY) return;
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) meta.muted = audio.toggleMute();
    const events = world.step(STEP, input.direction(), input.sneaking(), {
      use: !!(actions & ACTION_USE),
      coin: !!(actions & ACTION_COIN),
      hack: !!(actions & ACTION_HACK),
    });
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_CRACK) audio.crackWin();
    if (events & EVENT_SPOTTED) audio.spotted();
    if (events & EVENT_JOBDONE) endJob();
    else if (events & EVENT_CAUGHT) endCaught();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handleClick();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, meta);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  world.loadJob(0, meta.upgrades, false);
  announce('The Velvet Heist. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
