// Chapter 3: moving. A quadcopter climbs, leans, and turns by changing rotor speeds only.
// Numbers come from js/quad.js: thrust per rotor, rotor speed and the yaw torque from the
// reaction of each pair of propellers.
import { THREE, M, arrow, clamp } from '../kit.js';
import { makeQuad, SPIN } from '../drone.js';
import { HOVER_RPM, MASS, G, tilt, climb, yaw, hover } from '../quad.js';

const TAU = Math.PI * 2;
const SLOW = 0.04;                              // propellers shown slower than they really turn

export default {
  id: 'moving',
  short: 'Moving',
  title: 'How a drone moves',
  subtitle: 'Lean to move, speed one pair to turn, speed all four to climb.',
  view: { pos: [7.4, 4.8, 8.4], target: [-0.9, 0.6, 0] },
  learn: `<p>A quadcopter's rotors cannot tilt. So all of its moves come from <b>speed differences</b>. Think of the four rotors as one team: change how fast they all turn and the machine climbs. Change how they share the work and it leans or turns.</p>
    <p><b>Climb</b> means speeding up all four together. Each rotor then pushes harder than its weight share, and the extra push, the net thrust, lifts the drone. Sinking is the reverse. The rotor speed rises with the square root of the thrust, so a 20% extra push needs about 10% more speed.</p>
    <p><b>Lean to move</b>: speed up the two rear rotors and slow the two front ones. The drone tips forward. The thrust now points a little forward as well as up. The sideways part pushes the drone along, and the flight controller keeps the total lift right so it does not fall.</p>
    <p><b>Turn</b> (yaw): every spinning propeller pushes the frame the other way, so a spinning rotor is trying to twist the drone. Two anticlockwise and two clockwise rotors cancel that out. (Each push has an equal and opposite reaction, see <a href="https://glassbox.how/newtonclear/">NewtonClear</a>.) Speed up one diagonal pair and slow the other, and the twist no longer cancels. The drone turns on the spot.</p>
    <p class="tip"><b>Try it:</b> set Climb to zero and Lean to 10°. Then add a turn. Watch which rotors speed up.</p>`,
  terms: [
    { t: 'Net thrust', d: 'The total upward push from the rotors minus the weight. Only the net part moves the drone up or down.' },
    { t: 'Yaw', d: 'Turning the drone left or right around its vertical axis.' },
    { t: 'Reaction torque', d: 'The twist a spinning propeller puts on the body that drives it. It is the third law of motion at work.' },
    { t: 'Pitch and roll', d: 'Tipping the drone forward or back (pitch), and sideways (roll).' },
  ],
  defaults: { climb: 0, lean: 0, turn: 0 },
  controls: [
    { key: 'climb', type: 'range', label: 'Climb or sink', min: -0.4, max: 0.4, step: 0.01, ends: ['sink', 'climb'], fmt: (v) => (v >= 0 ? '+' : '') + Math.round(v * 100) + '% thrust' },
    { key: 'lean', type: 'range', label: 'Lean forward', min: 0, max: 20, step: 0.5, ends: ['level', '20°'], fmt: (v) => v.toFixed(1) + '°' },
    { key: 'turn', type: 'range', label: 'Turn: pair speed difference', min: -10, max: 10, step: 0.5, ends: ['left', 'right'], fmt: (v) => (v > 0 ? '+' : '') + v.toFixed(1) + '%' },
  ],
  quiz: [
    { q: 'How does a quadcopter climb?', options: ['It tilts its rotors upwards', 'It speeds up all four rotors together', 'It switches off two rotors', 'It fills the battery with air'], answer: 1, why: 'Raising all four speeds raises the total thrust, so the net push lifts the drone.' },
    { q: 'If the two anticlockwise propellers speed up and the two clockwise ones stay the same, what happens?', options: ['Nothing', 'The drone turns (yaws)', 'The drone climbs only', 'The battery drains'], answer: 1, why: 'The two pairs no longer cancel their reaction torques, so the drone spins about its vertical axis.' },
    { q: 'How does a quadcopter move forward?', options: ['Its rotors swing forward', 'It leans forward, so some of its thrust pushes it along', 'It blows air out of the back', 'The wind carries it'], answer: 1, why: 'The rear rotors speed up, the drone tips, and the tilted thrust has a forward part.' },
  ],
  reel: [
    { ms: 5400, caption: 'To move forward, a quadcopter tips: the thrust leans, and the drone goes where it points.', set: { climb: 0, lean: 12, turn: 0 }, anim: { lean: [0, 12] }, view: { pos: [4.08, 3.12, 5.04], target: [-0.9, 0.6, 0] }, spin: 0.5 },
    { ms: 5400, caption: 'To turn, two diagonal rotors speed up while the other pair slows, so their twists no longer cancel.', set: { climb: 0, lean: 0, turn: 6 }, anim: { turn: [0, 6] }, view: { pos: [4.08, 3.12, 5.04], target: [-0.9, 0.6, 0] }, spin: 0.5 },
  ],

  build({ stage }) {
    const q = makeQuad();
    stage.root.add(q.group);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.06, 64), M.matte(0x1a1f2b));
    pad.position.y = -1.2; pad.receiveShadow = true; stage.root.add(pad);

    // Arrows show the net thrust, up or down, and the sideways push from the tilt.
    const up = arrow(0x8ef0ff, 1.5, 0.45, 0.1), down = arrow(0xff7a59, 1.5, 0.45, 0.1);
    up.position.set(0, 2.2, 0); down.position.set(0, 2.2, 0); down.rotation.z = Math.PI; down.visible = false;
    const fwd = arrow(0xffb547, 1.5, 0.45, 0.1);
    fwd.rotation.x = Math.PI / 2; fwd.position.set(0, 0.2, 0.6);
    stage.root.add(up, down, fwd);
    stage.label('Net lift', [0.6, 0.6, 0], up, 'hot');
    stage.label('Push forward', [0.5, 0, 0.4], fwd);

    // A ring that shows the turn: it lies flat round the drone and points the way it turns.
    const ringGeo = new THREE.TorusGeometry(2.6, 0.07, 8, 64, 1.9);
    const ring = new THREE.Mesh(ringGeo, M.glow(0xffb547));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; ring.visible = false;
    stage.root.add(ring);
    stage.label('Turn', [2.6, 0.2, 0.4], ring);

    // Labels on the two pairs of propellers.
    stage.label('Pair A: anticlockwise', [0, 1.4, 0], q.props[0], 'cool');
    stage.label('Pair B: clockwise', [0, 1.4, 0], q.props[1], 'warm');

    const rotor = (sign, i) => sign;
    let spinT = 0, yawAngle = 0, lastRpm = [HOVER_RPM, HOVER_RPM, HOVER_RPM, HOVER_RPM];
    let rpms = [HOVER_RPM, HOVER_RPM, HOVER_RPM, HOVER_RPM];
    let pitch = 0, yawVis = 0, climbVal = 0, turnVal = 0, climbA = 0, tiltA = 0, yawA = 0;

    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const c = clamp(s.climb, -0.4, 0.4), lean = clamp(s.lean, 0, 20), turn = clamp(s.turn, -10, 10);
        // Every rotor: the climb speed, times the extra speed the lean needs, plus the pair speed split.
        const base = climb(c).rpm * tilt(lean).rpmFactor;
        rpms = SPIN.map((sg) => base * (1 + (sg > 0 ? turn : -turn) / 100));
        const ww = rpms.map((r) => (r / 60) * TAU * SLOW);
        spinT += 1;
        q.props.forEach((p, i) => { p.userData.spinner.rotation.y += p.userData.dir * ww[i] * dt; });
        // Lean and yaw as seen on the drone.
        pitch += (lean * Math.PI / 180 - pitch) * Math.min(1, dt * 6);
        yawVis += turn * 0.06 * dt * 3;                    // yaw in the picture, sped up for the eye
        q.group.rotation.set(pitch, yawVis, 0);
        // Arrows.
        const cl = climb(c);
        const netA = cl.a;                                  // m/s² from the extra thrust
        const up1 = netA > 0.02, dn1 = netA < -0.02;
        up.visible = up1; down.visible = dn1;
        if (up1) up.set(0.3 + netA * 0.9);
        if (dn1) down.set(0.3 - netA * 0.9);
        const tl = tilt(lean);
        fwd.visible = lean > 0.25; fwd.set(0.3 + tl.a * 0.25);
        ring.visible = Math.abs(turn) > 0.25;
        ring.scale.y = turn < 0 ? -1 : 1;
        climbVal = netA; tiltA = tl.a; yawA = yaw(turn).alpha;
      },
      readout(s) {
        const c = clamp(s.climb, -0.4, 0.4), lean = clamp(s.lean, 0, 20), turn = clamp(s.turn, -10, 10);
        const cl = climb(c), tl = tilt(lean), ya = yaw(turn);
        const perRotor = hover(MASS).T * (1 + c) * (1 / Math.cos((lean * Math.PI) / 180));
        const A = Math.round(rpms[0] / 10) * 10, B = Math.round(rpms[1] / 10) * 10;
        const head = Math.abs(cl.a) < 0.02 ? 'Holding height' : `${cl.a > 0 ? 'Climbing' : 'Sinking'} at ${Math.abs(cl.a).toFixed(2)} m/s²`;
        return `<div class="big">${head}</div>
          <div class="row"><span>Thrust per rotor</span><b>${perRotor.toFixed(2)} N (weight share ${(MASS * G / 4).toFixed(2)} N)</b></div>
          <div class="row"><span>Pair A / pair B</span><b>${A.toLocaleString('en')} / ${B.toLocaleString('en')} rpm</b></div>
          <div class="row"><span>Sideways push from lean</span><b>${tl.a.toFixed(2)} m/s²</b></div>
          <div class="row"><span>Turning acceleration</span><b>${ya.alpha.toFixed(2)} rad/s²</b></div>`;
      },
    };
  },
};
