# Skyhook Run

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/nyaa-desu/makefun-flight-game-20261126/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/nyaa-desu/makefun-flight-game-20261126/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A bush-plane flight game for the make.fun **best-flight-game-20261126-0057**
bounty. Fly the Kestrel through a ring course over a coastal valley at
dusk — fields, a river, a little town, the sea to the east and mountains
to the west — then bring her home to Runway 27 before the fuel runs out.

## How to play

- **Pitch & roll:** arrow keys or WASD (or move the mouse to steer).
- **Throttle:** Shift to open up, Ctrl to pull back.
- **Camera:** C switches between the chase view and the cockpit, with its
  lit instruments — attitude ball, altimeter, airspeed, fuel and throttle.
- **Flaps:** F drops the flaps for a slower, steadier approach.
- **M** mutes, **P** pauses, **R** restarts, **1 / 2 / 3** pick a mission.

Fly through each gold ring to score — rings in a row build a combo, and
every ring tops the tanks up a little. Fly past a ring and it is missed,
the combo is lost. Finish the course, then land: slow, level and gentle
on the strip. A hard touchdown anywhere else is a crash, and an empty
tank ends the flight wherever you are.

## Missions

| Mission | Rings | Time | Wind | Points |
| --- | --- | --- | --- | --- |
| Ring Rally | 12 | 300 s | calm | x1 |
| Island Hop | 9 | 330 s | breeze | x1.4 |
| Storm Dash | 8 | 210 s | gusting crosswind | x2 |

Landing pays 500 points plus a bonus for fuel left and time to spare.

## Run it

Serve `game/` with any static HTTP server and open `game/index.html` in
desktop Chrome. Everything is plain Canvas 2D and WebAudio oscillators —
no libraries, no network requests, no files outside `game/`.

## Files

- `game/index.html` — the page; `game/src/main.js` starts the game.
- `game/src/config.js` — tuning, missions, palette.
- `game/src/random.js` — the seeded generator and value noise.
- `game/src/terrain.js` — the valley: heights, river, town, runway.
- `game/src/course.js` — the ring course for each mission.
- `game/src/flight.js` — the flight model: pitch, roll, lift, stall.
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — synthesized engine, wind and chimes.
- `game/src/render.js` — all canvas drawing: sky, terrain, cockpit, HUD.
- `game/src/shots.js` — deterministic demo flights for the screenshots.
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`.
