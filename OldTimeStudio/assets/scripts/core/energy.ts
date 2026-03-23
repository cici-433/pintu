type EnergyState = {
  remaining: number;
  date: string;
  lastRecoverAt: number | null;
};

export class EnergyManager {
  private key = "oldtime_energy_v2";
  private max = 100;
  private intervalMs = 10 * 60 * 1000;
  private storage: Storage | null;
  constructor(storage?: Storage) {
    this.storage = storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  }
  private today() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }
  load(): EnergyState {
    if (this.storage) {
      const raw = this.storage.getItem(this.key);
      if (raw) {
        try {
          const v = JSON.parse(raw) as EnergyState;
          const s = this.resetIfCrossDay(v);
          if (s.remaining > this.max) {
            s.remaining = this.max;
            this.save(s);
          }
          if (s.remaining < 0) {
            s.remaining = 0;
            this.save(s);
          }
          return s;
        } catch { }
      }
    }
    return { remaining: this.max, date: this.today(), lastRecoverAt: null };
  }
  save(state: EnergyState) {
    if (this.storage) this.storage.setItem(this.key, JSON.stringify(state));
  }
  resetIfCrossDay(state: EnergyState) {
    const t = this.today();
    if (state.date !== t) {
      state.remaining = this.max;
      state.date = t;
      state.lastRecoverAt = null;
    }
    return state;
  }
  consumeOne(): boolean {
    const s = this.load();
    if (s.remaining <= 0) return false;
    s.remaining -= 1;
    if (s.remaining < this.max && !s.lastRecoverAt) s.lastRecoverAt = Date.now();
    this.save(s);
    return true;
  }
  recoverOne() {
    const s = this.load();
    if (s.remaining >= this.max) return;
    s.remaining += 1;
    if (s.remaining >= this.max) s.lastRecoverAt = null;
    else s.lastRecoverAt = Date.now();
    this.save(s);
  }
  tick(nowMs?: number) {
    let s = this.load();
    if (s.remaining >= this.max) return s;
    const now = nowMs ?? Date.now();
    if (!s.lastRecoverAt) s.lastRecoverAt = now;
    const elapsed = now - s.lastRecoverAt;
    if (elapsed >= this.intervalMs) {
      const steps = Math.floor(elapsed / this.intervalMs);
      s.remaining = Math.min(this.max, s.remaining + steps);
      s.lastRecoverAt = s.lastRecoverAt + steps * this.intervalMs;
      this.save(s);
    }
    return s;
  }
  getNextRecoverMs(): number | null {
    const s = this.load();
    if (s.remaining >= this.max || !s.lastRecoverAt) return null;
    const next = s.lastRecoverAt + this.intervalMs;
    const left = Math.max(0, next - Date.now());
    return left;
  }
  getMax() {
    return this.max;
  }
}
