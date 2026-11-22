// The Velvet Heist — world simulation: the thief, guards, cameras, lasers,
// safes, the vault, loot, the alarm meter and the getaway.
import {
  ALARM_LOCKDOWN, CAMERA, GETAWAY_SECONDS, GUARD, JOBS, LASER, STEP, THIEF, TILE,
} from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_JOBDONE = 4;
export const EVENT_CRACK = 8;
export const EVENT_SPOTTED = 16;
export const EVENT_LASER = 32;

const SAFE_VALUE = 150;
const VAULT_VALUE = 400;
const LOOT_VALUE = 60;

function tileCentre(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createWorld(random) {
  const state = {
    jobIndex: 0,
    job: JOBS[0],
    walls: new Set(),
    cover: new Set(),
    lasers: [],
    loot: [],
    safes: [],
    vault: null,
    exit: null,
    start: { x: 0, y: 0 },
    cols: 0,
    rows: 0,
    player: { x: 0, y: 0, angle: -Math.PI / 2, loot: 0, value: 0, stun: 0 },
    guards: [],
    cameras: [],
    coins: [],
    alarm: 0,
    lockdown: false,
    getaway: 0,
    time: 0,
    laserCooldown: 0,
    crack: null,
    hacksLeft: 2,
    upgrades: {},
    ghostRun: false,
    everAlarmed: false,
    peakAlarm: 0,
    caught: false,
    done: false,
    result: null,
  };

  function key(tx, ty) {
    return `${tx},${ty}`;
  }

  function loadJob(index, upgrades, ghostRun) {
    const job = JOBS[index];
    state.jobIndex = index;
    state.job = job;
    state.upgrades = upgrades || {};
    state.ghostRun = !!ghostRun;
    state.walls = new Set();
    state.cover = new Set();
    state.lasers = [];
    state.loot = [];
    state.safes = [];
    state.vault = null;
    state.coins = [];
    state.alarm = 0;
    state.lockdown = false;
    state.getaway = 0;
    state.time = 0;
    state.crack = null;
    state.hacksLeft = 2 + (state.upgrades.rig ? 2 : 0);
    state.everAlarmed = false;
    state.peakAlarm = 0;
    state.caught = false;
    state.done = false;
    state.result = null;
    state.rows = job.map.length;
    state.cols = job.map[0].length;
    job.map.forEach((row, ty) => {
      for (let tx = 0; tx < row.length; tx += 1) {
        const ch = row[tx];
        if (ch === '#') state.walls.add(key(tx, ty));
        else if (ch === 'T') state.cover.add(key(tx, ty));
        else if (ch === 'l') state.lasers.push({ tx, ty });
        else if (ch === 'L') state.loot.push({ tx, ty, taken: false, value: LOOT_VALUE });
        else if (ch === 'S') state.safes.push({ tx, ty, open: false, value: SAFE_VALUE });
        else if (ch === 'V') state.vault = { tx, ty, open: false, value: VAULT_VALUE };
        else if (ch === 'E') state.exit = tileCentre(tx, ty);
        else if (ch === 'P') state.start = tileCentre(tx, ty);
      }
    });
    state.player = {
      x: state.start.x, y: state.start.y, angle: -Math.PI / 2,
      loot: 0, value: 0, stun: 0,
    };
    state.guards = job.patrols.slice(0, job.guards).map((waypoints) => {
      const start = tileCentre(waypoints[0][0], waypoints[0][1]);
      return {
        x: start.x, y: start.y, angle: 0, waypoints, wp: 1,
        mode: 'calm', awareness: 0, searchTimer: 0,
        lastSeen: { x: start.x, y: start.y }, investigate: null,
      };
    });
    state.cameras = job.cameras.map((cam) => {
      const pos = tileCentre(cam.tx, cam.ty);
      return {
        x: pos.x, y: pos.y, base: cam.base, sweep: cam.sweep,
        angle: cam.base, hackedUntil: 0, phase: random.range(0, Math.PI * 2),
      };
    });
  }

  function solidAtPx(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    return state.walls.has(key(tx, ty)) || state.cover.has(key(tx, ty));
  }

  function blocked(x, y) {
    const r = THIEF.radius - 2;
    return solidAtPx(x - r, y - r) || solidAtPx(x + r, y - r)
      || solidAtPx(x - r, y + r) || solidAtPx(x + r, y + r)
      || solidAtPx(x, y - r) || solidAtPx(x, y + r);
  }

  // Grid raycast: true when no wall or cover stands between the two points.
  function hasLineOfSight(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 8));
    for (let i = 1; i < steps; i += 1) {
      const x = ax + (dx * i) / steps;
      const y = ay + (dy * i) / steps;
      const tx = Math.floor(x / TILE);
      const ty = Math.floor(y / TILE);
      if (state.walls.has(key(tx, ty)) || state.cover.has(key(tx, ty))) return false;
    }
    return true;
  }

  function canSee(eye, range, halfAngle, target) {
    const dx = target.x - eye.x;
    const dy = target.y - eye.y;
    const dist = Math.hypot(dx, dy);
    if (dist > range) return false;
    if (dist > 30 && Math.abs(angleDiff(Math.atan2(dy, dx), eye.angle)) > halfAngle) return false;
    return hasLineOfSight(eye.x, eye.y, target.x, target.y);
  }

  function laserOn() {
    return (state.time % LASER.period) < LASER.period * LASER.onFraction;
  }

  function onLaserTile() {
    if (!laserOn()) return false;
    const tx = Math.floor(state.player.x / TILE);
    const ty = Math.floor(state.player.y / TILE);
    return state.lasers.some((laser) => laser.tx === tx && laser.ty === ty);
  }

  function nearestSafe() {
    const p = state.player;
    let best = null;
    let bestDist = 62;
    for (const safe of state.safes) {
      if (safe.open) continue;
      const c = tileCentre(safe.tx, safe.ty);
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < bestDist) {
        bestDist = d;
        best = { kind: 'safe', target: safe };
      }
    }
    if (state.vault && !state.vault.open) {
      const c = tileCentre(state.vault.tx, state.vault.ty);
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < bestDist) best = { kind: 'vault', target: state.vault };
    }
    return best;
  }

  function crackZoneHalf() {
    return state.upgrades.lockpick ? 0.16 : 0.1;
  }

  function startCrack(found) {
    const needed = found.kind === 'vault' ? 5 : 3;
    state.crack = {
      kind: found.kind,
      target: found.target,
      needle: 0,
      dir: 1,
      speed: 1.5,
      hits: 0,
      needed,
      zone: random.range(0.25, 0.75),
      zoneHalf: crackZoneHalf(),
    };
  }

  function crackPress() {
    const crack = state.crack;
    if (!crack) return 0;
    if (Math.abs(crack.needle - crack.zone) <= crack.zoneHalf) {
      crack.hits += 1;
      crack.zone = random.range(0.2, 0.8);
      crack.needle = 0;
      crack.dir = 1;
      if (crack.hits >= crack.needed) {
        crack.target.open = true;
        state.player.value += crack.target.value;
        state.player.loot += 1;
        state.crack = null;
        return EVENT_CRACK;
      }
      return 0;
    }
    state.alarm = Math.min(ALARM_LOCKDOWN, state.alarm + 8);
    crack.needle = 0;
    return 0;
  }

  function tossCoin() {
    const p = state.player;
    const tx = p.x + Math.cos(p.angle) * 70;
    const ty = p.y + Math.sin(p.angle) * 70;
    state.coins.push({ x: tx, y: ty, ttl: 6 });
    for (const guard of state.guards) {
      if (Math.hypot(guard.x - tx, guard.y - ty) < 280) {
        guard.investigate = { x: tx, y: ty };
        if (guard.mode === 'calm') guard.mode = 'search';
        guard.searchTimer = GUARD.searchTime;
      }
    }
  }

  function hackCamera() {
    if (state.hacksLeft <= 0) return false;
    let best = null;
    let bestDist = 230;
    for (const cam of state.cameras) {
      if (cam.hackedUntil > state.time) continue;
      const d = Math.hypot(cam.x - state.player.x, cam.y - state.player.y);
      if (d < bestDist) {
        bestDist = d;
        best = cam;
      }
    }
    if (!best) return false;
    best.hackedUntil = state.time + CAMERA.hackSeconds;
    state.hacksLeft -= 1;
    return true;
  }

  function moveGuard(guard, dt, targetX, targetY, speed) {
    const dx = targetX - guard.x;
    const dy = targetY - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    const stepLen = Math.min(dist, speed * dt);
    guard.x += (dx / dist) * stepLen;
    guard.y += (dy / dist) * stepLen;
    guard.angle = Math.atan2(dy, dx);
    return dist - stepLen < 4;
  }

  function stepGuard(guard, dt, sneaking) {
    const p = state.player;
    const sees = canSee(guard, GUARD.viewRange, GUARD.viewHalfAngle, p);
    const spotRate = sneaking ? 0.55 : 1;
    const slowFactor = state.upgrades.soles ? 0.65 : 1;
    if (sees) {
      guard.awareness = Math.min(1, guard.awareness + (dt / 0.9) * spotRate * slowFactor);
      guard.lastSeen = { x: p.x, y: p.y };
      if (guard.awareness >= 1 && guard.mode !== 'alarmed') {
        guard.mode = 'alarmed';
        state.everAlarmed = true;
      } else if (guard.awareness > 0.35 && guard.mode === 'calm') {
        guard.mode = 'suspicious';
      }
    } else {
      guard.awareness = Math.max(0, guard.awareness - dt * 0.25);
      if (guard.mode === 'suspicious' && guard.awareness <= 0.05) guard.mode = 'calm';
    }

    if (state.lockdown) {
      moveGuard(guard, dt, p.x, p.y, GUARD.chaseSpeed);
      return;
    }
    if (guard.mode === 'alarmed') {
      const reached = moveGuard(guard, dt, guard.lastSeen.x, guard.lastSeen.y, GUARD.chaseSpeed);
      if (reached && !sees) {
        guard.mode = 'search';
        guard.searchTimer = GUARD.searchTime;
      }
      return;
    }
    if (guard.mode === 'suspicious') {
      guard.angle = Math.atan2(p.y - guard.y, p.x - guard.x);
      return;
    }
    if (guard.mode === 'search') {
      const target = guard.investigate || guard.lastSeen;
      const reached = moveGuard(guard, dt, target.x, target.y, GUARD.speed * 1.25);
      guard.searchTimer -= dt;
      if (reached || guard.searchTimer <= 0) {
        guard.investigate = null;
        guard.mode = 'calm';
        guard.searchTimer = 0;
      }
      return;
    }
    // Calm patrol.
    const wp = guard.waypoints[guard.wp % guard.waypoints.length];
    const target = tileCentre(wp[0], wp[1]);
    if (moveGuard(guard, dt, target.x, target.y, GUARD.speed)) {
      guard.wp = (guard.wp + 1) % guard.waypoints.length;
    }
  }

  function finishJob() {
    const lootValue = state.player.value;
    const lootCount = state.player.loot;
    const timeBonus = Math.max(0, Math.round((300 - state.time) * 2));
    let rating = 'LOUD';
    let mult = 1;
    if (!state.everAlarmed && state.peakAlarm < 25) {
      rating = 'GHOST';
      mult = 1.5;
    } else if (!state.lockdown) {
      rating = 'SHADOW';
      mult = 1.25;
    }
    if (state.ghostRun) mult *= 1.5;
    const score = Math.round((lootValue + timeBonus) * mult);
    state.result = {
      jobIndex: state.jobIndex,
      jobName: state.job.name,
      lootValue,
      lootCount,
      timeSeconds: Math.round(state.time),
      timeBonus,
      rating,
      multiplier: mult,
      score,
      coinsEarned: Math.floor(lootValue / 10),
      ghostRun: state.ghostRun,
    };
    state.done = true;
    return EVENT_JOBDONE;
  }

  function step(dt, move, sneaking, actions) {
    if (state.done || state.caught) return 0;
    let events = 0;
    state.time += dt;
    const p = state.player;
    if (p.stun > 0) p.stun -= dt;
    state.laserCooldown = Math.max(0, state.laserCooldown - dt);

    // Cracking a safe freezes the thief but the needle keeps moving.
    if (state.crack) {
      const crack = state.crack;
      crack.needle += crack.dir * crack.speed * dt;
      if (crack.needle > 1) {
        crack.needle = 1;
        crack.dir = -1;
      } else if (crack.needle < 0) {
        crack.needle = 0;
        crack.dir = 1;
      }
      if (actions.use) events |= crackPress();
      return events;
    }

    if (actions.use) {
      const found = nearestSafe();
      if (found) startCrack(found);
    }
    if (actions.coin) tossCoin();
    if (actions.hack) hackCamera();

    // Move the thief, slowed by carried loot.
    const carrySlow = state.upgrades.bag ? THIEF.carryPenalty / 2 : THIEF.carryPenalty;
    let speed = sneaking ? THIEF.sneak : THIEF.walk;
    speed = Math.max(THIEF.minSpeed, speed - p.loot * carrySlow);
    if (p.stun > 0) speed *= 0.45;
    if (move.x !== 0 || move.y !== 0) {
      p.angle = Math.atan2(move.y, move.x);
      const nx = p.x + move.x * speed * dt;
      const ny = p.y + move.y * speed * dt;
      if (!blocked(nx, p.y)) p.x = nx;
      if (!blocked(p.x, ny)) p.y = ny;
    }

    // Pocket loot by walking over it.
    for (const item of state.loot) {
      if (item.taken) continue;
      const c = tileCentre(item.tx, item.ty);
      if (Math.hypot(c.x - p.x, c.y - p.y) < 30) {
        item.taken = true;
        p.loot += 1;
        p.value += item.value;
        events |= EVENT_PICKUP;
      }
    }

    // Lasers: crossing a live gate costs alarm and a stumble.
    if (onLaserTile() && state.laserCooldown <= 0) {
      state.alarm = Math.min(ALARM_LOCKDOWN, state.alarm + LASER.alarmHit);
      p.stun = 0.6;
      state.laserCooldown = 1;
      events |= EVENT_LASER;
    }

    // Guards and cameras raise the alarm while they see the thief.
    let seen = false;
    for (const guard of state.guards) {
      const before = guard.mode;
      stepGuard(guard, dt, sneaking);
      if (guard.mode === 'alarmed') {
        seen = true;
        state.alarm = Math.min(ALARM_LOCKDOWN, state.alarm + GUARD.alarmPerSecond * dt);
      }
      if (before !== 'alarmed' && guard.mode === 'alarmed') events |= EVENT_SPOTTED;
      if (Math.hypot(guard.x - p.x, guard.y - p.y) < GUARD.catchRange) {
        state.caught = true;
        return events | EVENT_CAUGHT;
      }
    }
    for (const cam of state.cameras) {
      cam.angle = cam.base + Math.sin(state.time * 0.7 + cam.phase) * cam.sweep;
      if (cam.hackedUntil > state.time) continue;
      if (canSee(cam, CAMERA.range, CAMERA.halfAngle, p)) {
        seen = true;
        state.alarm = Math.min(ALARM_LOCKDOWN, state.alarm + CAMERA.alarmPerSecond * dt);
      }
    }
    if (!seen) state.alarm = Math.max(0, state.alarm - 2 * dt);
    state.peakAlarm = Math.max(state.peakAlarm, state.alarm);

    if (state.alarm >= ALARM_LOCKDOWN && !state.lockdown) {
      state.lockdown = true;
      state.getaway = GETAWAY_SECONDS;
    }
    if (state.lockdown) {
      state.getaway -= dt;
      if (state.getaway <= 0) {
        state.caught = true;
        return events | EVENT_CAUGHT;
      }
    }

    // Coins fade away.
    for (const coin of state.coins) coin.ttl -= dt;
    state.coins = state.coins.filter((coin) => coin.ttl > 0);

    // Reaching the green exit ends the job — but it stays locked until the
    // thief has pocketed the job's loot goal, so the room must be worked.
    if (state.exit && Math.hypot(state.exit.x - p.x, state.exit.y - p.y) < 30) {
      if (state.player.loot >= state.job.lootGoal) return events | finishJob();
    }
    return events;
  }

  return {
    state,
    loadJob,
    step,
    nearestSafe,
    laserOn,
    hasLineOfSight,
    tileCentre,
    // Deterministic staging helpers for screenshots.
    setAlarm(value) {
      state.alarm = value;
      state.peakAlarm = Math.max(state.peakAlarm, value);
      if (value >= ALARM_LOCKDOWN) {
        state.lockdown = true;
        state.getaway = GETAWAY_SECONDS;
      }
    },
    setLockdown(seconds) {
      state.lockdown = true;
      state.getaway = seconds;
    },
  };
}
