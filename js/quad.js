// The physics behind DroneClear, kept free of 3D so every number can be checked.
// A small quadcopter, all-up 1.2 kg (frame, battery, camera and a little payload), on a
// 10-inch (254 mm) propeller, a 74 Wh battery and a 450 mm frame. Constants are estimates
// unless a line says it is a spec.

export const G = 9.81;                 // m/s²
export const RHO = 1.225;              // air density at sea level, kg/m³
export const MASS = 1.2;               // kg, all-up weight, a typical small drone with a light payload
export const PROP_R = 0.127;           // m, a 10-inch propeller (254 mm across)
export const PROP_DISC = Math.PI * PROP_R * PROP_R;  // m², the area one propeller sweeps
export const FM = 0.65;                // figure of merit: how close a real rotor gets to the ideal (typical 0.6–0.7)
export const DRIVE_ETA = 0.8;          // motor + speed controller, electrical to shaft (typical 0.75–0.85)
export const BATTERY_WH = 14.8 * 5.0;  // 4S (four cells in series), 5000 mAh at 14.8 V nominal = 74 Wh
export const USABLE = 0.8;             // keep 20% in reserve, a common rule for LiPo packs
export const HOVER_RPM = 4000;         // estimate: rotor speed that gives hover thrust with a 10-inch prop

// Momentum theory (ideal rotor): power to make thrust T with disc area A.
export function idealPower(T) { return Math.pow(T, 1.5) / Math.sqrt(2 * RHO * PROP_DISC); }

// Electrical power the whole drone draws to hover at mass m (kg), with an optional payload.
export function hover(m = MASS) {
  const T = (m * G) / 4;                          // thrust per rotor (N)
  const pShaft = idealPower(T) / FM;              // W at each rotor shaft
  const pElec = (4 * pShaft) / DRIVE_ETA;         // W from the battery
  return { T, pShaft, pElec };
}

// Flight time from the battery: usable watt-hours over the power being drawn.
export function flightMinutes(m = MASS, whFull = BATTERY_WH) {
  return ((whFull * USABLE) / hover(m).pElec) * 60;
}

// Tilting to move. Thrust T_tot = mg/cos θ keeps the height; the sideways part is T_tot sin θ.
export function tilt(deg) {
  const th = (deg * Math.PI) / 180;
  const perRotorN = (MASS * G) / (4 * Math.cos(th));
  return { a: G * Math.tan(th), rpmFactor: Math.sqrt(1 / Math.cos(th)), perRotorN };
}

// Climbing and descending: every rotor speeds up or slows down together.
// Thrust grows with the square of rotor speed, so rpm scales with the square root of thrust.
export function climb(frac) {
  const Tk = 1 + frac;                             // thrust relative to hover (frac from −0.4 to +0.4)
  return { a: G * frac, rpm: HOVER_RPM * Math.sqrt(Math.max(0, Tk)) };   // the extra thrust, net of weight, is m·a
}

// Turning (yaw). Two diagonal props spin one way (CCW), two the other (CW). Their reaction
// torque Q is roughly proportional to Ω², so speeding one pair up and the other down twists the frame.
const P_SHAFT_HOVER = hover().pShaft;             // W per rotor at hover
const OMEGA0 = (HOVER_RPM * 2 * Math.PI) / 60;   // rad/s
export const Q0 = P_SHAFT_HOVER / OMEGA0;         // N·m, reaction torque of one rotor at hover
export const IZ = 0.04;                           // kg·m², yaw inertia of the whole drone (estimate)
export function yaw(pct) {
  const x = pct / 100;
  // Pair A (CCW) at (1+x) speed, pair B (CW) at (1−x): net reaction torque = 2Q0[(1+x)²−(1−x)²] = 8Q0x.
  const tau = 8 * Q0 * x;
  return { tau, alpha: tau / IZ };
}


// --------------------------------------------------------------- the PID loop
// Roll axis of the drone (side-to-side tilt), as a single spinning body:
//   I θ'' = τ_motor + τ_wind − c θ'
// The flight controller reads the tilt θ and the gyroscope rate θ' many times a second and
// sets a torque: u = −(Kp·θ + Ki·∫θ dt + Kd·θ'). The motors take ~30 ms to follow (motor lag).
export const PLANT = {
  I: 0.03,            // kg·m², roll inertia (estimate for a 450 mm frame with a battery)
  damp: 0.02,         // N·m·s/rad, air and bearing drag
  lag: 0.03,          // s, how slowly the motors respond to a new command
  tauMax: 0.46,       // N·m, most torque the motors can make from a difference in speed
  bias: 0.05,         // N·m, a steady push from the wind or an off-centre battery
  gust: { t0: 2.0, t1: 2.8, tau: 0.25 },   // N·m, a gust that pushes for 0.8 s
};

export const PRESETS = {
  good:    { Kp: 2.5, Ki: 0.15, Kd: 0.35 },
  tooMuch: { Kp: 12, Ki: 0.15, Kd: 0.2 },
  tooLittle: { Kp: 0.3, Ki: 0.05, Kd: 0.1 },
};

export class PidRoll {
  constructor(gains) { this.set(gains); }
  set(g) { this.g = { ...g }; this.reset(); }
  reset() { this.t = 0; this.th = 0; this.w = 0; this.tm = 0; this.integ = 0; }
  // Advance by dt seconds, in small steps so the loop stays stable.
  advance(dt, wind = true) {
    dt = Math.max(0, Math.min(0.1, dt));
    const steps = Math.ceil(dt / 0.005) || 0, h = steps ? dt / steps : 0, P = PLANT, { Kp, Ki, Kd } = this.g;
    for (let i = 0; i < steps; i++) {
      let u = -(Kp * this.th + Ki * this.integ + Kd * this.w);
      if (Math.abs(u) < P.tauMax || Math.sign(this.th) !== Math.sign(u)) this.integ += this.th * h;  // stop winding up at the limit
      u = Math.max(-P.tauMax, Math.min(P.tauMax, u));
      if (Ki > 0) this.integ = Math.max(-P.tauMax / Ki, Math.min(P.tauMax / Ki, this.integ));
      this.tm += (u - this.tm) * (h / P.lag);
      let tw = wind ? P.bias : 0;
      if (wind && this.t >= P.gust.t0 && this.t <= P.gust.t1) tw += P.gust.tau * Math.sin((Math.PI * (this.t - P.gust.t0)) / (P.gust.t1 - P.gust.t0));
      const acc = (this.tm + tw - P.damp * this.w) / P.I;
      this.w += acc * h; this.th += this.w * h; this.t += h;
    }
    return this.th;
  }
}
