// Chapter 1: take a quadcopter apart.
import { THREE, M, approach, clamp } from '../kit.js';
import { makeQuad, SPIN, CCW, CW, ARM } from '../drone.js';
import { HOVER_RPM, hover, BATTERY_WH } from '../quad.js';

const TAU = Math.PI * 2;
const SLOW = 0.04;                             // the propellers are shown about 25 times slower than they really turn

export default {
  id: 'anatomy',
  short: 'Inside a drone',
  title: 'Inside a quadcopter',
  subtitle: 'Four motors and propellers, a flight controller, a battery and a GPS.',
  view: { pos: [9.6, 6.0, 10.4], target: [-2.0, -0.2, 0] },
  learn: `<p>A drone is a machine with <b>no swashplate</b> and no tail rotor. It has a frame, a few <b>arms</b>, and four <b>motors</b> at the arm ends. Each motor turns a <b>propeller</b>. Four is the usual number, so this is called a <b>quadcopter</b>.</p>
    <p>The propellers come in two colours in this model. Two turn <b>anticlockwise</b> and two turn <b>clockwise</b> when you look down on them. The pairs on each diagonal match, and that matters for yaw (chapter 3). A helicopter's tail rotor does a similar job, see <a href="https://glassbox.how/helicopterclear/">HelicopterClear</a>. The blades themselves work like a fan's, see <a href="https://glassbox.how/fanclear/">FanClear</a>.</p>
    <p>Each motor has its own <b>speed controller</b> (the amber board): a small electronic switch that turns the battery's current into a chosen speed. The <b>flight controller</b> is the brain. Its <b>gyroscope</b> measures how fast the drone is turning, and its <b>accelerometer</b> feels which way is down. A <b>barometer</b> reads air pressure to judge the height. The <b>GPS</b> puck on the mast gives the position.</p>
    <p>The <b>battery</b> is a pack of lithium polymer cells in series. A 4S pack has four cells, about 14.8 V nominal. It supplies all the power, and it is the heaviest part.</p>
    <p class="tip"><b>Try it:</b> take the drone apart, then turn the propellers on. Look at which colour turns which way.</p>`,
  terms: [
    { t: 'Quadcopter', d: 'A drone with four rotors, each on its own motor, that together lift and steer the machine.' },
    { t: 'Speed controller', d: 'An electronic switch that sets a motor’s speed by chopping the battery’s power very quickly.' },
    { t: 'Gyroscope', d: 'A sensor that measures how fast the drone is turning around each axis.' },
    { t: 'Accelerometer', d: 'A sensor that measures acceleration, including the pull of gravity, which shows which way is down.' },
    { t: 'Barometer', d: 'A sensor that reads air pressure, which falls as you climb, so it helps measure height.' },
  ],
  defaults: { explode: 0, spin: 0 },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'spin', type: 'seg', label: 'Propellers', options: [{ v: 0, label: 'Still' }, { v: 1, label: 'Hovering' }], fmt: (v) => (v ? HOVER_RPM.toLocaleString('en') + ' rpm (shown slow)' : 'Off') },
  ],
  quiz: [
    { q: 'Which part of a quadcopter measures how fast the drone is turning?', options: ['The gyroscope', 'The battery', 'The GPS puck', 'The propeller hub'], answer: 0, why: 'The gyroscope in the flight controller senses turning rates many times a second.' },
    { q: 'Why do two propellers turn clockwise and two anticlockwise?', options: ['It looks nicer', 'So that the spinning torques cancel out and the body does not spin', 'So the drone can fly backwards', 'Because the motors are different'], answer: 1, why: 'Each propeller pushes the body the opposite way to its spin. Equal numbers in each direction cancel, so the drone does not twist.' },
    { q: 'What does a speed controller do?', options: ['Sets how fast a motor turns', 'Charges the battery', 'Reads the GPS', 'Holds the propeller in place'], answer: 0, why: 'It switches the battery power on and off very quickly so the motor gets the speed the flight controller asks for.' },
  ],
  reel: [
    { ms: 5600, caption: 'A quadcopter has four motors, four propellers, a flight controller, a battery and a GPS.', set: { spin: 1, explode: 0 }, anim: { explode: [0, 1] }, view: { pos: [4.44, 3.88, 4.8], target: [0, 1.6, 0] }, spin: 0.5 },
  ],

  build({ stage }) {
    const q = makeQuad();
    stage.root.add(q.group);
    const B = q.body;

    // Each part moves outward by its offset when the drone comes apart.
    const home = new Map();
    const parts = [
      [q.plate, [0, 1.2, 0]],
      [q.fc, [0, 2.4, 0]],
      [q.gps, [0, 1.2, 2.2]],
      [q.battery, [0, -2.2, 0]],
      ...q.escs.map((e, i) => [e, [Math.sign(e.position.x) * 1.4, -0.4, Math.sign(e.position.z) * 1.4]]),
      ...q.motors.map((m, i) => [m, [0, 0.6, 0]]),
      ...q.props.map((p, i) => [p, [Math.sign(p.position.x) * 1.8, 2.4, Math.sign(p.position.z) * 1.8]]),
      ...q.arms.map((a, i) => [a, [0, 0.6, 0]]),
    ];
    parts.forEach(([obj]) => home.set(obj, obj.position.clone()));
    const place = (k) => {
      parts.forEach(([obj, off]) => obj.position.copy(home.get(obj)).addScaledVector(new THREE.Vector3(...off), k));
    };

    // Labels. Parts that come apart get labels that appear only once they are apart.
    const L = (text, obj, pos, cls = '') => stage.label(text, pos, obj, cls);
    L('Propellers, one pair each way', q.props[0], [0, 1.2, 0.5], 'hot');
    L('Motor', q.motors[0], [0.6, 0.6, 0.8]);
    L('Speed controller', q.escs[0], [0.4, -0.5, 1.1]);
    L('Flight controller', q.fc, [-0.5, 1.4, -0.9]);
    L('GPS puck', q.gps, [0.4, 1.9, 0.9]);
    const inside = [
      L('Battery: lithium polymer cells', q.battery, [-1.6, -0.6, -1.0]),
      L('Gyroscope and accelerometer', q.fc, [-0.7, 0.9, 0.5]),
      L('Barometer', q.fc, [0.8, 0.9, -0.9]),
      L('Arm', q.arms[2], [-1.3, 0.8, -1.3]),
    ];
    const outside = inside.length;

    let spin = 0, rpm = 0, omegas = [0, 0, 0, 0];
    const omega = (r) => (r / 60) * TAU;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const k = clamp(s.explode, 0, 1);
        place(k);
        inside.forEach((l) => { l.visible = k > 0.35; });
        const target = s.spin ? HOVER_RPM * SLOW : 0;
        rpm = approach(rpm, target, 1.4, dt);
        const w = omega(rpm);
        q.spin(dt, [w, w, w, w]);
        // The drone itself stays level here; the frame just comes apart.
        q.tilt(0, 0);
        omegas = [w, w, w, w];
      },
      readout(s) {
        const h = hover(1.2);
        return `<div class="big">About ${Math.round(h.pElec)} W to hover</div>
          <div class="row"><span>Propellers</span><b>4 × 10 inch</b></div>
          <div class="row"><span>Pairs</span><b>2 anticlockwise, 2 clockwise</b></div>
          <div class="row"><span>Battery</span><b>${(BATTERY_WH).toFixed(0)} Wh (4S, 5000 mAh)</b></div>`;
      },
    };
  },
};
