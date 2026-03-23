export class Stopwatch {
  private startMs = 0;
  private running = false;
  private elapsedMs = 0;
  start() {
    if (this.running) return;
    this.running = true;
    this.startMs = Date.now();
  }
  stop() {
    if (!this.running) return;
    const now = Date.now();
    this.elapsedMs += now - this.startMs;
    this.running = false;
  }
  reset() {
    this.startMs = 0;
    this.running = false;
    this.elapsedMs = 0;
  }
  getElapsedMs() {
    if (!this.running) return this.elapsedMs;
    return this.elapsedMs + (Date.now() - this.startMs);
  }
  format() {
    const ms = this.getElapsedMs();
    const s = Math.floor(ms / 1000);
    const mNum = Math.floor(s / 60);
    const sNum = s % 60;
    const m = (mNum < 10 ? "0" : "") + String(mNum);
    const ss = (sNum < 10 ? "0" : "") + String(sNum);
    return `${m}:${ss}`;
  }
}
