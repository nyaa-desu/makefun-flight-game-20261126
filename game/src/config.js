// Skyhook Run — tuning, missions and palette.
// A bush-plane game: fly the Kestrel through a ring course over a coastal
// valley, then bring her home to Runway 27 before the fuel runs dry.

export const WORLD = {
  seed: 20261126,
  // Terrain spans this box; the runway sits near the origin.
  halfWidth: 3200,
  north: -6200,
  south: 3200,
  // The valley floor and the runway sit at this height.
  fieldHeight: 40,
  waterLevel: 2,
  // Sea to the east, mountains to the west and far north.
  coastX: 2300,
  mountainX: -2400,
  mountainZ: -5200,
};

export const PLANE = {
  name: 'Kestrel',
  // Arcade flight model, metres and seconds.
  minSpeed: 18,
  maxSpeed: 82,
  cruiseSpeed: 55,
  stallSpeed: 27,
  // How fast the nose follows the stick.
  pitchRate: 0.9,
  rollRate: 1.9,
  maxPitch: 0.55,
  maxRoll: 1.1,
  // Climb is capped so a slow climb cannot cheat the rings.
  maxClimb: 14,
  // Fuel: full tank lasts about four minutes at cruise throttle.
  fuelSeconds: 240,
  // Landing window: slow, level, gentle descent, on the strip.
  landMaxSpeed: 46,
  landMaxRoll: 0.28,
  landMaxSink: 7,
};

export const RUNWAY = {
  // Runway 27 runs north-south through the valley floor.
  centreX: 0,
  centreZ: 400,
  length: 900,
  width: 34,
  heading: 0, // 0 = north, the direction you land in
};

// Three missions, one valley, three different days of flying.
export const MISSIONS = [
  {
    id: 'rally',
    key: '1',
    name: 'Ring Rally',
    tag: 'The classic run',
    blurb: 'Twelve rings over the valley, then land on Runway 27.',
    rings: 12,
    wind: 0.0,
    gust: 0.0,
    timeLimit: 300,
    scoreMult: 1,
    ringFuel: 0.03,
  },
  {
    id: 'hop',
    key: '2',
    name: 'Island Hop',
    tag: 'Long legs, thin fuel',
    blurb: 'Nine wide rings out to the coast and back. Fuel is tight.',
    rings: 9,
    wind: 0.15,
    gust: 0.1,
    timeLimit: 330,
    scoreMult: 1.4,
    ringFuel: 0.015,
  },
  {
    id: 'storm',
    key: '3',
    name: 'Storm Dash',
    tag: 'Wind, rain, hurry',
    blurb: 'Eight tight rings in a gusting crosswind. Fast or nothing.',
    rings: 8,
    wind: 0.5,
    gust: 0.55,
    timeLimit: 210,
    scoreMult: 2,
    ringFuel: 0.02,
  },
];

export const RING = {
  radius: 26,
  // A ring counts when the plane passes within this of its centre.
  passRadius: 22,
  // Flying 160 m past a ring without passing it counts as a miss.
  missAhead: 160,
  points: 100,
};

export const SKY = {
  // One dusk palette for sky, terrain and instruments, so the game reads
  // as a single place rather than a set of coloured boxes.
  horizonTop: '#2e4a7a',
  horizonMid: '#e8a56b',
  horizonLow: '#f7d9a8',
  sun: '#ffd98a',
  waterDeep: '#1d4e6e',
  waterShallow: '#3f7d9c',
  sand: '#d9c08a',
  fieldA: '#7da95c',
  fieldB: '#93b95e',
  fieldC: '#b5a254',
  forest: '#3f6b34',
  rock: '#8a7f74',
  snow: '#e8eef2',
  runway: '#3a3f46',
  runwayMark: '#f2ead8',
};

export const VIEW = {
  width: 1280,
  height: 720,
  fov: 1.15, // radians, vertical
  chaseBack: 20,
  chaseUp: 7,
  cockpitUp: 1.4,
};
