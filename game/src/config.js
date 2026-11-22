// The Velvet Heist — tuning, screens, jobs and tile maps.
// Map legend: # wall, . floor, T cover (blocks movement and sight), L loot,
// S safe, V vault, E exit, l laser gate, P thief start, G guard start.
export const STEP = 1 / 60;
export const TILE = 40;
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const BEST_KEY = 'velvet-heist-best';
export const COINS_KEY = 'velvet-heist-coins';

export const SCREEN_TITLE = 'title';
export const SCREEN_SELECT = 'select';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_JOBDONE = 'jobdone';
export const SCREEN_WIN = 'win';

// Thief movement, in pixels per second.
export const THIEF = {
  walk: 205,
  sneak: 118,
  carryPenalty: 14, // px/s lost per loot item carried
  minSpeed: 96,
  radius: 13,
};

// Guard senses, in pixels and seconds.
export const GUARD = {
  speed: 88,
  chaseSpeed: 168,
  viewRange: 185,
  viewHalfAngle: 0.62, // radians either side of facing
  catchRange: 26,
  suspiciousTime: 2.2,
  searchTime: 6,
  alarmPerSecond: 34, // alarm gained while a guard has eyes on the thief
};

export const CAMERA = {
  range: 210,
  halfAngle: 0.5,
  alarmPerSecond: 26,
  hackSeconds: 9,
};

export const LASER = {
  period: 2.4, // seconds for one on/off cycle
  onFraction: 0.5,
  alarmHit: 24,
};

export const ALARM_LOCKDOWN = 100;
export const GETAWAY_SECONDS = 25;

export const UPGRADES = [
  { id: 'lockpick', name: 'Lockpick Kit', cost: 30, desc: 'Crack zones 60% wider. Safes open faster.' },
  { id: 'soles', name: 'Soft Soles', cost: 25, desc: 'Sneaking is silent: guards spot you 35% slower.' },
  { id: 'rig', name: 'Hacker Rig', cost: 35, desc: '+2 camera hacks on every job.' },
  { id: 'bag', name: 'Big Bag', cost: 20, desc: 'Loot weighs half as much. Carry more, run faster.' },
];

export const JOBS = [
  {
    name: 'The Jewel House',
    sub: 'A quiet townhouse. Three guards, one sleepy camera.',
    lootGoal: 4,
    guards: 3,
    cameras: [{ tx: 13, ty: 1, base: Math.PI / 2, sweep: 0.9 }],
    patrols: [
      [[3, 7], [9, 7], [9, 3], [3, 3]],
      [[13, 10], [20, 10], [20, 5], [13, 5]],
      [[22, 7], [22, 12], [18, 12], [18, 7]],
    ],
    map: [
      '##########################',
      '#......#........#........#',
      '#..L...#....T...#...L....#',
      '#......#........#........#',
      '#..T...#...L....#...T....#',
      '#......#........#....S...#',
      '#......#........#........#',
      '#..G...#....G...#....G...#',
      '#......#........#........#',
      '#..L...#....T...#...L....#',
      '#......#........#........#',
      '#......#........#........#',
      '#..P...#........#....E...#',
      '#......#........#........#',
      '##########################',
    ],
  },
  {
    name: 'The Old Bank',
    sub: 'Marble halls, laser gates and a vault clerk who never blinks.',
    lootGoal: 5,
    guards: 4,
    cameras: [
      { tx: 6, ty: 1, base: Math.PI / 2, sweep: 1.1 },
      { tx: 19, ty: 1, base: Math.PI / 2, sweep: 1.1 },
    ],
    patrols: [
      [[3, 3], [10, 3], [10, 11], [3, 11]],
      [[13, 7], [22, 7], [22, 12], [13, 12]],
      [[13, 3], [22, 3], [22, 6], [13, 6]],
      [[6, 12], [10, 12], [10, 8], [6, 8]],
    ],
    map: [
      '##########################',
      '#..L.....#......#....L...#',
      '#........#......#........#',
      '#..T..l..#..T...#..T.....#',
      '#........#......#....S...#',
      '#..L.....#......#........#',
      '#........#......#...T....#',
      '#..G.....#..G...#....G...#',
      '#........#......#........#',
      '#...T....#......#...L....#',
      '#........#......#........#',
      '#..L..l..#..T...#..T.....#',
      '#..P.....#......#....E...#',
      '#........#......#........#',
      '##########################',
    ],
  },
  {
    name: 'The Gallery',
    sub: 'White walls, wide sightlines. Stay behind the plinths.',
    lootGoal: 5,
    guards: 4,
    cameras: [
      { tx: 12, ty: 1, base: Math.PI / 2, sweep: 1.4 },
      { tx: 12, ty: 13, base: -Math.PI / 2, sweep: 1.4 },
    ],
    patrols: [
      [[2, 2], [12, 2], [12, 6], [2, 6]],
      [[14, 2], [23, 2], [23, 6], [14, 6]],
      [[2, 8], [12, 8], [12, 12], [2, 12]],
      [[14, 8], [23, 8], [23, 12], [14, 12]],
    ],
    map: [
      '##########################',
      '#........................#',
      '#..L...T......T....L.....#',
      '#........................#',
      '#....T......L......T.....#',
      '#........................#',
      '#..T.......T.......T.....#',
      '#............S...........#',
      '#........................#',
      '#..L...T......T....L.....#',
      '#........................#',
      '#....T......L......T.....#',
      '#........................#',
      '#..P.................E...#',
      '##########################',
    ],
  },
  {
    name: 'The Casino',
    sub: 'Neon, noise and cameras on every corner. Spend coins, not luck.',
    lootGoal: 6,
    guards: 5,
    cameras: [
      { tx: 4, ty: 1, base: Math.PI / 2, sweep: 1.0 },
      { tx: 13, ty: 1, base: Math.PI / 2, sweep: 1.0 },
      { tx: 21, ty: 1, base: Math.PI / 2, sweep: 1.0 },
    ],
    patrols: [
      [[3, 4], [8, 4], [8, 10], [3, 10]],
      [[10, 3], [16, 3], [16, 7], [10, 7]],
      [[18, 4], [23, 4], [23, 10], [18, 10]],
      [[6, 11], [12, 11], [12, 13], [6, 13]],
      [[15, 11], [21, 11], [21, 13], [15, 13]],
    ],
    map: [
      '##########################',
      '#..L...#....T....#...L...#',
      '#......#.........#.......#',
      '#..T...#....L....#...T...#',
      '#......#.........#.......#',
      '#..L.l.#....T....#.l.L...#',
      '#......#.........#.......#',
      '#......#....S....#.......#',
      '#..T...#.........#...T...#',
      '#......#....L....#.......#',
      '#......#.........#.......#',
      '#..L...#....T....#...L...#',
      '#..P...#.........#...E...#',
      '#......#.........#.......#',
      '##########################',
    ],
  },
  {
    name: 'The Grand Museum',
    sub: 'Five wings, five guards, one very expensive statue.',
    lootGoal: 6,
    guards: 5,
    cameras: [
      { tx: 6, ty: 1, base: Math.PI / 2, sweep: 1.2 },
      { tx: 13, ty: 7, base: 0, sweep: 1.2 },
      { tx: 19, ty: 13, base: -Math.PI / 2, sweep: 1.2 },
    ],
    patrols: [
      [[2, 3], [6, 3], [6, 11], [2, 11]],
      [[9, 2], [15, 2], [15, 6], [9, 6]],
      [[18, 3], [23, 3], [23, 8], [18, 8]],
      [[9, 9], [15, 9], [15, 12], [9, 12]],
      [[18, 10], [23, 10], [23, 13], [18, 13]],
    ],
    map: [
      '##########################',
      '#..L....#.......#....L...#',
      '#......#...T....#........#',
      '#..T...#.......#...T.....#',
      '#......#...L....#........#',
      '#..L...#........#....S...#',
      '#......#...T....#........#',
      '#......#........#........#',
      '#..T...#...L....#...T....#',
      '#......#........#........#',
      '#..L...#...T....#....L...#',
      '#......#........#........#',
      '#..P...#........#....E...#',
      '#......#........#........#',
      '##########################',
    ],
  },
  {
    name: 'The Midnight Vault',
    sub: 'The final job. The vault, the lasers, and everyone awake.',
    lootGoal: 7,
    guards: 6,
    cameras: [
      { tx: 3, ty: 1, base: Math.PI / 2, sweep: 1.0 },
      { tx: 12, ty: 1, base: Math.PI / 2, sweep: 1.3 },
      { tx: 21, ty: 1, base: Math.PI / 2, sweep: 1.0 },
      { tx: 12, ty: 13, base: -Math.PI / 2, sweep: 1.3 },
    ],
    patrols: [
      [[2, 2], [8, 2], [8, 6], [2, 6]],
      [[10, 2], [15, 2], [15, 5], [10, 5]],
      [[19, 2], [23, 2], [23, 6], [19, 6]],
      [[2, 8], [8, 8], [8, 12], [2, 12]],
      [[10, 9], [15, 9], [15, 12], [10, 12]],
      [[19, 8], [23, 8], [23, 12], [19, 12]],
    ],
    map: [
      '##########################',
      '#..L...#....V....#...L...#',
      '#......#.........#.......#',
      '#..T.l.#....T....#.l.T...#',
      '#......#.........#.......#',
      '#..L...#....L....#...S...#',
      '#......#.........#.......#',
      '#......#....T....#.......#',
      '#..T...#.........#...T...#',
      '#..L...#....L....#...L...#',
      '#......#.........#.......#',
      '#......#....T....#.......#',
      '#..P...#.........#...E...#',
      '#......#.........#.......#',
      '##########################',
    ],
  },
];
