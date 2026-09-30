let context: AudioContext | undefined;
export function sound(kind: "alarm" | "vote" | "win") {
  try {
    context ??= new AudioContext();
    void context.resume();
    const now = context.currentTime;
    const notes =
      kind === "alarm"
        ? [660, 440, 660]
        : kind === "win"
          ? [440, 554, 659, 880]
          : [220, 110];
    notes.forEach((frequency, i) => {
      const oscillator = context!.createOscillator(),
        gain = context!.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.09, now + i * 0.12 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.15);
      oscillator.connect(gain);
      gain.connect(context!.destination);
      oscillator.start(now + i * 0.12);
      oscillator.stop(now + i * 0.12 + 0.16);
    });
  } catch {
    /* Audio is optional. */
  }
}
