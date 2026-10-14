// Chapter 4: the battery. Watt-hours against hover power give the flight time, and extra weight
// costs both. Hover power comes from the momentum theory in js/quad.js.
import { THREE, M, canvasTexture, clamp } from '../kit.js';
import { makeQuad } from '../drone.js';
import { hover, USABLE, PROP_R } from '../quad.js';

// Three generic packs. Energy in watt-hours is volts × amp-hours. Pack masses are typical for
// lithium polymer cells at roughly 150–170 Wh/kg. The rest of the drone weighs 0.75 kg.
const BASE_KG = 0.75;
export const PACKS = {
  small: { label: '4S 3000 mAh', wh: 44.4, kg: 0.30 },
  mid: { label: '4S 5000 mAh', wh: 74.0, kg: 0.45 },
  big: { label: '6S 5000 mAh', wh: 111.0, kg: 0.65 },
};
const ORDER = ['small', 'mid', 'big'];
const COLS = { small: '#ffb547', mid: '#8ef0ff', big: '#ff7a59' };

// Flight minutes for a pack, with payload in kilograms.
export function minutes(pack, payload) {
  const m = BASE_KG + pack.kg + payload;
  return ((pack.wh * USABLE) / hover(m).pElec) * 60;
}

export default {
  id: 'battery',
  short: 'The battery',
  title: 'Battery and flight time',
  subtitle: 'Watt-hours against hover power: why extra weight cuts the flying time.',
  view: { pos: [8.4, 5.0, 9.6], target: [-0.6, 0.9, -0.6] },
  learn: `<p>A drone's battery stores <b>energy</b>, measured in <b>watt-hours</b> (Wh). A 4S pack of 5000 mAh at 14.8 V holds 5 × 14.8 = <b>74 Wh</b>. Power is volts times current (see <a href="https://glassbox.how/ohmslawclear/">OhmsLawClear</a>). A watt is one joule per second, so 74 Wh is enough to run a 74 W load for one hour, or a 148 W load for half an hour.</p>
    <p>Hovering is the drone's big bill. The rotors push air down, and the air pushes back. A 1.2 kg drone with 10-inch propellers needs about <b>110 W</b> to hover. That is an estimate from momentum theory: the air must be pushed down at a set speed, and the rotors are not perfect, so a real rotor turns only about 65% of its power into lift, and the motors and speed controllers waste a little more.</p>
    <p>So a <b>flight time</b> is about the usable energy divided by the hover power. Keep 20% in reserve, because a battery that is run flat can be damaged. With 74 Wh, about 59 Wh is usable, and at 110 W the flight takes about <b>32 minutes on paper</b>. Real flights are shorter, because wind, climbing and fast flying all cost more.</p>
    <p><b>Payload</b> hurts twice. Extra weight needs more thrust, so the rotors work harder, and the pack has to carry the extra mass itself. A payload of 0.3 kg takes the same drone from 32 to about 23 minutes.</p>
    <p><b>Lithium batteries</b> are safe when handled as the maker says. They burn when they are damaged, swollen, overheated, short-circuited, or charged unattended. Follow the maker's charging and storage instructions, keep packs away from heat, and never use a pack that is swollen or dented.</p>
    <p class="tip"><b>Try it:</b> slide the payload up to 0.5 kg and watch the 4S 5000 mAh curve drop. Then switch to the 6S pack and see how much a heavier battery helps or hurts.</p>`,
  terms: [
    { t: 'Watt-hour (Wh)', d: 'A unit of energy: one watt for one hour. Pack energy equals volts times amp-hours.' },
    { t: 'Hover power', d: 'The electrical power the drone draws to stay in the air without climbing or falling.' },
    { t: 'Payload', d: 'Anything carried on the drone beyond its own parts, such as a camera or a sprayer tank.' },
    { t: 'Reserve', d: 'Energy kept back in the pack so it is never run completely flat.' },
  ],
  defaults: { pack: 'mid', payload: 0 },
  controls: [
    { key: 'pack', type: 'seg', label: 'Battery', options: [{ v: 'small', label: '4S 3000' }, { v: 'mid', label: '4S 5000' }, { v: 'big', label: '6S 5000' }] },
    { key: 'payload', type: 'range', label: 'Payload', min: 0, max: 1, step: 0.05, ends: ['none', '1 kg'], fmt: (v) => v.toFixed(2) + ' kg' },
  ],
  quiz: [
    { q: 'How much energy is in a 4S 5000 mAh pack at 14.8 V?', options: ['5 Wh', '74 Wh', '740 Wh', '14.8 Wh'], answer: 1, why: 'Watt-hours are volts times amp-hours: 14.8 V × 5 Ah = 74 Wh.' },
    { q: 'Roughly what does extra payload do to flight time?', options: ['Nothing, the motors are strong enough', 'It shortens it, because more thrust and more battery mass are needed', 'It makes it longer', 'It only changes the colour of the lights'], answer: 1, why: 'More mass needs more thrust, which needs more power, and the pack itself adds weight.' },
    { q: 'What makes a lithium battery dangerous?', options: ['Being used normally in its maker’s range', 'Being damaged, swollen, overheated or charged unattended', 'Being stored at room temperature', 'Having a label on it'], answer: 1, why: 'Damage, heat, short circuits and unattended charging are the usual causes of battery fires. Follow the maker’s instructions.' },
  ],
  reel: [
    { ms: 6000, caption: 'A 74 watt-hour battery and about 110 watts of hover power give roughly half an hour of flight.', set: { pack: 'mid', payload: 0 }, anim: { payload: [0, 0.4] }, view: { pos: [4.8, 3.36, 5.52], target: [-0.6, 0.9, -0.6] }, spin: 0.4 },
  ],

  build({ stage }) {
    const q = makeQuad();
    stage.root.add(q.group);
    // The payload is a block on top of the plate; its size follows the slider.
    const payloadBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), M.plastic(0x4b5a7a, { roughness: 0.5 }));
    payloadBox.castShadow = true; stage.root.add(payloadBox);
    stage.label('Payload', [0.8, 0.5, 0], payloadBox, 'hot');
    stage.label('Battery: stored energy', [-1.8, -0.9, 0.7], q.battery);
    stage.label('Hover power', [-1.7, 1.1, -1.2], q.plate);

    // Chart: flight minutes against payload, one line per pack, with a marker for the choice.
    const W = 960, H = 540;
    const chart = canvasTexture(W, H, (g) => { g.fillStyle = 'rgba(7,8,12,0.88)'; g.fillRect(0, 0, W, H); });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6), new THREE.MeshBasicMaterial({ map: chart.tex, toneMapped: false }));
    let portraitNow = null;
    stage.root.add(board);

    let cur = { pack: 'mid', payload: 0.2 };
    const draw = () => {
      chart.redraw();
      const g = chart.canvas.getContext('2d');
      const x0 = 96, x1 = W - 40, y0 = 40, y1 = H - 64;
      const X = (p) => x0 + p * (x1 - x0), Y = (m) => y1 - (m / 40) * (y1 - y0);
      g.font = '24px sans-serif'; g.fillStyle = 'rgba(255,255,255,0.7)'; g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 2;
      [0, 10, 20, 30, 40].forEach((m) => { g.beginPath(); g.moveTo(x0, Y(m)); g.lineTo(x1, Y(m)); g.stroke(); g.fillText(m + ' min', 14, Y(m) + 8); });
      ['0 kg', '0.5 kg', '1 kg'].forEach((t, i) => g.fillText(t, X(i / 2) - 30, y1 + 40));
      ORDER.forEach((k) => {
        g.strokeStyle = COLS[k]; g.lineWidth = k === cur.pack ? 8 : 4; g.beginPath();
        for (let i = 0; i <= 40; i++) { const p = i / 40; const m = minutes(PACKS[k], p); i ? g.lineTo(X(p), Y(m)) : g.moveTo(X(p), Y(m)); }
        g.stroke();
        const lx = X(0.9), ly = Y(minutes(PACKS[k], 0.9));
        g.fillStyle = COLS[k]; g.fillText(PACKS[k].label, lx - 150, ly - 14);
      });
      // Marker at the current payload on the chosen pack.
      const mx = X(cur.payload), my = Y(minutes(PACKS[cur.pack], cur.payload));
      g.strokeStyle = 'rgba(255,255,255,0.4)'; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(mx, y0); g.lineTo(mx, y1); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(mx, my, 12, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillText('payload', x1 - 120, y1 + 40);
    };
    draw();

    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        // Phone and reel layouts: the top of the stage holds the readout, so the chart moves low and in front.
        const portrait = stage.camera.aspect < 1;
        if (portrait !== portraitNow) {
          portraitNow = portrait;
          if (portrait) { board.position.set(1.2, -0.9, 3.4); board.scale.setScalar(0.6); }
          else { board.position.set(0.6, 2.6, -4.4); board.scale.setScalar(1); }
        }
        const p = clamp(s.payload, 0, 1);
        const changed = s.pack !== cur.pack || p !== cur.payload;
        cur = { pack: s.pack, payload: p };
        const hgt = 0.25 + p * 0.5;                          // the block grows with the payload
        payloadBox.scale.set(1.0 + p * 0.6, hgt, 1.0 + p * 0.6);
        payloadBox.position.set(0, 0.7 + hgt / 2, 0);
        q.props.forEach((pr) => { pr.userData.spinner.rotation.y += pr.userData.dir * 0.12 * dt; });
        if (changed) draw();
      },
      readout(s) {
        const pk = PACKS[s.pack] || PACKS.mid, p = clamp(s.payload, 0, 1);
        const m = BASE_KG + pk.kg + p, h = hover(m);
        const min = minutes(pk, p);
        return `<div class="big">About ${Math.round(min)} minutes</div>
          <div class="row"><span>Pack energy</span><b>${pk.wh.toFixed(0)} Wh (${(pk.wh * USABLE).toFixed(0)} Wh usable)</b></div>
          <div class="row"><span>All-up weight</span><b>${m.toFixed(2)} kg</b></div>
          <div class="row"><span>Hover power</span><b>${Math.round(h.pElec)} W</b></div>
          <div class="row"><span>Rotor radius</span><b>${(PROP_R * 100).toFixed(1)} cm</b></div>`;
      },
    };
  },
};
