// The quadcopter model shared by DroneClear's chapters: a generic frame with four arms, four
// motors and speed controllers, two colours of propeller (one pair turns one way, the other
// pair the other way), a flight controller, a battery, and a GPS puck.
// 1 unit = 10 cm, so the propellers are 2.54 units across (a 254 mm prop).
import { THREE, M, beam, box } from './kit.js';
import { PROP_R } from './quad.js';

export const ARM = 2.2;                  // motor offset on x and z from the centre, in units (22 cm)
export const PROP_U = PROP_R * 10;       // propeller radius in units (1.27)
export const MOTOR_POS = [[ARM, ARM], [-ARM, ARM], [-ARM, -ARM], [ARM, -ARM]];
// Spin around +Y, seen from above: +1 is anticlockwise, −1 clockwise. Diagonal pairs match.
export const SPIN = [+1, -1, +1, -1];
export const CCW = 0x8ef0ff, CW = 0xffb08a;   // generic colours for each direction

// A two-blade propeller lying flat (axis +Y). Blades are thin, slightly pitched plates.
export function makeProp(color, dir) {
  const g = new THREE.Group(), spinner = new THREE.Group();
  const mat = M.plastic(color, { transparent: true, opacity: 0.88, side: THREE.DoubleSide, roughness: 0.35 });
  const s = new THREE.Shape();
  s.moveTo(0.22, -0.13);
  s.quadraticCurveTo(0.85, -0.2, PROP_U, -0.035);
  s.lineTo(PROP_U, 0.035);
  s.quadraticCurveTo(0.85, 0.16, 0.22, 0.13);
  s.closePath();
  const geo = new THREE.ShapeGeometry(s, 12);
  geo.rotateX(-Math.PI / 2 + 0.12);     // lie in the plane of rotation, with a little pitch
  for (const a of [0, Math.PI]) {
    const b = new THREE.Mesh(geo, mat); b.rotation.y = a; b.castShadow = true; spinner.add(b);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 20), M.plastic(0x2a3040));
  hub.position.y = 0.05; spinner.add(hub);
  g.add(spinner);
  g.userData.dir = dir;
  g.userData.spinner = spinner;
  return g;
}

// The whole drone. Returns the group and the named parts, so chapters can explode it,
// label it, tilt it and spin the propellers.
export function makeQuad() {
  const root = new THREE.Group();          // this is what chapters move and tilt
  const body = new THREE.Group();          // everything that stays with the frame
  root.add(body);

  const frameMat = M.plastic(0x3b4352, { roughness: 0.55 });
  const armMat = M.metal(0x9aa3b2, { roughness: 0.4 });
  const dark = M.plastic(0x2a3040);

  // Centre plate and the four arms (an X frame).
  const plate = box(2.6, 0.3, 2.6, frameMat); plate.position.y = 0.35;
  body.add(plate);
  const arms = [];
  for (const [x, z] of MOTOR_POS) {
    const a = beam([0, 0.22, 0], [x, 0.22, z], 0.17, armMat, 16);
    body.add(a); arms.push(a);
  }

  // Flight controller: a board with a gyroscope and accelerometer chip, and a barometer.
  const fc = new THREE.Group(); fc.position.set(0, 0.62, 0); body.add(fc);
  const board = box(1.2, 0.12, 1.2, M.plastic(0x2e7d4f, { roughness: 0.6 })); fc.add(board);
  const chip = box(0.34, 0.12, 0.34, dark); chip.position.set(-0.22, 0.12, 0.12); fc.add(chip);
  const baro = box(0.2, 0.12, 0.2, M.plastic(0xe9edf3)); baro.position.set(0.3, 0.12, -0.28); fc.add(baro);

  // Battery under the plate (generic pack, cells in a row).
  const battery = new THREE.Group(); battery.position.set(0, -0.55, 0); body.add(battery);
  const pack = box(2.6, 0.7, 1.3, M.plastic(0x39425a, { roughness: 0.5 })); battery.add(pack);
  for (const z of [-0.36, 0, 0.36]) { const c = box(2.5, 0.72, 0.08, M.plastic(0x1a1f2b)); c.position.set(0, 0, z); battery.add(c); }
  const lead = beam([1.0, 0.0, 0.5], [1.0, 0.45, 0.5], 0.05, M.plastic(0xc0392b), 8); battery.add(lead);

  // GPS receiver on a short mast at the back, with a barometer inside the flight controller.
  const gps = new THREE.Group(); gps.position.set(0, 0.72, 0.95); body.add(gps);
  const mast = beam([0, 0, 0], [0, 1.2, 0], 0.05, armMat, 10); gps.add(mast);
  const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.18, 36), M.plastic(0xeef2f7));
  puck.position.y = 1.3; puck.castShadow = true; gps.add(puck);

  // Motors, speed controllers and propellers.
  const motors = [], escs = [], props = [], propTags = [];
  MOTOR_POS.forEach(([x, z], i) => {
    const m = new THREE.Group(); m.position.set(x, 0.25, z); body.add(m);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.62, 32), M.metal(0x2a3040, { roughness: 0.35 }));
    bell.position.y = 0.2; bell.castShadow = true; m.add(bell);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 12), M.metal(0xcfd6e0));
    shaft.position.y = 0.72; m.add(shaft);
    motors.push(m);

    const e = box(0.62, 0.16, 0.8, M.plastic(0xd9a441, { roughness: 0.5 }));
    e.position.set(x * 0.5, 0.05, z * 0.5); body.add(e); escs.push(e);

    const color = SPIN[i] > 0 ? CCW : CW;
    const p = makeProp(color, SPIN[i]);
    p.position.set(x, 1.0, z);
    body.add(p); props.push(p);
    // A tag that sits on the propeller's axis but doesn't spin, so labels stay readable.
    const tag = new THREE.Group(); tag.position.set(x, 1.0, z); body.add(tag); propTags.push(tag);
  });

  return {
    group: root, body, plate, arms, fc, board, battery, pack, gps, puck, motors, escs, props, propTags,
    // Spin the propellers. omega is radians per second for each one (signs come from SPIN).
    spin(dt, omegas) {
      props.forEach((p, i) => { p.userData.spinner.rotation.y += p.userData.dir * omegas[i] * dt; });
    },
    // Tilt the whole machine. Positive pitch leans the nose down (forward), positive roll leans right.
    tilt(pitch, roll) { root.rotation.set(pitch, 0, roll); },
  };
}

