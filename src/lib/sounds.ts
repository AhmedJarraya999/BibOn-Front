let ctx: AudioContext | null = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function beep(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.3) {
  try {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.connect(g);
    g.connect(c.destination);
    osc.frequency.value = freq;
    osc.type = type;
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration / 1000);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration / 1000);
  } catch {}
}

export const sounds = {
  success: () => beep(880, 120),
  error: () => { beep(220, 150); setTimeout(() => beep(180, 200), 160); },
  undo: () => beep(440, 80),
};
