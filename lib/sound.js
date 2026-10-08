let ctx = null;
let enabled = false;
let lastHover = 0;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function blip(freq = 660, dur = 0.06, type = "sine", gain = 0.035) {
  if (!enabled) return;
  try {
    const c = ensureCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  } catch (e) {
    /* audio unavailable — ignore */
  }
}

export const sfx = {
  get on() {
    return enabled;
  },
  toggle() {
    enabled = !enabled;
    if (enabled) blip(880, 0.09, "sine", 0.05);
    return enabled;
  },
  hover() {
    const now = Date.now();
    if (now - lastHover < 70) return;
    lastHover = now;
    blip(660, 0.05, "sine", 0.025);
  },
  click() {
    blip(440, 0.06, "triangle", 0.045);
    setTimeout(() => blip(880, 0.05, "triangle", 0.035), 45);
  },
};