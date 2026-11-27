# Skyhook Run: fly the Kestrel through a river valley at dusk — 3 missions, 29 rings, gusting crosswind, fuel top-ups, stall model

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/nyaa-desu/makefun-flight-game-20261126/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/nyaa-desu/makefun-flight-game-20261126/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A bush-plane flight game for the make.fun **best-flight-game-20261126-0057** bounty ($500, top 50 share). Fly the Kestrel — a cream-and-amber bush plane with a red tail — down Kestrel Valley at dusk, through gold rings over the Alder River, past the lamps of Milltown, and land it on Runway 27 before the fuel or the clock runs out.

## The valley

- **Kestrel Valley** — a river valley at dusk: indigo sky, a low sun, amber haze on the horizon, rolling fields and pine forest.
- **Alder River** — winds the whole length of the valley; River Run's rings hang over the water.
- **Milltown** — the lit town on the west bank, 46 lamps, just before the runway. Milltown Tower's controller is **Mara Voss**, on the radio all the way down.
- **Runway 27** — a 420 m strip with edge lights, threshold bars and a centreline; land slow, level and gentle or the Kestrel is in the dirt.

## The three missions — 29 rings in all

| Mission | Rings | Time | Wind | Score | Character |
| --- | --- | --- | --- | --- | --- |
| **Ring Rally** | 12 | 300 s | calm | x1 | Weaves across the whole valley — the gentle way in |
| **River Run** | 9 | 330 s | breeze, gusts 6 m/s | x1.4 | Rings over the Alder River, low and fast |
| **Storm Dash** | 8 | 210 s | gusting, gusts 10 m/s | x2 | Wide, high rings in rain and crosswind |

## How it flies

- **Throttle** (Shift up, Ctrl down) sets the speed; **flaps** (F) lower the stall speed at the cost of drag.
- **Banked turns** — the heading follows the bank, slower at speed; **pitch** climbs and dives.
- **Stall model** — below 26 m/s (20 with flaps) the wing quits and the Kestrel sinks; a stall warning shouts on the HUD.
- **Fuel** — burns with throttle; every ring tops the tanks up +4%. A ring also adds 100 points times the mission multiplier, plus 10% per combo step.
- **Landing** — on the strip, under 38 m/s, level, descending under 4 m/s: +500, plus fuel and time bonuses and 50 per best combo. Anywhere else is a crash.

## Views and sound

- **Chase view** (default) and **cockpit view** (C): the cockpit has airspeed, altitude, fuel and throttle gauges, a compass strip and a yoke, all lit warm.
- **Synthesized sound only** — an engine hum that follows the throttle, wind that rises with speed, a chime per ring, a thud on landing. No audio files.
- **HUD** — mission and ring count, score, clock and fuel across the top; a side panel with the ground below, the nearest named places with distances, and Mara's radio log; controls and wind along the bottom.

## Controls

| Key | Action |
| --- | --- |
| ↑ / ↓ or W / S, mouse | Pitch |
| ← / → or A / D, mouse | Bank |
| Shift / Ctrl | Throttle up / down |
| F | Flaps |
| C | Chase / cockpit camera |
| P | Pause |
| M | Mute |
| 1 / 2 / 3 | Pick a mission |
| R | Fly again |
| Enter | Take off |

## Screenshots

1. **1-cover.jpg** — the final ring: the Kestrel on the approach to Runway 27, fuel at 18%, combo x6, "FINAL RING!" on screen, the river, Milltown's lamps and the runway in frame.
2. **2-storm.jpg** — Storm Dash in the rain, gusting crosswind, the next ring in the murk.
3. **3-cockpit.jpg** — River Run from the cockpit, the Alder below, gauges lit.
4. **4-end.jpg** — a perfect landing on Runway 27 with the full score breakdown.

Each shot is a real render of the game running in a desktop browser: open `game/index.html?shot=cover` (or `storm`, `cockpit`, `end`) at 1280×720 with `?seed=1`.

## Build

Node 22, standard library only. The game is plain static files under `game/` — no libraries, no network requests. `main.ts` copies `game/` and `screenshots/` into the output directory and writes `dossier.json` with the vendored make.fun library:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Run it twice into two directories: the outputs are byte-identical.

## License

MIT — see [LICENSE](LICENSE). SPDX: `MIT`.
