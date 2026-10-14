// Chapter 2: the feedback loop. A flight controller keeps the drone level with a PID loop.
// The physics and the loop are in js/quad.js (PidRoll); this file draws it live.
import { THREE, M, canvasTexture, arrow, clamp } from '../kit.js';
import { makeQuad } from '../drone.js';
import { PidRoll, PRESETS, PLANT } from '../quad.js';

const WINDOW = 12;                             // seconds shown on the chart
const RAD = 180 / Math.PI;
const same = (a, b) => a.Kp === b.Kp && a.Ki === b.Ki && a.Kd === b.Kd;

export default {
  id: 'feedback',
  short: 'Keeping level',
  title: 'The feedback loop',
  subtitle: 'A PID controller fights a gust, live: too much gain wobbles, too little sags.',
  view: { pos: [7.4, 4.4, 9.2], target: [-1.0, 1.5, -0.6] },
  learn: `<p>A drone cannot stay level by itself. A gust shoves it over, and it keeps going unless something pushes back. So the flight controller runs a <b>feedback loop</b>. It measures the tilt, decides how hard to push back, and then changes the motor speeds. It does this hundreds of times a second.</p>
    <p>The decision uses three terms, the <b>PID</b> controller. The <b>P</b> stands for <b>proportional</b>: the further the drone leans, the harder it pushes back. The <b>I</b> is <b>integral</b>: it adds up the tilt over time, so a steady push such as a side wind, which P alone never fully cancels, gets corrected in the end. The <b>D</b> is <b>derivative</b>: it looks at how fast the tilt is changing and pushes against that speed, which acts like a brake.</p>
    <p>Turn P up too far and the drone snaps back so hard it overshoots, then overshoots the other way, and wobbles. The brake D is too weak to stop the swinging. Turn P down and the drone is sloppy: it sags for a long time before it comes back. The three dials have to be balanced, and that is called <b>tuning</b>.</p>
    <p class="tip"><b>Try it:</b> pick "Too much P" and watch the wobble on the chart. Then raise Kd to damp it.</p>`,
  terms: [
    { t: 'Feedback loop', d: 'A system that measures what it is doing, compares it with what it should do, and corrects it.' },
    { t: 'Gain', d: 'How strongly a controller reacts. Higher gain means a bigger push for the same error.' },
    { t: 'Overshoot', d: 'Going past the target and having to come back, which can repeat as a wobble.' },
    { t: 'Gyroscope rate', d: 'How fast the tilt is changing, measured directly by the gyroscope.' },
  ],
  defaults: { preset: 'good', Kp: PRESETS.good.Kp, Ki: PRESETS.good.Ki, Kd: PRESETS.good.Kd },
  // Choosing a preset sets the three dials. Moving a dial by hand means your own settings.
  onChange(s, key) {
    if (key === null || key === 'preset') Object.assign(s, PRESETS[s.preset] || PRESETS.good);
    else if (key === 'Kp' || key === 'Ki' || key === 'Kd') s.preset = 'custom';
  },
  controls: [
    { key: 'preset', type: 'seg', label: 'Set the dials', options: [{ v: 'good', label: 'Well tuned' }, { v: 'tooMuch', label: 'Too much P' }, { v: 'tooLittle', label: 'Too little P' }] },
    { key: 'Kp', type: 'range', label: 'P: push back now', min: 0, max: 14, step: 0.05, fmt: (v) => v.toFixed(2) },
    { key: 'Ki', type: 'range', label: 'I: fix a steady lean', min: 0, max: 2, step: 0.01, fmt: (v) => v.toFixed(2) },
    { key: 'Kd', type: 'range', label: 'D: brake on the swing', min: 0, max: 1.5, step: 0.01, fmt: (v) => v.toFixed(2) },
    { key: 'replay', type: 'buttons', label: 'The wind', items: [{ label: 'Replay the gust', act: (s, inst) => inst.restart() }] },
  ],
  quiz: [
    { q: 'In a PID loop, what does the D (derivative) term do?', options: ['It adds up past errors', 'It pushes harder the further the drone leans', 'It brakes against how fast the tilt is changing', 'It sets the motor speed directly'], answer: 2, why: 'D reacts to the rate of change of the tilt, so it acts like a brake and reduces overshoot.' },
    { q: 'Why does a PID controller need the I term?', options: ['To make the motors louder', 'To remove a steady lean that P alone never fully cancels', 'To save battery', 'To read the GPS'], answer: 1, why: 'With only P, a steady side wind leaves a small permanent lean. The I term adds up the error over time until it is gone.' },
    { q: 'What happens when the P gain is far too high?', options: ['The drone becomes very sloppy', 'The drone overshoots and wobbles', 'Nothing changes', 'The battery drains faster only'], answer: 1, why: 'A very high P makes the correction overshoot. Without enough D to brake it, the drone keeps swinging.' },
  ],
  reel: [
    { ms: 6200, caption: 'A gust tips the drone. Its controller senses the tilt and speeds two motors up or down to push back.', set: { preset: 'good' }, view: { pos: [3.8, 3.02, 4.68], target: [0.2, 1.7, -0.6] }, spin: 0 },
    { ms: 6200, caption: 'Too much proportional gain makes it overshoot and wobble, because nothing damps the swing.', set: { preset: 'tooMuch' }, spin: 0 },
  ],

  build({ stage }) {
    const q = makeQuad();
    stage.root.add(q.group);
    // Small lights and the pad under the drone make the tilt easy to read.
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 0.06, 64), M.matte(0x1a1f2b));
    pad.position.y = -1.2; pad.receiveShadow = true; stage.root.add(pad);

    // The chart: tilt against time, on a board behind the drone.
    const W = 960, H = 540;
    const chart = canvasTexture(W, H, (g) => { g.fillStyle = 'rgba(7,8,12,0.88)'; g.fillRect(0, 0, W, H); });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 3.7), new THREE.MeshBasicMaterial({ map: chart.tex, toneMapped: false }));
    let portraitNow = null;
    stage.root.add(board);

    // Wind: an arrow that shows the gust while it blows.
    const wind = arrow(0xffb547, 2.6, 0.5, 0.09);
    wind.rotation.z = -Math.PI / 2;
    wind.position.set(-3.2, 1.2, 0);
    stage.root.add(wind);
    const steady = arrow(0x7aa2ff, 1.2, 0.35, 0.07);
    steady.rotation.z = -Math.PI / 2; steady.position.set(-4.4, 0.9, 1.0);
    stage.root.add(steady);

    stage.label('Gust', [0, 1.6, 0], wind, 'hot');
    stage.label('Steady side wind', [0, 0.8, 0], steady);
    stage.label('Gyroscope and motors', [0.9, 1.0, 1.0], q.fc);

    let sim = new PidRoll(PRESETS.good), gains = { ...PRESETS.good }, hist = [], maxAfter = 0, motorFrac = 0;
    const restart = () => { sim.reset(); hist = []; maxAfter = 0; };

    const draw = () => {
      chart.redraw();
      const g = chart.canvas.getContext('2d');
      const x0 = 90, x1 = W - 40, y0 = 46, y1 = H - 60, now = sim.t;
      const tx = (t) => x0 + ((t - (now - WINDOW)) / WINDOW) * (x1 - x0);
      const ty = (deg) => (y0 + y1) / 2 - (deg / 45) * ((y1 - y0) / 2);
      // Gust window in orange.
      const ga = PLANT.gust.t0, gb = PLANT.gust.t1;
      g.fillStyle = 'rgba(255,181,71,0.16)';
      if (gb > now - WINDOW && ga < now) g.fillRect(Math.max(x0, tx(ga)), y0, Math.min(x1, tx(gb)) - Math.max(x0, tx(ga)), y1 - y0);
      g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 2; g.font = '24px sans-serif'; g.fillStyle = 'rgba(255,255,255,0.7)';
      [-30, -15, 0, 15, 30].forEach((d) => { g.beginPath(); g.moveTo(x0, ty(d)); g.lineTo(x1, ty(d)); g.stroke(); g.fillText(d + '°', 18, ty(d) + 8); });
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.setLineDash([10, 10]); g.beginPath(); g.moveTo(x0, ty(0)); g.lineTo(x1, ty(0)); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillText('tilt', x0, 36); g.fillText('last 12 s', x1 - 120, y1 + 40);
      // The tilt line.
      g.strokeStyle = '#8ef0ff'; g.lineWidth = 6; g.beginPath();
      hist.forEach(([t, d], i) => { const X = tx(t), Y = ty(clamp(d, -45, 45)); i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
      g.stroke();
    };
    draw();

    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        // Phone and reel layouts: the top of the stage holds the readout, so the chart moves low and in front.
        const portrait = stage.camera.aspect < 1;
        if (portrait !== portraitNow) {
          portraitNow = portrait;
          if (portrait) { board.position.set(1.2, -0.9, 3.4); board.scale.setScalar(0.55); }
          else { board.position.set(1.4, 1.9, -4.6); board.scale.setScalar(0.9); }
        }
        const want = { Kp: s.Kp, Ki: s.Ki, Kd: s.Kd };
        if (!same(want, gains)) { gains = want; sim.set(want); hist = []; maxAfter = 0; }
        sim.advance(dt);
        const deg = sim.th * RAD;
        hist.push([sim.t, deg]);
        while (hist.length && hist[0][0] < sim.t - WINDOW) hist.shift();
        if (sim.t > PLANT.gust.t0) maxAfter = Math.max(maxAfter, Math.abs(deg));
        q.tilt(0, -sim.th);                           // roll: the top leans the way the tilt goes
        // The wind arrow appears during the gust, and the steady side wind is always there.
        const gusting = sim.t >= PLANT.gust.t0 && sim.t <= PLANT.gust.t1;
        wind.visible = gusting;
        if (gusting) wind.set(1.4 + 1.6 * Math.sin((Math.PI * (sim.t - PLANT.gust.t0)) / (PLANT.gust.t1 - PLANT.gust.t0)));
        draw();
        motorFrac = sim.tm / PLANT.tauMax;
      },
      restart,
      readout(s) {
        const deg = (sim.th * RAD).toFixed(1);
        const push = Math.round(Math.abs(motorFrac) * 100);
        const verdict = s.preset === 'good' ? 'Settles in about 2 seconds.'
          : s.preset === 'tooMuch' ? 'It never settles: P is too strong for the damping.'
            : s.preset === 'tooLittle' ? 'It sags for a long time before it comes back.' : 'Your own settings.';
        return `<div class="big">Tilt now: ${deg}°</div>
          <div class="row"><span>Biggest tilt after the gust</span><b>${maxAfter.toFixed(1)}°</b></div>
          <div class="row"><span>Motor push now</span><b>${push}% of the most it can do</b></div>
          <div class="row"><span>P / I / D</span><b>${s.Kp.toFixed(2)} / ${s.Ki.toFixed(2)} / ${s.Kd.toFixed(2)}</b></div>
          <p>${verdict}</p>`;
      },
      dispose() { chart.tex.dispose(); },
    };
  },
};
