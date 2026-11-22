[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/daviddika/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/daviddika/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

# The Velvet Heist

An original top-down stealth heist game. You are the thief: slip through six
jobs — the Jewel House, the Old Bank, the Gallery, the Casino, the Grand
Museum and the Midnight Vault — past patrolling guards and sweeping cameras,
time the blinking laser gates, crack the safes with a timing minigame, pocket
the loot, and reach the green exit before the alarm meter hits 100% and the
building locks down for a 25-second getaway.

Between jobs, spend crew coins in the shop on a lockpick kit, soft soles, a
hacker rig and a big bag. Scoring rewards stealth: GHOST, SHADOW or LOUD,
with a Ghost Run mode paying ×1.5. All art is drawn procedurally in code and
all sound is synthesized with WebAudio — no libraries, no network requests,
no build step.

## How to run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Controls

- **WASD / arrow keys** — move
- **Shift** — sneak (slower, harder to spot)
- **E** — use / crack a safe or the vault
- **Q or right-click** — toss a coin to distract a guard
- **F** — hack a nearby camera (limited hacks)
- **P** — pause, **M** — mute, **Enter / click** — menus

## Screenshots

- `1-play.jpg` — mid-heist: the thief crossing a room, guards with vision cones, a camera, loot and the alarm meter
- `2-vault.jpg` — cracking the vault on the final job
- `3-select.jpg` — job select with progress and the crew-upgrade shop
- `4-getaway.jpg` — lockdown getaway: alarm at 100%, guards converging, sprint for the exit

## Files

- `game/index.html` — the page
- `game/src/config.js` — tuning and the six job maps
- `game/src/world.js` — guards, cameras, lasers, safes, alarm and scoring
- `game/src/render.js` — canvas drawing, HUD, menus and shop
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesized WebAudio sound
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/random.js` — seeded random
- `game/src/main.js` — boot and the game loop
- `main.ts` — hands the game in to make.fun

Built for the make.fun bounty — https://make.fun/bounty/best-heist-game-20261122-0559
