// Skyhook Run v2 — tuning, missions, palette, places and radio lines.
// Everything the rest of the game reads lives here, so a balance change
// is one number in one file, never a hunt through the renderer.

export const GAME_TITLE =
  'Skyhook Run: fly the Kestrel through a river valley at dusk — 3 missions, 29 rings, gusting crosswind, fuel top-ups, stall model';

export const VALLEY = {
  // The valley runs from z = 0 (the start line) to the runway at z = 2500.
  runwayStart: 2500,
  runwayEnd: 2920,
  runwayHalfWidth: 30,
  valleyHalfWidth: 420,
  // Milltown sits on the west bank of the Alder River, just before
  // the runway — its lamps are in frame on the final approach.
  townZ0: 1950,
  townZ1: 2300,
  townX0: -270,
  townX1: -60,
};

// The Alder River winds down the valley. Its centreline at depth z.
export function riverX(z) {
  return 95 * Math.sin(z * 0.0038) + 45 * Math.sin(z * 0.0013 + 1.7);
}

export const PLACES = [
  { name: 'Kestrel Valley', x: 0, z: 1200, blurb: 'home valley' },
  { name: 'Alder River', x: 0, z: 900, blurb: 'winding down the valley' },
  { name: 'Milltown', x: -165, z: 1580, blurb: 'lamps coming on' },
  { name: 'Alder Bridge', x: 0, z: 900, blurb: 'the old stone span' },
  { name: 'Heron Marsh', x: 130, z: 620, blurb: 'reeds and still water' },
  { name: 'Sunset Ridge', x: -380, z: 1500, blurb: 'the western wall' },
  { name: 'Runway 27', x: 0, z: 2710, blurb: 'bring her home' },
];

export const MISSIONS = [
  {
    name: 'Ring Rally',
    short: 'Rally',
    rings: 12,
    time: 300,
    windBase: 2,
    windGust: 2,
    multiplier: 1,
    seed: 11,
    brief: 'Shake down the valley at dusk — 12 rings, then land on 27.',
  },
  {
    name: 'River Run',
    short: 'River',
    rings: 9,
    time: 330,
    windBase: 6,
    windGust: 4,
    multiplier: 1.4,
    seed: 23,
    brief: 'Follow the Alder River to Milltown — 9 rings, breeze.',
  },
  {
    name: 'Storm Dash',
    short: 'Storm',
    rings: 8,
    time: 210,
    windBase: 11,
    windGust: 8,
    multiplier: 2,
    seed: 37,
    brief: 'Outrun the storm front — 8 rings, gusting crosswind.',
  },
];

export const TOTAL_RINGS = MISSIONS.reduce((n, m) => n + m.rings, 0); // 29

export const TUNE = {
  baseSpeed: 30, // m/s at idle throttle
  speedPerThrottle: 55, // m/s added at full throttle
  throttleRate: 0.55, // throttle units per second
  rollRate: 1.6, // rad/s toward the target bank
  maxBank: 0.95, // rad
  pitchRate: 1.1,
  maxPitch: 0.38, // rad
  turnFactor: 0.42, // heading change per banked second, scaled by speed
  climbFactor: 1.0,
  stallSpeed: 26, // m/s; below this the wing quits
  stallSpeedFlaps: 20,
  sinkRate: 14, // m/s of sink at a full stall
  fuelBurnIdle: 0.1, // percent per second
  fuelBurnThrottle: 0.22,
  fuelPerRing: 4, // percent topped up per ring
  ringRadius: 16, // metres; pass within 14 to score
  ringHitDistance: 14,
  ringScore: 100,
  landingBonus: 500,
  maxLandingSpeed: 38,
  maxLandingDescent: 4,
  cameraBack: 26, // metres behind the plane
  cameraUp: 7, // metres above the plane
  focal: 540, // projection focal length at 1280 wide
  drawDistance: 1250, // metres of terrain drawn ahead
};

// Dusk over Kestrel Valley: indigo sky, amber horizon, warm lamps.
export const PALETTE = {
  skyTop: '#191c38',
  skyMid: '#4b3463',
  skyLow: '#8a5570',
  horizon: '#e8905a',
  sun: '#ffb347',
  sunGlow: 'rgba(255, 154, 60, 0.55)',
  haze: 'rgba(232, 144, 90, 0.16)',
  fieldGreen: '#3e5a38',
  fieldAmber: '#8a6b38',
  fieldDark: '#33502f',
  forest: '#2a4430',
  river: '#5a7fa8',
  riverGlint: '#d88a4a',
  marsh: '#4a5a44',
  townGround: '#4a4038',
  lamp: '#ffd27a',
  lampGlow: 'rgba(255, 210, 122, 0.5)',
  runway: '#2e2e34',
  runwayMark: '#e8e8e8',
  runwayLight: '#7affc4',
  ring: '#ffc23d',
  ringGlow: 'rgba(255, 194, 61, 0.55)',
  finalRing: '#ff5a3c',
  planeCream: '#ddd6c4',
  planeAmber: '#e8a34a',
  planeRed: '#b04038',
  planeGlass: '#ffd27a',
  hudPanel: 'rgba(14, 16, 30, 0.74)',
  hudEdge: 'rgba(255, 179, 71, 0.55)',
  hudText: '#f2ead8',
  hudDim: '#b8a888',
  hudGood: '#7affc4',
  hudWarn: '#ff5a4a',
  hudAmber: '#ffb347',
};

// Mara Voss, Milltown Tower — one line per moment, never a paragraph.
export const RADIO = {
  takeoff: 'Kestrel, Milltown Tower — wind calm, runway 27 clear. Have a good flight.',
  ring3: 'Three rings down, Kestrel. You fly like you mean it.',
  ring6: 'Halfway there. The river looks lovely from up there, doesn’t it?',
  finalRing: 'Final ring ahead — bring her home to 27.',
  lowFuel: 'Fuel’s getting low, Kestrel — mind your throttle.',
  stall: 'You’re sinking — nose down, power up!',
  missed: 'Ring missed. Combo gone — shake it off, next one.',
  landed: 'Beautiful landing, Kestrel. Milltown Tower out.',
  crashed: 'Kestrel, come in… Milltown Tower calling.',
  storm: 'Storm front’s on you now, Kestrel — hold her steady.',
};
