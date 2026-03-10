type ProgressState = {
  collected: number[];
  currentLevelId: number;
};

export class ProgressManager {
  private key = 'oldtime_progress_v1';
  private storage: Storage | null;
  constructor(storage?: Storage) {
    this.storage = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  }
  load(): ProgressState {
    if (this.storage) {
      const raw = this.storage.getItem(this.key);
      if (raw) {
        try {
          const v = JSON.parse(raw) as ProgressState;
          v.collected = Array.isArray(v.collected) ? v.collected : [];
          v.currentLevelId = v.currentLevelId || 1;
          return v;
        } catch {}
      }
    }
    return { collected: [], currentLevelId: 1 };
  }
  save(s: ProgressState) {
    if (this.storage) this.storage.setItem(this.key, JSON.stringify(s));
  }
  addCollected(levelId: number) {
    const s = this.load();
    if (!s.collected.includes(levelId)) {
      s.collected.push(levelId);
      this.save(s);
    }
  }
  getCollected() {
    return this.load().collected;
  }
  setCurrentLevelId(id: number) {
    const s = this.load();
    s.currentLevelId = id;
    this.save(s);
  }
  getCurrentLevelId() {
    return this.load().currentLevelId;
  }
}
