export class PuzzleBoard {
  size: number;
  state: number[];
  emptyIndex: number;
  constructor(size: number) {
    this.size = Math.max(3, size | 0);
    const total = this.size * this.size;
    this.state = Array.from({ length: total - 1 }, (_, i) => i + 1).concat(0);
    this.emptyIndex = total - 1;
  }
  neighbors(index: number) {
    const r = Math.floor(index / this.size);
    const c = index % this.size;
    const res: number[] = [];
    if (r > 0) res.push((r - 1) * this.size + c);
    if (r < this.size - 1) res.push((r + 1) * this.size + c);
    if (c > 0) res.push(r * this.size + (c - 1));
    if (c < this.size - 1) res.push(r * this.size + (c + 1));
    return res;
  }
  shuffle(steps?: number) {
    const total = this.size * this.size;
    this.state = Array.from({ length: total - 1 }, (_, i) => i + 1).concat(0);
    this.emptyIndex = total - 1;
    let prev = -1;
    const moves = steps ?? total * 10;
    for (let i = 0; i < moves; i++) {
      const ns = this.neighbors(this.emptyIndex).filter(n => n !== prev);
      const pick = ns[Math.floor(Math.random() * ns.length)];
      this.state[this.emptyIndex] = this.state[pick];
      this.state[pick] = 0;
      prev = this.emptyIndex;
      this.emptyIndex = pick;
    }
  }
  canMove(index: number) {
    return this.neighbors(this.emptyIndex).indexOf(index) !== -1;
  }
  move(index: number) {
    if (!this.canMove(index)) return false;
    const t = this.state[index];
    this.state[index] = 0;
    this.state[this.emptyIndex] = t;
    this.emptyIndex = index;
    return true;
  }
  isSolved() {
    const total = this.size * this.size;
    for (let i = 0; i < total - 1; i++) {
      if (this.state[i] !== i + 1) return false;
    }
    return this.state[total - 1] === 0;
  }
  getState() {
    return this.state.slice();
  }
}
