// Deterministic screenshot scenes for ?shot=play|vault|select|getaway.
// Each scene sets the real world to a fixed, staged state — the thief, guards,
// cameras and loot are placed by hand, so the frame is exactly what the game
// looks like mid-heist and the same seed always gives the same frame.
import { SCREEN_PLAY, SCREEN_SELECT } from './render.js';

// Put a guard at a tile and aim it at the thief, so its cone reads in the shot.
function poseGuard(world, index, tx, ty, aimAt) {
  const guard = world.state.guards[index];
  if (!guard) return;
  const c = world.tileCentre(tx, ty);
  guard.x = c.x;
  guard.y = c.y;
  guard.angle = Math.atan2(aimAt.y - c.y, aimAt.x - c.x);
  guard.mode = index === 0 ? 'suspicious' : 'calm';
  guard.awareness = index === 0 ? 0.7 : 0.1;
  guard.lastSeen = { x: aimAt.x, y: aimAt.y };
}

function poseThief(world, tx, ty, angle) {
  const c = world.tileCentre(tx, ty);
  world.state.player.x = c.x;
  world.state.player.y = c.y;
  world.state.player.angle = angle;
}

export function stageShot(name, world) {
  if (name === 'select') {
    world.loadJob(0, {}, false);
    return { screen: SCREEN_SELECT, best: 0 };
  }
  if (name === 'vault') {
    world.loadJob(5, { lockpick: true, rig: true }, false);
    const thief = { x: 0, y: 0 };
    poseThief(world, 11, 2, 0);
    thief.x = world.state.player.x;
    thief.y = world.state.player.y;
    poseGuard(world, 0, 9, 4, thief);
    poseGuard(world, 1, 14, 4, thief);
    poseGuard(world, 2, 19, 4, thief);
    world.state.player.loot = 5;
    world.state.player.value = 420;
    world.setAlarm(55);
    // Start cracking the vault itself: needle mid-swing, one tumbler done.
    const vault = world.state.vault;
    world.state.crack = {
      kind: 'vault', target: vault, needle: 0.62, dir: 1, speed: 1.5,
      hits: 1, needed: 5, zone: 0.55, zoneHalf: 0.16,
    };
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'getaway') {
    world.loadJob(2, { soles: true }, false);
    poseThief(world, 20, 12, 0);
    const thief = { x: world.state.player.x, y: world.state.player.y };
    poseGuard(world, 0, 17, 11, thief);
    poseGuard(world, 1, 21, 10, thief);
    poseGuard(world, 2, 18, 13, thief);
    poseGuard(world, 3, 14, 12, thief);
    world.state.guards.forEach((guard) => {
      guard.mode = 'alarmed';
      guard.awareness = 1;
    });
    world.state.player.loot = 5;
    world.state.player.value = 360;
    world.setAlarm(100);
    world.setLockdown(18);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // Default: 'play' — mid-heist on the first job.
  world.loadJob(0, {}, false);
  poseThief(world, 10, 6, -Math.PI / 2);
  const thief = { x: world.state.player.x, y: world.state.player.y };
  poseGuard(world, 0, 9, 4, thief);
  poseGuard(world, 1, 15, 9, thief);
  poseGuard(world, 2, 20, 5, thief);
  world.state.player.loot = 2;
  world.state.player.value = 120;
  world.setAlarm(35);
  return { screen: SCREEN_PLAY, best: 0 };
}
