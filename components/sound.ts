export function playDiceSound(natural: number) {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = natural === 20 ? 640 : natural === 1 ? 130 : 260 + natural * 9;
  gain.gain.setValueAtTime(0.045, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.24);
  osc.onended = () => void ctx.close();
}
