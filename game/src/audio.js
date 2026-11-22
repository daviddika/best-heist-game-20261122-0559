// All sound is synthesized with WebAudio: no audio files, no network.
// A quiet bass pulse runs under play; short tones mark pickups, cracks, coins
// and the alarm. M toggles mute.
export function createAudio() {
  let context = null;
  let muted = false;
  let padTimer = null;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, dur, type, gain, when = 0) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const start = ctx.currentTime + when;
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(amp);
      amp.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    } catch {
      // Audio is decoration: a failure here must never stop the game.
    }
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    pickup() {
      tone(880, 0.12, 'sine', 0.12);
      tone(1318, 0.16, 'sine', 0.09, 0.07);
    },
    coin() {
      tone(1568, 0.09, 'triangle', 0.1);
      tone(1046, 0.12, 'triangle', 0.08, 0.06);
    },
    crackTick() {
      tone(220, 0.05, 'square', 0.05);
    },
    crackWin() {
      tone(523, 0.14, 'sine', 0.12);
      tone(659, 0.14, 'sine', 0.12, 0.09);
      tone(784, 0.22, 'sine', 0.12, 0.18);
    },
    hack() {
      tone(440, 0.08, 'sawtooth', 0.05);
      tone(660, 0.08, 'sawtooth', 0.05, 0.08);
      tone(880, 0.14, 'sawtooth', 0.05, 0.16);
    },
    spotted() {
      tone(196, 0.3, 'sawtooth', 0.1);
      tone(147, 0.35, 'sawtooth', 0.1, 0.12);
    },
    caught() {
      tone(110, 0.5, 'sawtooth', 0.14);
      tone(82, 0.7, 'sawtooth', 0.14, 0.2);
    },
    win() {
      [523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.2, 'sine', 0.11, i * 0.11));
    },
    startPad() {
      if (padTimer !== null || muted) return;
      padTimer = window.setInterval(() => {
        if (!muted) tone(55, 1.4, 'sine', 0.035);
      }, 1500);
    },
    stopPad() {
      if (padTimer !== null) {
        window.clearInterval(padTimer);
        padTimer = null;
      }
    },
  };
}
