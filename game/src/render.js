// The Velvet Heist — canvas rendering: the rooms, vision cones, cameras,
// lasers, loot, HUD, menus, the crew shop and every end screen.
import {
  CAMERA, GUARD, JOBS, LASER, SCREEN_CAUGHT, SCREEN_JOBDONE, SCREEN_PAUSED,
  SCREEN_PLAY, SCREEN_SELECT, SCREEN_TITLE, SCREEN_WIN, TILE, UPGRADES,
  VIEW_H, VIEW_W,
} from './config.js';

export {
  SCREEN_CAUGHT, SCREEN_JOBDONE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_SELECT,
  SCREEN_TITLE, SCREEN_WIN,
};

const MAP_X = 120;
const MAP_Y = 108;
const GOLD = '#f2c14e';
const GREEN = '#3ddc84';
const RED = '#ff4d5e';
const CYAN = '#57d7ff';
const PURPLE = '#b07cff';

function sector(ctx, x, y, angle, halfAngle, range, color) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function coneColor(mode) {
  if (mode === 'alarmed') return 'rgba(255,77,94,0.34)';
  if (mode === 'suspicious') return 'rgba(242,193,78,0.30)';
  if (mode === 'search') return 'rgba(242,193,78,0.22)';
  return 'rgba(242,193,78,0.16)';
}

export function createRenderer(canvas) {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');

  function drawWorld(state) {
    const job = state.job;
    // Floor.
    for (let ty = 0; ty < state.rows; ty += 1) {
      for (let tx = 0; tx < state.cols; tx += 1) {
        const x = MAP_X + tx * TILE;
        const y = MAP_Y + ty * TILE;
        ctx.fillStyle = (tx + ty) % 2 === 0 ? '#1d2338' : '#212740';
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
    // Laser gates (under everything else that stands on them).
    const laserOn = (state.time % LASER.period) < LASER.period * LASER.onFraction;
    for (const laser of state.lasers) {
      const x = MAP_X + laser.tx * TILE;
      const y = MAP_Y + laser.ty * TILE;
      ctx.fillStyle = laserOn ? 'rgba(255,77,94,0.55)' : 'rgba(255,77,94,0.12)';
      ctx.fillRect(x + 4, y, TILE - 8, TILE);
      ctx.strokeStyle = laserOn ? '#ff4d5e' : '#7a2b33';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 4, y, TILE - 8, TILE);
    }
    // Walls and cover.
    state.walls.forEach((keyStr) => {
      const [tx, ty] = keyStr.split(',').map(Number);
      ctx.fillStyle = '#3a4260';
      ctx.fillRect(MAP_X + tx * TILE, MAP_Y + ty * TILE, TILE, TILE);
      ctx.fillStyle = '#4a5478';
      ctx.fillRect(MAP_X + tx * TILE, MAP_Y + ty * TILE, TILE, 5);
    });
    state.cover.forEach((keyStr) => {
      const [tx, ty] = keyStr.split(',').map(Number);
      ctx.fillStyle = '#6b4f2a';
      roundRect(ctx, MAP_X + tx * TILE + 4, MAP_Y + ty * TILE + 4, TILE - 8, TILE - 8, 6);
      ctx.fill();
      ctx.fillStyle = '#8a6a3c';
      ctx.fillRect(MAP_X + tx * TILE + 8, MAP_Y + ty * TILE + 8, TILE - 16, 6);
    });
    // Exit: green and open once the loot goal is met, locked before that.
    if (state.exit) {
      const unlocked = state.player.loot >= state.job.lootGoal;
      const ex = MAP_X + state.exit.x;
      const ey = MAP_Y + state.exit.y;
      ctx.fillStyle = unlocked ? 'rgba(61,220,132,0.25)' : 'rgba(255,77,94,0.15)';
      ctx.fillRect(ex - TILE / 2, ey - TILE / 2, TILE, TILE);
      ctx.strokeStyle = unlocked ? GREEN : RED;
      ctx.lineWidth = 3;
      ctx.strokeRect(ex - TILE / 2 + 2, ey - TILE / 2 + 2, TILE - 4, TILE - 4);
      text(ctx, unlocked ? 'EXIT' : 'LOCKED', ex, ey, 12, unlocked ? GREEN : RED, 'center');
      if (!unlocked) text(ctx, `${state.player.loot}/${state.job.lootGoal} loot`, ex, ey + 26, 10, '#c8cede', 'center');
    }
    // Loot.
    for (const item of state.loot) {
      if (item.taken) continue;
      const cx = MAP_X + item.tx * TILE + TILE / 2;
      const cy = MAP_Y + item.ty * TILE + TILE / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = GOLD;
      ctx.fillRect(-9, -9, 18, 18);
      ctx.strokeStyle = '#fff3c4';
      ctx.lineWidth = 2;
      ctx.strokeRect(-9, -9, 18, 18);
      ctx.restore();
      text(ctx, '$', cx, cy + 1, 13, '#3a2c00', 'center');
    }
    // Safes and the vault.
    for (const safe of state.safes) {
      const cx = MAP_X + safe.tx * TILE + TILE / 2;
      const cy = MAP_Y + safe.ty * TILE + TILE / 2;
      ctx.fillStyle = safe.open ? '#2f6b4a' : '#5a6278';
      roundRect(ctx, cx - 15, cy - 15, 30, 30, 5);
      ctx.fill();
      ctx.strokeStyle = safe.open ? GREEN : '#c8cede';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.strokeStyle = GOLD;
      ctx.stroke();
      text(ctx, safe.open ? 'OPEN' : 'SAFE', cx, cy + 24, 10, '#c8cede', 'center');
    }
    if (state.vault) {
      const v = state.vault;
      const cx = MAP_X + v.tx * TILE + TILE / 2;
      const cy = MAP_Y + v.ty * TILE + TILE / 2;
      ctx.fillStyle = v.open ? '#2f6b4a' : '#8a6d1f';
      roundRect(ctx, cx - 17, cy - 17, 34, 34, 6);
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 3;
      ctx.stroke();
      text(ctx, 'VAULT', cx, cy + 27, 10, GOLD, 'center');
    }
    // Thrown coins.
    for (const coin of state.coins) {
      const cx = MAP_X + coin.x;
      const cy = MAP_Y + coin.y;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = GOLD;
      ctx.fill();
      ctx.strokeStyle = '#fff3c4';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 13 + Math.sin(state.time * 6) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(242,193,78,0.6)';
      ctx.stroke();
    }
    // Camera cones, then the cameras themselves.
    for (const cam of state.cameras) {
      const cx = MAP_X + cam.x;
      const cy = MAP_Y + cam.y;
      const hacked = cam.hackedUntil > state.time;
      if (!hacked) sector(ctx, cx, cy, cam.angle, CAMERA.halfAngle, CAMERA.range, 'rgba(87,215,255,0.20)');
      ctx.fillStyle = hacked ? '#3a3f52' : '#20242f';
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hacked ? '#6b7280' : CYAN;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = hacked ? '#6b7280' : CYAN;
      ctx.fill();
      if (hacked) text(ctx, 'HACKED', cx, cy - 20, 10, CYAN, 'center');
    }
    // Guard cones, then the guards.
    for (const guard of state.guards) {
      const gx = MAP_X + guard.x;
      const gy = MAP_Y + guard.y;
      sector(ctx, gx, gy, guard.angle, GUARD.viewHalfAngle, GUARD.viewRange, coneColor(guard.mode));
    }
    for (const guard of state.guards) {
      const gx = MAP_X + guard.x;
      const gy = MAP_Y + guard.y;
      const color = guard.mode === 'alarmed' ? RED : guard.mode === 'calm' ? '#e8b64c' : GOLD;
      ctx.fillStyle = '#232839';
      ctx.beginPath();
      ctx.arc(gx, gy, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      // Facing tick.
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + Math.cos(guard.angle) * 18, gy + Math.sin(guard.angle) * 18);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      // Awareness arc above the guard.
      if (guard.awareness > 0.03) {
        ctx.beginPath();
        ctx.arc(gx, gy, 21, -Math.PI / 2, -Math.PI / 2 + guard.awareness * Math.PI * 2);
        ctx.strokeStyle = guard.mode === 'alarmed' ? RED : GOLD;
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      const label = guard.mode === 'alarmed' ? '!' : guard.mode === 'suspicious' ? '?' : '';
      if (label) text(ctx, label, gx, gy - 26, 18, guard.mode === 'alarmed' ? RED : GOLD, 'center');
    }
    // The thief.
    const px = MAP_X + state.player.x;
    const py = MAP_Y + state.player.y;
    ctx.fillStyle = 'rgba(176,124,255,0.18)';
    ctx.beginPath();
    ctx.arc(px, py, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2140';
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PURPLE;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(state.player.angle) * 17, py + Math.sin(state.player.angle) * 17);
    ctx.strokeStyle = '#e9dcff';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Loot satchel dots.
    for (let i = 0; i < Math.min(state.player.loot, 7); i += 1) {
      ctx.fillStyle = GOLD;
      ctx.fillRect(px - 12 + i * 4, py + 12, 3, 3);
    }
    // Room label.
    text(ctx, `${state.jobIndex + 1}. ${state.job.name}`, MAP_X, MAP_Y - 16, 18, '#e8ecf8');
    text(ctx, state.job.sub, MAP_X + 320, MAP_Y - 16, 13, '#8a93b0', 'left', 'normal');
  }

  function drawHud(state, meta) {
    // Top bar.
    ctx.fillStyle = '#12152a';
    ctx.fillRect(0, 0, VIEW_W, 84);
    ctx.fillStyle = '#232a45';
    ctx.fillRect(0, 84, VIEW_W, 2);
    text(ctx, 'THE VELVET HEIST', 24, 30, 22, '#f2c14e');
    text(ctx, `JOB ${state.jobIndex + 1}/6  ·  ${state.job.name}`, 24, 58, 14, '#c8cede');
    // Alarm meter.
    const ax = 470;
    const ay = 22;
    const aw = 320;
    text(ctx, 'ALARM', ax, ay - 4, 12, state.alarm > 60 ? RED : '#c8cede');
    ctx.fillStyle = '#232a45';
    roundRect(ctx, ax, ay + 8, aw, 18, 9);
    ctx.fill();
    const alarmW = Math.max(0, Math.min(1, state.alarm / 100)) * aw;
    ctx.fillStyle = state.alarm > 60 ? RED : state.alarm > 30 ? GOLD : GREEN;
    if (alarmW > 0) {
      roundRect(ctx, ax, ay + 8, alarmW, 18, 9);
      ctx.fill();
    }
    text(ctx, `${Math.round(state.alarm)}%`, ax + aw + 12, ay + 17, 15, '#e8ecf8');
    if (state.lockdown) {
      text(ctx, `LOCKDOWN — GETAWAY ${Math.ceil(state.getaway)}s`, ax, ay + 44, 15, RED);
    } else if (state.alarm > 30) {
      text(ctx, 'They are getting suspicious…', ax, ay + 44, 13, GOLD, 'left', 'normal');
    }
    // Loot, hacks, time, score.
    text(ctx, `LOOT $${state.player.value}  (${state.player.loot})`, 850, 30, 15, GOLD);
    text(ctx, `HACKS ${state.hacksLeft}  ·  TIME ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`, 850, 56, 13, '#c8cede', 'left', 'normal');
    text(ctx, `COINS ${meta.coins}`, 1150, 30, 15, '#e8ecf8', 'right');
    text(ctx, meta.muted ? 'MUTED (M)' : 'M: MUTE', 1150, 56, 12, '#8a93b0', 'right', 'normal');
    // Bottom hint bar.
    ctx.fillStyle = '#12152a';
    ctx.fillRect(0, VIEW_H - 34, VIEW_W, 34);
    text(ctx, 'WASD / arrows move · Shift sneak · E crack/use · Q / right-click coin · F hack camera · P pause', 24, VIEW_H - 17, 13, '#8a93b0', 'left', 'normal');
    if (state.crack) {
      text(ctx, 'CRACKING — press E in the gold zone!', 1150, VIEW_H - 17, 13, GOLD, 'right');
    }
  }

  function drawCrack(state) {
    const crack = state.crack;
    if (!crack) return;
    const cx = VIEW_W / 2;
    const cy = VIEW_H / 2;
    ctx.fillStyle = 'rgba(8,10,20,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#161a2e';
    roundRect(ctx, cx - 260, cy - 110, 520, 220, 14);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, crack.kind === 'vault' ? 'CRACKING THE VAULT' : 'CRACKING THE SAFE', cx, cy - 78, 22, GOLD, 'center');
    text(ctx, `Tumbler ${crack.hits + 1} of ${crack.needed} — press E when the needle is in the gold zone`, cx, cy - 46, 14, '#c8cede', 'center');
    const barX = cx - 200;
    const barY = cy - 10;
    const barW = 400;
    ctx.fillStyle = '#232a45';
    roundRect(ctx, barX, barY, barW, 26, 13);
    ctx.fill();
    const zoneX = barX + (crack.zone - crack.zoneHalf) * barW;
    ctx.fillStyle = GOLD;
    ctx.fillRect(zoneX, barY, crack.zoneHalf * 2 * barW, 26);
    const needleX = barX + crack.needle * barW;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(needleX - 2, barY - 8, 4, 42);
    text(ctx, 'E = stop the needle', cx, cy + 52, 14, '#8a93b0', 'center');
    text(ctx, 'A miss trips the alarm +8%', cx, cy + 78, 13, RED, 'center', 'normal');
  }

  function drawTitle(meta) {
    ctx.fillStyle = '#0d0f1a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Velvet curtain stripes.
    for (let i = 0; i < 16; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? '#171028' : '#1d1332';
      ctx.fillRect(i * 80, 0, 80, VIEW_H);
    }
    ctx.fillStyle = 'rgba(242,193,78,0.08)';
    ctx.beginPath();
    ctx.arc(VIEW_W / 2, 250, 210, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, 'THE VELVET HEIST', VIEW_W / 2, 180, 56, GOLD, 'center');
    text(ctx, 'Six jobs. One crew. No alarms if you are good.', VIEW_W / 2, 235, 18, '#c8cede', 'center', 'normal');
    text(ctx, 'Sneak past the guards, read their cones, blind the cameras,', VIEW_W / 2, 300, 16, '#8a93b0', 'center', 'normal');
    text(ctx, 'crack the safes — and be out before the building locks down.', VIEW_W / 2, 326, 16, '#8a93b0', 'center', 'normal');
    const bx = VIEW_W / 2 - 130;
    const by = 400;
    ctx.fillStyle = GOLD;
    roundRect(ctx, bx, by, 260, 56, 10);
    ctx.fill();
    text(ctx, 'START THE CREW', VIEW_W / 2, by + 29, 20, '#1a1200', 'center');
    text(ctx, 'WASD move · Shift sneak · E crack · Q coin · F hack · P pause · M mute', VIEW_W / 2, 500, 14, '#8a93b0', 'center', 'normal');
    text(ctx, `Best score: ${meta.best}`, VIEW_W / 2, 540, 15, '#e8ecf8', 'center');
    text(ctx, 'An original game — art and sound drawn and synthesized in code.', VIEW_W / 2, 590, 13, '#5f6a88', 'center', 'normal');
  }

  function drawSelect(state, meta) {
    ctx.fillStyle = '#0d0f1a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'PICK A JOB', 48, 52, 30, GOLD);
    text(ctx, `Crew coins: ${meta.coins}   ·   Jobs cleared: ${meta.completed.length}/6`, 48, 88, 15, '#c8cede');
    JOBS.forEach((job, i) => {
      const y = 120 + i * 74;
      const unlocked = i <= meta.unlocked;
      const done = meta.completed.includes(i);
      ctx.fillStyle = unlocked ? '#161a2e' : '#10131f';
      roundRect(ctx, 48, y, 640, 62, 10);
      ctx.fill();
      ctx.strokeStyle = done ? GREEN : '#2a3050';
      ctx.lineWidth = 2;
      ctx.stroke();
      text(ctx, `${i + 1}. ${job.name}`, 68, y + 20, 18, unlocked ? '#e8ecf8' : '#5f6a88');
      text(ctx, unlocked ? job.sub : 'Finish the previous job to unlock.', 68, y + 44, 13, '#8a93b0', 'left', 'normal');
      if (done) text(ctx, 'CLEARED ✓', 640, y + 31, 15, GREEN, 'right');
      else if (unlocked) text(ctx, `${job.guards} guards · ${job.cameras.length} cameras`, 640, y + 31, 13, GOLD, 'right');
    });
    // Crew shop.
    text(ctx, 'CREW SHOP — spend coins between jobs', 740, 52, 20, GOLD);
    UPGRADES.forEach((up, i) => {
      const y = 120 + i * 74;
      const owned = !!meta.upgrades[up.id];
      ctx.fillStyle = '#161a2e';
      roundRect(ctx, 740, y, 490, 62, 10);
      ctx.fill();
      ctx.strokeStyle = owned ? GREEN : '#2a3050';
      ctx.lineWidth = 2;
      ctx.stroke();
      text(ctx, up.name, 760, y + 20, 16, owned ? GREEN : '#e8ecf8');
      text(ctx, up.desc, 760, y + 44, 12, '#8a93b0', 'left', 'normal');
      text(ctx, owned ? 'OWNED' : `${up.cost} coins`, 1210, y + 31, 15, owned ? GREEN : GOLD, 'right');
    });
    // Ghost run toggle + start.
    const gy = 120 + 4 * 74 + 16;
    ctx.fillStyle = meta.ghostRun ? '#3a2c00' : '#161a2e';
    roundRect(ctx, 740, gy, 490, 52, 10);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, meta.ghostRun ? 'GHOST RUN: ON — score ×1.5, one alarm ends the job' : 'GHOST RUN: OFF — score ×1.5 if you take it', 760, gy + 26, 14, GOLD);
    text(ctx, 'Click a job, then START JOB — or press Enter for the next job.', 48, 120 + 6 * 74 + 8, 14, '#8a93b0', 'left', 'normal');
    const bx = VIEW_W / 2 - 130;
    const by = VIEW_H - 84;
    ctx.fillStyle = GOLD;
    roundRect(ctx, bx, by, 260, 52, 10);
    ctx.fill();
    text(ctx, 'START JOB', VIEW_W / 2, by + 27, 20, '#1a1200', 'center');
  }

  function drawOverlay(title, lines, buttons) {
    ctx.fillStyle = 'rgba(8,10,20,0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, title, VIEW_W / 2, 300, 44, GOLD, 'center');
    lines.forEach((line, i) => {
      text(ctx, line, VIEW_W / 2, 360 + i * 30, 17, '#c8cede', 'center', 'normal');
    });
    buttons.forEach((btn) => {
      ctx.fillStyle = btn.primary ? GOLD : '#232a45';
      roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 10);
      ctx.fill();
      text(ctx, btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1, 18, btn.primary ? '#1a1200' : '#e8ecf8', 'center');
    });
  }

  function drawJobDone(state, meta) {
    const r = state.result;
    const lines = [
      `${r.jobName} — cleared in ${r.timeSeconds}s`,
      `Loot $${r.lootValue} (${r.lootCount} items)  ·  Time bonus $${r.timeBonus}`,
      `Stealth: ${r.rating}  ·  Multiplier ×${r.multiplier}`,
      `SCORE ${r.score}   ·   +${r.coinsEarned} crew coins`,
    ];
    if (r.rating === 'GHOST') lines.push('Not a single guard raised the alarm. The crew is talking about you.');
    drawOverlay('JOB DONE', lines, [
      { id: 'next', label: 'NEXT JOB', x: VIEW_W / 2 - 280, y: 540, w: 260, h: 52, primary: true },
      { id: 'menu', label: 'CREW MENU', x: VIEW_W / 2 + 20, y: 540, w: 260, h: 52, primary: false },
    ]);
  }

  function drawWin(state, meta) {
    const lines = [
      `All six jobs cleared. Total score ${meta.totalScore}.`,
      'The vault is empty, the crew is rich, and nobody saw a thing.',
      `Best score: ${meta.best}`,
    ];
    drawOverlay('THE CREW RETIRES RICH', lines, [
      { id: 'menu', label: 'PLAY AGAIN', x: VIEW_W / 2 - 130, y: 540, w: 260, h: 52, primary: true },
    ]);
  }

  return {
    // Buttons the main loop can click-test, per screen.
    buttonsFor(screen, meta) {
      if (screen === SCREEN_TITLE) {
        return [{ id: 'start', x: VIEW_W / 2 - 130, y: 400, w: 260, h: 56 }];
      }
      if (screen === SCREEN_SELECT) {
        const buttons = [];
        JOBS.forEach((job, i) => {
          buttons.push({ id: `job-${i}`, x: 48, y: 120 + i * 74, w: 640, h: 62 });
        });
        UPGRADES.forEach((up, i) => {
          buttons.push({ id: `buy-${up.id}`, x: 740, y: 120 + i * 74, w: 490, h: 62 });
        });
        buttons.push({ id: 'ghost', x: 740, y: 120 + 4 * 74 + 16, w: 490, h: 52 });
        buttons.push({ id: 'start', x: VIEW_W / 2 - 130, y: VIEW_H - 84, w: 260, h: 52 });
        return buttons;
      }
      if (screen === SCREEN_CAUGHT) {
        return [
          { id: 'retry', x: VIEW_W / 2 - 280, y: 540, w: 260, h: 52 },
          { id: 'menu', x: VIEW_W / 2 + 20, y: 540, w: 260, h: 52 },
        ];
      }
      if (screen === SCREEN_JOBDONE) {
        return [
          { id: 'next', x: VIEW_W / 2 - 280, y: 540, w: 260, h: 52 },
          { id: 'menu', x: VIEW_W / 2 + 20, y: 540, w: 260, h: 52 },
        ];
      }
      if (screen === SCREEN_WIN) {
        return [{ id: 'menu', x: VIEW_W / 2 - 130, y: 540, w: 260, h: 52 }];
      }
      return [];
    },
    draw(state, screen, meta) {
      ctx.fillStyle = '#0d0f1a';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      if (screen === SCREEN_TITLE) {
        drawTitle(meta);
        return;
      }
      if (screen === SCREEN_SELECT) {
        drawSelect(state, meta);
        return;
      }
      drawWorld(state);
      drawHud(state, meta);
      if (screen === SCREEN_PLAY) {
        drawCrack(state);
        if (state.lockdown) {
          text(ctx, 'LOCKDOWN! Reach the green EXIT before the timer runs out!', VIEW_W / 2, 730, 18, RED, 'center');
        }
        return;
      }
      if (screen === SCREEN_PAUSED) {
        drawOverlay('PAUSED', ['Take a breath. The guards are still walking their rounds.'], [
          { id: 'resume', label: 'RESUME', x: VIEW_W / 2 - 130, y: 540, w: 260, h: 52, primary: true },
        ]);
        return;
      }
      if (screen === SCREEN_CAUGHT) {
        const reason = state.getaway <= 0 && state.lockdown
          ? 'The getaway timer ran out. The building locked you in.'
          : 'A guard caught you in the open. Fair cop — the cone was showing.';
        drawOverlay('CAUGHT!', [reason, 'The job is blown. The crew keeps the coins you already banked.'], [
          { id: 'retry', label: 'RETRY JOB', x: VIEW_W / 2 - 280, y: 540, w: 260, h: 52, primary: true },
          { id: 'menu', label: 'CREW MENU', x: VIEW_W / 2 + 20, y: 540, w: 260, h: 52, primary: false },
        ]);
        return;
      }
      if (screen === SCREEN_JOBDONE) {
        drawJobDone(state, meta);
        return;
      }
      if (screen === SCREEN_WIN) {
        drawWin(state, meta);
      }
    },
  };
}
