// Chapter 6: what drones are for in India, and where they stop. Spraying, mapping and deliveries
// as the official schemes describe them. Figures are from PIB releases (read at source where noted).
import { THREE, M, canvasTexture, swarm, tube, clamp, approach } from '../kit.js';
import { makeQuad } from '../drone.js';

// A field, a lawnmower path over it, and the spray or the parcel under the drone.
const FIELD = 9;                                       // a 9-unit square field (1 unit = 10 m, so 90 m)
const ROWS = 6;

// The official figures, all from PIB (dated) unless the text says otherwise.
export const SCHEMES = [
  { name: 'Namo Drone Didi', line: 'Drones for women self-help groups: 15,000 drones over 2024-25 to 2025-26. Central aid covers 80% of the cost, up to Rs 8 lakh per drone (PIB, 4 Nov 2024).' },
  { name: 'Kisan Drone', line: 'Help to buy drones for spraying and mapping. Rates reported at the 2022 launch: 50% up to Rs 5 lakh for SC-ST, small and women farmers (press reports, not read at source).' },
  { name: 'SVAMITVA', line: 'Drones map inhabited village land for the property-card scheme of the Survey of India (PIB backgrounder, 28 Jan 2022).' },
  { name: 'ICMR vaccine pilot', line: 'Drones carried COVID-19 vaccines in a pilot in Manipur, Nagaland and the Andaman and Nicobar Islands (PIB backgrounder, 28 Jan 2022).' },
];

export default {
  id: 'uses',
  short: 'What they are for',
  title: 'What drones are for',
  subtitle: 'Spraying, mapping and deliveries, and the limits that come with them.',
  view: { pos: [12.6, 9.4, 13.8], target: [-1.2, 1.2, 0] },
  learn: `<p>Drones do jobs that are dull, dangerous or slow on foot. The official schemes in India use them for three main things: <b>mapping</b>, <b>spraying</b> and <b>carrying small loads</b>.</p>
    <p><b>Mapping:</b> a drone flies a set of straight, evenly spaced passes over a field or a village, the lawnmower pattern shown here. Its camera takes overlapping pictures, and the computer joins them into one accurate map. The SVAMITVA scheme maps inhabited village land this way.</p>
    <p><b>Spraying:</b> the drone flies low over a crop and sprays a liquid fertiliser or pesticide from its nozzles. It covers a field faster than a person with a backpack sprayer, and the operator stays further from the chemical. The government has issued operating procedures for it, and they must be followed.</p>
    <p><b>Small deliveries:</b> a drone can carry a light package a few kilometres, for example medicines or samples. The ICMR pilot carried vaccines to remote places. Payload is limited, and battery energy sets the range (chapter 4).</p>
    <p><b>The limits:</b> the flying time is short, the payload is small, and wind and rain stop a drone quickly. Batteries have to be charged and replaced. Every flight must follow the Drone Rules and the zone map (chapter 5), and must keep clear of people and airports.</p>
    <p class="tip"><b>Try it:</b> switch between mapping, spraying and delivery. Notice what the drone does, and what it has to fly over and avoid.</p>`,
  terms: [
    { t: 'Mapping', d: 'Flying a grid of overlapping pictures and joining them into an accurate map of the ground.' },
    { t: 'Swath', d: 'The width of ground a sprayer or a camera covers on one pass.' },
    { t: 'Payload', d: 'The weight the drone carries for its job, such as a tank or a parcel.' },
  ],
  defaults: { mode: 'map', t: 0 },
  controls: [
    { key: 'mode', type: 'seg', label: 'What it is doing', options: [{ v: 'map', label: 'Mapping' }, { v: 'spray', label: 'Spraying' }, { v: 'deliver', label: 'Delivery' }] },
  ],
  quiz: [
    { q: 'What is mapping by drone?', options: ['Flying blind over a field', 'Overlapping pictures from straight, evenly spaced passes, joined into a map', 'Measuring the wind only', 'Painting the ground'], answer: 1, why: 'Straight, evenly spaced passes give overlapping pictures, which software joins into one accurate map.' },
    { q: 'What is the main limit on how far a drone can deliver?', options: ['The colour of the propellers', 'The battery energy, which sets the flying time', 'The number of motors', 'The police'], answer: 1, why: 'Flying time comes from battery energy (chapter 4), so range and payload trade against each other.' },
    { q: 'What must every drone flight in India follow?', options: ['Only the manufacturer’s advice', 'The Drone Rules and the airspace zones', 'Nothing, if it is a small drone', 'Only the weather forecast'], answer: 1, why: 'The Drone Rules, 2021 and the zone map apply to all drones, and registration rules apply too.' },
  ],
  reel: [
    { ms: 5000, caption: 'Drones map villages, spray crops and carry small loads under official schemes in India.', set: { mode: 'map' }, view: { pos: [4.92, 4.12, 5.64], target: [0, 1.0, 0] }, spin: 0.3 },
    { ms: 5200, caption: 'Their limits are short flying time, small payloads, weather, and the rules on where they may fly.', set: { mode: 'spray' }, view: { pos: [4.92, 4.12, 5.64], target: [0, 1.0, 0] }, spin: 0.3 },
  ],

  build({ stage }) {
    // Field: a striped texture so the lawnmower path and the spray read clearly.
    const field = canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#4e6b34'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 24; i++) { g.fillStyle = i % 2 ? 'rgba(160,190,90,0.35)' : 'rgba(40,60,25,0.35)'; g.fillRect(0, (i * h) / 24, w, h / 24); }
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(FIELD, FIELD), new THREE.MeshStandardMaterial({ map: field.tex, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = 0.01; ground.receiveShadow = true; stage.root.add(ground);

    // The lawnmower path: straight passes joined at the ends.
    const path = [];
    for (let i = 0; i < ROWS; i++) {
      const z = -FIELD / 2 + 0.4 + (i * (FIELD - 0.8)) / (ROWS - 1);
      const a = i % 2 ? FIELD / 2 - 0.4 : -FIELD / 2 + 0.4;
      const b = i % 2 ? -FIELD / 2 + 0.4 : FIELD / 2 - 0.4;
      path.push(new THREE.Vector3(a, 0.25, z), new THREE.Vector3(b, 0.25, z));
    }
    const pathMesh = new THREE.Group();
    for (let i = 0; i < path.length - 1; i++) { pathMesh.add(tube([path[i], path[i + 1]], 0.05, M.glow(0x8ef0ff), false, 8)); }
    pathMesh.visible = false; stage.root.add(pathMesh);

    // Spray: droplets fall from under the drone.
    const drop = swarm(140, new THREE.SphereGeometry(0.07, 6, 4), M.glow(0xbfe7ff, { transparent: true, opacity: 0.7 }));
    drop.visible = false; stage.root.add(drop);
    const dropState = Array.from({ length: 140 }, (_, i) => ({ x: 0, z: 0, life: i / 140 }));

    // Delivery: a parcel on a cord under the drone.
    const parcel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), M.plastic(0xe9d7a8, { roughness: 0.6 }));
    parcel.castShadow = true; parcel.visible = false; stage.root.add(parcel);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), M.metal(0xcfd6e0));
    cord.visible = false; stage.root.add(cord);

    // The drone itself.
    const q = makeQuad();
    const drone = new THREE.Group(); drone.add(q.group); q.group.scale.setScalar(0.8);
    stage.root.add(drone);

    // Labels: the path, the spray (only while spraying), the parcel.
    let sprayLabel;
    stage.label('Lawnmower path', null, stage.root, 'cool').position.set(-FIELD / 2 - 0.4, 0.6, FIELD / 2 + 0.2);
    sprayLabel = stage.label('Spray: only on the crop', null, stage.root, 'warm'); sprayLabel.position.set(2.6, 2.6, 2.4);
    stage.label('Parcel on a cord', [0.6, 0.3, 0.5], parcel, 'hot');

    let mode = 'map', t = 0, spinT = 0;
    const SLOW = 0.04;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        mode = s.mode || 'map';
        const isMap = mode === 'map', isSpray = mode === 'spray', isDel = mode === 'deliver';
        pathMesh.visible = isMap; drop.visible = isSpray; parcel.visible = isDel; cord.visible = isDel; sprayLabel.visible = isSpray;
        t += dt * (isMap ? 0.22 : 0.05);
        // Where the drone is: along the path for mapping, over the field for the others.
        let x = 0, z = 0, y = 2.6;
        if (isMap) {
          const n = path.length - 1, u = ((t % n) + n) % n, k = Math.floor(u), f = u - k;
          const a = path[k], b = path[k + 1];
          x = a.x + (b.x - a.x) * f; z = a.z + (b.z - a.z) * f; y = 2.6;
        } else {
          x = Math.sin(t * 0.6) * 1.2; z = Math.cos(t * 0.4) * 1.0 - 0.6; y = isDel ? 2.8 : 2.2;
        }
        drone.position.set(x, y, z);
        // Drone yaw follows the direction it moves, so the drone looks like it is flying.
        drone.rotation.y = approach(drone.rotation.y, isMap ? Math.atan2(x, z) : 0, 3, dt);
        // Propellers.
        spinT += dt;
        q.props.forEach((p) => { p.userData.spinner.rotation.y += p.userData.dir * 60 * SLOW * dt; });
        // The spray: droplets fall from the drone onto the crop.
        if (isSpray) {
          dropState.forEach((d, i) => {
            d.life += dt * 0.6;
            if (d.life > 1) { d.life = 0; d.x = x + (Math.random() - 0.5) * 0.7; d.z = z + (Math.random() - 0.5) * 0.7; }
            const py = (y - 0.3) * (1 - d.life);            // falls from the nozzles to the crop
            drop.place(i, [d.x, Math.max(0.1, py), d.z], null, 1);
          });
          drop.done();
        }
        // The parcel: lowered on a cord, then the cord is shortened back.
        const lower = isDel ? 0.5 + 0.5 * Math.sin(spinT * 0.8) : 0;
        const py = y - 0.5 - 1.5 * lower;
        parcel.position.set(x, Math.max(0.35, py), z);
        cord.scale.y = Math.max(0.05, y - parcel.position.y - 0.3);
        cord.position.set(x, (y + parcel.position.y) / 2, z);
      },
      readout(s) {
        const m = s.mode || 'map';
        const T = {
          map: ['Mapping', 'Straight, evenly spaced passes. The camera overlaps its pictures, and software joins them into one map.'],
          spray: ['Spraying', 'Low over the crop, with only the approved liquid, following the official operating procedures.'],
          deliver: ['Small delivery', 'A light parcel on a cord, lowered and raised. Payload is small, and battery energy limits the distance (chapter 4).'],
        }[m] || ['Mapping', ''];
        const list = SCHEMES.map((sc) => `<p><b>${sc.name}.</b> ${sc.line}</p>`).join('');
        return `<div class="big">${T[0]}</div><p>${T[1]}</p>
          <div class="row"><span>Biggest limit</span><b>Flying time and payload</b></div>
          <details><summary>Official schemes (PIB)</summary>${list}</details>`;
      },
    };
  },
};
