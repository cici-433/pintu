type Piece = {
  id: number;
  r: number;
  c: number;
  cr: number;
  cc: number;
  group: number;
};

export class JigsawBoard {
  size: number;
  pieces: Piece[];
  private occTop: number[];
  private occBottom: number[];
  private history: Array<{ pieces: Array<{ id: number; r: number; c: number }>; occTop: number[] }> = [];
  private nextGroup = 1;
  constructor(size: number) {
    this.size = Math.max(3, size | 0);
    const total = this.size * this.size;
    this.pieces = Array.from({ length: total }, (_, i) => {
      const r = Math.floor(i / this.size);
      const c = i % this.size;
      return { id: i, r, c, cr: r, cc: c, group: 0 };
    });
    this.occTop = Array.from({ length: total }, (_, i) => i);
    this.occBottom = Array.from({ length: total }, () => -1);
  }
  private pushHistory() {
    const snapshotPieces = this.pieces.map(p => ({ id: p.id, r: p.r, c: p.c }));
    const snapshotOcc = this.occTop.slice();
    this.history.push({ pieces: snapshotPieces, occTop: snapshotOcc });
  }
  undo() {
    if (this.history.length === 0) return false;
    const last = this.history.pop()!;
    this.occTop.fill(-1);
    for (const s of last.pieces) {
      const p = this.pieces[s.id];
      p.r = s.r;
      p.c = s.c;
      const idx = this.cellIndex(s.r, s.c);
      this.occTop[idx] = s.id;
    }
    this.recomputeGroups();
    return true;
  }
  shuffle() {
    const total = this.size * this.size;
    const idx = Array.from({ length: total }, (_, i) => i);
    for (let i = total - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = idx[i];
      idx[i] = idx[j];
      idx[j] = t;
    }
    for (let k = 0; k < total; k++) {
      const pid = k;
      const cell = idx[k];
      const r = Math.floor(cell / this.size);
      const c = cell % this.size;
      this.setPos(pid, r, c);
      this.pieces[pid].group = 0;
    }
    this.nextGroup = 1;
    this.recomputeGroups();
  }
  private cellIndex(r: number, c: number) {
    return r * this.size + c;
  }
  private setPos(pid: number, r: number, c: number) {
    const p = this.pieces[pid];
    const oldIdx = this.cellIndex(p.r, p.c);
    this.occTop[oldIdx] = -1;
    p.r = r;
    p.c = c;
    const idx = this.cellIndex(r, c);
    this.occTop[idx] = pid;
  }
  private applyMoves(moves: Array<{ id: number; r: number; c: number }>) {
    this.pushHistory();
    for (const m of moves) {
      const p = this.pieces[m.id];
      const oldIdx = this.cellIndex(p.r, p.c);
      this.occTop[oldIdx] = -1;
    }
    for (const m of moves) {
      const p = this.pieces[m.id];
      p.r = m.r;
      p.c = m.c;
      const idx = this.cellIndex(m.r, m.c);
      this.occTop[idx] = m.id;
    }
  }
  private getOcc(r: number, c: number) {
    const idx = this.cellIndex(r, c);
    return this.occTop[idx];
  }
  getGroupPieces(pid: number) {
    const g = this.pieces[pid].group;
    if (!g) return [pid];
    return this.pieces.filter(p => p.group === g).map(p => p.id);
  }
  private ensureGroupOf(pid: number) {
    const p = this.pieces[pid];
    if (!p.group) {
      p.group = this.nextGroup++;
    }
    return p.group;
  }
  private inBounds(r: number, c: number) {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
  }
  private isCorrect(pid: number) {
    const p = this.pieces[pid];
    return p.r === p.cr && p.c === p.cc;
  }
  recomputeGroups() {
    // 清空占用并重建占用表
    this.occTop.fill(-1);
    this.occBottom.fill(-1);
    this.pieces.forEach(p => {
      this.occTop[this.cellIndex(p.r, p.c)] = p.id;
      p.group = 0;
    });
    this.nextGroup = 1;
    const visited = new Uint8Array(this.pieces.length);
    for (let i = 0; i < this.pieces.length; i++) {
      if (visited[i]) continue;
      const comp: number[] = [];
      const queue: number[] = [i];
      let head = 0;
      visited[i] = 1;
      while (head < queue.length) {
        const uId = queue[head++]!;
        comp.push(uId);
        const u = this.pieces[uId];
        const dirs = [
          [u.r - 1, u.c],
          [u.r + 1, u.c],
          [u.r, u.c - 1],
          [u.r, u.c + 1],
        ];
        for (const [nr, nc] of dirs) {
          if (!this.inBounds(nr, nc)) continue;
          const vid = this.getOcc(nr, nc);
          if (vid === -1 || visited[vid]) continue;
          const v = this.pieces[vid];
          // 方向一致邻接：当前方向必须与原图方向完全一致
          const curDr = nr - u.r;
          const curDc = nc - u.c;
          const orgDr = v.cr - u.cr;
          const orgDc = v.cc - u.cc;
          if (curDr === orgDr && curDc === orgDc) {
            visited[vid] = 1;
            queue.push(vid);
          }
        }
      }
      if (comp.length > 1) {
        const gid = this.nextGroup++;
        comp.forEach(pid => (this.pieces[pid].group = gid));
      }
    }
  }
  drop(pid: number, targetR: number, targetC: number) {
    const group = this.getGroupPieces(pid);
    const groupSet = new Set<number>(group);
    const anchor = this.pieces[pid];
    const dR = targetR - anchor.r;
    const dC = targetC - anchor.c;
    const anchorStartR = anchor.r;
    const anchorStartC = anchor.c;
    const targets = group.map(id => {
      const pp = this.pieces[id];
      const nr = pp.r + dR;
      const nc = pp.c + dC;
      return { id, r: nr, c: nc, oldR: pp.r, oldC: pp.c };
    });
    for (const t of targets) {
      if (!this.inBounds(t.r, t.c)) return false;
    }
    // 统计目标占用情况与将要空出的旧格
    const occMap: Map<number, number> = new Map(); // key: target index, value: occ piece id
    const externalOccIds: number[] = [];
    const freedCells = targets.map(t => ({ r: t.oldR, c: t.oldC }));
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const occ = this.getOcc(t.r, t.c);
      if (occ !== -1 && !groupSet.has(occ)) {
        occMap.set(i, occ);
        externalOccIds.push(occ);
      }
    }
    // 简化策略：永远进行“整块位移 + 逐格回填”，不设复杂分支
    const moves: Array<{ id: number; r: number; c: number }> = [];
    // 1) 先记录整块的新位置
    for (const t of targets) {
      moves.push({ id: t.id, r: t.r, c: t.c });
    }
    // 2) 对每个被占格，记录被占图片的新位置为对应旧格；若该旧格暂时非空，兜底找任意旧空格
    for (let i = 0; i < targets.length; i++) {
      if (!occMap.has(i)) continue;
      const t = targets[i];
      const displacedId = occMap.get(i)!;
      moves.push({ id: displacedId, r: t.oldR, c: t.oldC });
    }
    // 3) 原子应用
    this.applyMoves(moves);
    this.recomputeGroups();
    return true;
  }
  dropExplicit(mappings: Array<{ id: number; r: number; c: number }>) {
    if (!mappings.length) return false;
    const ids = mappings.map(m => m.id);
    // 校验：id 唯一且在棋盘内
    const idSet = new Set(ids);
    if (idSet.size !== ids.length) return false;
    for (const m of mappings) {
      if (!this.inBounds(m.r, m.c)) return false;
    }
    // 校验：目标格唯一，避免同格重复投放
    const targetSet = new Set<number>();
    for (const m of mappings) {
      const idx = this.cellIndex(m.r, m.c);
      if (targetSet.has(idx)) return false;
      targetSet.add(idx);
    }
    // 组内块的旧格集合
    const oldCells = new Map<number, { r: number; c: number }>();
    for (const m of mappings) {
      const p = this.pieces[m.id];
      oldCells.set(m.id, { r: p.r, c: p.c });
    }
    // “双层格”逻辑：目标格可暂存两个，先把整块放在前层，原占用放到底层并加入待搬列表
    this.pushHistory();
    const displaced: number[] = [];
    // 1) 清空整块的旧格（前层）
    mappings.forEach(m => {
      const p = this.pieces[m.id];
      const oldIdx = this.cellIndex(p.r, p.c);
      this.occTop[oldIdx] = -1;
    });
    // 2) 逐格投放整块到目标的前层；若目标前层有外部块，则暂存到底层并加入待搬列表
    mappings.forEach(m => {
      const idx = this.cellIndex(m.r, m.c);
      const occ = this.occTop[idx];
      if (occ !== -1 && !idSet.has(occ)) {
        this.occBottom[idx] = occ;
        displaced.push(occ);
      } else {
        this.occBottom[idx] = -1;
      }
      this.pieces[m.id].r = m.r;
      this.pieces[m.id].c = m.c;
      this.occTop[idx] = m.id;
    });
    // 3) 计算可用空格：优先使用整块腾出的旧格；不足则全局空格
    const freedCells: Array<{ r: number; c: number }> = [];
    oldCells.forEach((pos) => {
      const idx = this.cellIndex(pos.r, pos.c);
      if (this.occTop[idx] === -1) freedCells.push(pos);
    });
    const globalEmpty: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const idx = this.cellIndex(r, c);
        if (this.occTop[idx] === -1) globalEmpty.push({ r, c });
      }
    }
    // 4) 将底层的外部块逐个搬到空格
    const targetsForDisplaced: Array<{ id: number; r: number; c: number }> = [];
    for (const id of displaced) {
      let dest: { r: number; c: number } | null = null;
      if (freedCells.length) dest = freedCells.shift()!;
      else if (globalEmpty.length) dest = globalEmpty.shift()!;
      if (dest) {
        const idxOld = this.cellIndex(this.pieces[id].r, this.pieces[id].c);
        // 清理其原来所在前层（已被覆盖），并把它放到新的前层
        const idxNew = this.cellIndex(dest.r, dest.c);
        this.occTop[idxNew] = id;
        this.pieces[id].r = dest.r;
        this.pieces[id].c = dest.c;
      }
    }
    // 5) 清空所有底层
    this.occBottom.fill(-1);
    this.recomputeGroups();
    return true;
  }
  isSolved() {
    return this.pieces.every(p => p.r === p.cr && p.c === p.cc);
  }
  getPositions() {
    return this.pieces.map(p => ({ id: p.id, r: p.r, c: p.c }));
  }
  getCorrectRC(pid: number) {
    const p = this.pieces[pid];
    return { r: p.cr, c: p.cc };
  }

  getGroupId(pid: number) {
    return this.pieces[pid].group;
  }
}
