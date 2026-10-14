// Chapter 5: the rules. India's airspace zones under the Drone Rules, 2021, drawn as a stack
// over the ground, and the weight classes. Not to scale. The official text decides; the
// live airspace map on the Digital Sky platform is the thing to check before any flight.
import { THREE, M, arrow, clamp } from '../kit.js';
import { makeQuad } from '../drone.js';

const U = 30;                                     // one unit = 30 m in this chapter
const GREEN_TOP = 120 / U;                        // 400 ft (120 m): the top of the green zone
const NEAR_TOP = 60 / U;                          // 200 ft (60 m): the green ceiling near an airport
const YELLOW_TOP = 9;                             // the picture stops here; the yellow zone goes on
const RED_AT = [4.6, 0, -2.4];                        // a red zone sits on the ground, off to one side
const RAD = 4;

// Weight class by all-up weight, in kg (Drone Rules, 2021, as summarised by MoCA/PIB).
export function weightClass(kg) {
  if (kg <= 0.25) return 'Nano (250 g or less)';
  if (kg <= 2) return 'Micro (over 250 g to 2 kg)';
  if (kg <= 25) return 'Small (over 2 kg to 25 kg)';
  if (kg <= 150) return 'Medium (over 25 kg to 150 kg)';
  return 'Large (over 150 kg)';
}

export default {
  id: 'rules',
  short: 'The rules',
  title: 'Airspace and the rules',
  subtitle: 'India’s green, yellow and red zones, weight classes, and why the official map matters.',
  view: { pos: [13.2, 8.6, 14.8], target: [-3.6, 2.2, 0] },
  learn: `<p>India sorts its airspace for drones into three colours. These are set by the <b>Drone Rules, 2021</b>, made by the Ministry of Civil Aviation (MoCA) and run through the <b>Digital Sky</b> platform of the DGCA.</p>
    <p><b>Green zone:</b> the air from the ground up to <b>400 feet (120 m)</b> that is not red or yellow. No airspace permission is needed here for drones up to 500 kg. Near an operational airport, the green ceiling is lower: <b>200 feet (60 m)</b>, in the band 8 to 12 km from the airport.</p>
    <p><b>Yellow zone:</b> air above 400 feet in a green area, and the higher air near airports. Flying there needs permission from the air traffic control authority, such as the AAI, IAF, Navy or HAL.</p>
    <p><b>Red zone:</b> the no-drone zone, over land or territorial waters, which the Central Government controls. Drones fly there only with its permission.</p>
    <p><b>Weight classes</b> are set by the all-up weight, which includes the payload: nano up to 250 g, micro to 2 kg, small to 25 kg, medium to 150 kg, large above that. Some rules depend on the class: for example, nano drones and non-commercial micro drones need no remote pilot licence. The Digital Sky platform says which rules apply to yours.</p>
    <p><b>Registration:</b> a drone must be registered on Digital Sky and given a unique identification number, unless the Rules exempt it.</p>
    <p><b>Safety and privacy:</b> keep away from people, crowds and airports, and follow the zone rules, the height limit and any instructions from the authority. Recording people raises privacy questions that the law covers. Lithium battery safety follows the maker's and the official advice. Whatever the picture here shows, the official rules and the live airspace map are what count.</p>
    <p><b>For comparison, the FAA's Part 107</b> in the United States sets a 400 ft limit (14 CFR 107.51) and bars flying over people who are not involved in the flight, unless certain conditions are met (14 CFR 107.39).</p>
    <p class="tip"><b>Try it:</b> put the drone on open land at 100 m, then at 150 m. Then switch to near an airport and see the ceiling drop.</p>`,
  terms: [
    { t: 'Digital Sky', d: 'The DGCA’s online platform for registering drones and pilots and for viewing the airspace map.' },
    { t: 'All-up weight', d: 'The total weight of the drone, its battery and its payload, which decides its class.' },
    { t: 'Unique identification number', d: 'The number a registered drone is given on Digital Sky.' },
    { t: 'AGL', d: 'Above ground level: height measured from the ground below.' },
  ],
  defaults: { alt: 90, where: 'open', kg: 1.2 },
  controls: [
    { key: 'where', type: 'seg', label: 'Where you fly', options: [{ v: 'open', label: 'Open land' }, { v: 'airport', label: 'Near an airport' }, { v: 'red', label: 'Over a red zone' }] },
    { key: 'alt', type: 'range', label: 'Height above ground', min: 0, max: 300, step: 5, ends: ['ground', '300 m'], fmt: (v) => Math.round(v) + ' m (' + Math.round(v * 3.281) + ' ft)' },
    { key: 'kg', type: 'log', label: 'All-up weight', min: 0.1, max: 30, fmt: (v) => v.toFixed(v < 1 ? 2 : 1) + ' kg' },
  ],
  quiz: [
    { q: 'Under India’s Drone Rules, 2021, what is the green zone?', options: ['Airspace up to 400 feet that is not red or yellow', 'Airspace above 400 feet only', 'Airspace over the sea only', 'An airport runway'], answer: 0, why: 'The green zone is the air up to 400 feet (120 m) that has not been marked red or yellow.' },
    { q: 'Who gives permission to fly in a yellow zone?', options: ['Nobody, it is open', 'The air traffic control authority', 'The local police only', 'The drone manufacturer'], answer: 1, why: 'Yellow zones need permission from the concerned air traffic control authority, such as AAI, IAF, Navy or HAL.' },
    { q: 'What weight class is a drone of 1.2 kg all-up weight?', options: ['Nano', 'Micro', 'Small', 'Large'], answer: 1, why: 'Micro is over 250 g up to 2 kg, so 1.2 kg is micro.' },
  ],
  reel: [
    { ms: 5600, caption: 'In India, green airspace runs up to 400 feet. Above that, the yellow zone needs air traffic control permission.', set: { where: 'open', alt: 90, kg: 1.2 }, anim: { alt: [60, 150] }, view: { pos: [6.48, 6.04, 8.88], target: [-3.6, 2.2, 0] }, spin: 0.2 },
  ],

  build({ stage }) {
    const q = makeQuad();
    const drone = new THREE.Group(); drone.add(q.group); q.group.scale.setScalar(0.5);
    drone.position.set(0, 1, 0);
    stage.root.add(drone);

    // The stack: a green column (its top moves when you fly near an airport), a yellow shell above it.
    const greenGeo = new THREE.CylinderGeometry(RAD, RAD, 1, 64, 1, true);
    const green = new THREE.Mesh(greenGeo, M.ghost(0x2ecc71, 0.16));
    const greenCap = new THREE.Mesh(new THREE.CircleGeometry(RAD, 64), M.ghost(0x2ecc71, 0.28));
    greenCap.rotation.x = -Math.PI / 2;
    const yellowGeo = new THREE.CylinderGeometry(RAD, RAD, 1, 64, 1, true);
    const yellow = new THREE.Mesh(yellowGeo, M.ghost(0xffd24a, 0.14));
    const yellowTop = new THREE.Mesh(new THREE.CircleGeometry(RAD, 64), M.ghost(0xffd24a, 0.22));
    yellowTop.rotation.x = -Math.PI / 2;
    stage.root.add(green, greenCap, yellow, yellowTop);

    // The red zone on the ground, and the airport band as a ring on the ground (not to scale).
    const red = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.06, 48), M.ghost(0xff4d4d, 0.5));
    red.position.set(...RED_AT); stage.root.add(red);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.1, 8, 96), M.glow(0xffd24a));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.08; stage.root.add(ring);

    // Labels: the zones, and the ground marks.
    const zoneGreen = stage.label('Green: up to 400 ft (120 m)', null, stage.root, 'cool');
    zoneGreen.position.set(RAD + 0.3, GREEN_TOP * 0.6, 0);
    const zoneYellow = stage.label('Yellow: needs ATC permission', null, stage.root, 'warm');
    zoneYellow.position.set(RAD + 0.3, 6.5, 0);
    const zoneRed = stage.label('Red: no-drone zone', [0, 0.7, 0], red, 'hot');
    const zoneRing = stage.label('Airport band, 8 to 12 km (not to scale)', [0, 0.4, 0], ring);

    // A height marker that follows the slider.
    const marker = arrow(0xffffff, 0.2, 0.1, 0.03);
    marker.visible = false; stage.root.add(marker);

    let place = { x: 0, z: 0 };
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const near = s.where === 'airport';
        const greenTop = near ? NEAR_TOP : GREEN_TOP;
        green.scale.set(1, greenTop, 1); green.position.y = greenTop / 2;
        greenCap.position.y = greenTop;
        yellow.scale.set(1, YELLOW_TOP - greenTop, 1); yellow.position.y = greenTop + (YELLOW_TOP - greenTop) / 2;
        yellowTop.position.y = YELLOW_TOP;
        zoneGreen.position.y = greenTop * 0.6;
        zoneYellow.position.y = Math.max(greenTop + 0.4, 6.5);
        // Where the drone is: over the red zone, or in the middle of the open-land column.
        const tgt = s.where === 'red' ? { x: RED_AT[0], z: RED_AT[2] } : { x: 0, z: 0 };
        place.x += (tgt.x - place.x) * Math.min(1, dt * 4); place.z += (tgt.z - place.z) * Math.min(1, dt * 4);
        const h = clamp(s.alt, 0, 300) / U;
        drone.position.set(place.x, Math.max(0.6, h), place.z);
        q.props.forEach((pr) => { pr.userData.spinner.rotation.y += pr.userData.dir * 0.35 * dt; });
        zoneRed.visible = true;
      },
      readout(s) {
        const near = s.where === 'airport';
        const greenTop = near ? 60 : 120;
        const alt = clamp(s.alt, 0, 300);
        let zone;
        if (s.where === 'red') zone = `<b>Red zone.</b> Drones fly here only with permission from the Central Government.`;
        else if (alt <= greenTop) zone = `<b>Green zone</b> at ${Math.round(alt)} m. No airspace permission is needed for drones up to 500 kg.`;
        else zone = `<b>Yellow zone</b> at ${Math.round(alt)} m. Flying here needs permission from the air traffic control authority.`;
        const cls = weightClass(clamp(s.kg, 0.1, 30));
        return `<div class="big">${s.where === 'red' ? 'Red' : alt <= greenTop ? 'Green' : 'Yellow'} zone</div>
          <p>${zone}</p>
          <div class="row"><span>Weight class</span><b>${cls}</b></div>
          <div class="row"><span>Green ceiling here</span><b>${greenTop} m (${Math.round(greenTop * 3.281)} ft)</b></div>
          <p><small>Not to scale. Check the live map on Digital Sky before any flight.</small></p>`;
      },
    };
  },
};
