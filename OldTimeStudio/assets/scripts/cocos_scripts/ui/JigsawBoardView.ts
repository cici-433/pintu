import { _decorator, Color, Component, Graphics, Label, Mask, Node, Size, Sprite, SpriteFrame, Tween, tween, UITransform, Vec3, view } from 'cc';
import { JigsawBoard } from '../../core/jigsaw';
const { ccclass, property } = _decorator;

@ccclass('JigsawBoardView')
export class JigsawBoardView extends Component {
  @property(Node) container: Node = null!;
  @property(SpriteFrame) roundedClipSprite: SpriteFrame = null!;
  private board: JigsawBoard = null!;
  private sourceSprite: SpriteFrame = null!;
  private nodesById: Node[] = [];
  private dragInfo: { ids: number[]; startPos: Map<number, Vec3>; anchorId: number; offset: Vec3 } | null = null;
  private margin = 160;
  private vMargin = 300;
  private gridW = 0;
  private gridH = 0;
  private cellW = 0;
  private cellH = 0;
  private startX = 0;
  private startY = 0;
  private borderRadius = 0;
  private borderWidth = 0;
  private interactionEnabled = true;
  private introTween: Tween<Node> | null = null;
  private mergeBounceRoot: Node | null = null;

  private _getSourceOriginalSize() {
    let ow = 1;
    let oh = 1;
    if (this.sourceSprite) {
      const s: any = this.sourceSprite;
      if (typeof s.getOriginalSize === 'function') {
        const os: Size = s.getOriginalSize();
        ow = os.width;
        oh = os.height;
      } else if (s.originalSize) {
        const os: Size = s.originalSize;
        ow = os.width;
        oh = os.height;
      }
    }
    return { ow, oh };
  }

  private _useSpriteClip(mask: Mask, clip: Node) {
    mask.type = Mask.Type.SPRITE_STENCIL;
    mask.spriteFrame = this.roundedClipSprite;
    mask.alphaThreshold = 0.1;
    const clipG = clip.getComponent(Graphics);
    if (clipG) clipG.clear();
  }

  private _useGraphicsClip(mask: Mask, clip: Node, cfg: number | { radius?: number; squareTL?: boolean; squareTR?: boolean; squareBR?: boolean; squareBL?: boolean }) {
    mask.type = Mask.Type.GRAPHICS_STENCIL;
    (mask as any).spriteFrame = null;
    let clipG = clip.getComponent(Graphics);
    if (!clipG) clipG = clip.addComponent(Graphics);
    this.drawTileClip(clipG, cfg);
  }

  private _ensureBackFace(clip: Node, color: Color) {
    let back = clip.getChildByName('Back');
    if (!back) {
      back = new Node('Back');
      clip.addChild(back);
    }
    const ui = back.getComponent(UITransform) || back.addComponent(UITransform);
    ui.setContentSize(this.cellW, this.cellH);
    let g = back.getComponent(Graphics);
    if (!g) g = back.addComponent(Graphics);
    g.clear();
    g.fillColor = color;
    g.rect(-this.cellW / 2, -this.cellH / 2, this.cellW, this.cellH);
    g.fill();
    back.active = false;
    return back;
  }

  private _setTileFace(pid: number, showBack: boolean, backColor: Color) {
    const tile = this.nodesById[pid];
    if (!tile) return;
    const clip = tile.getChildByName('Clip');
    if (!clip) return;
    const back = this._ensureBackFace(clip, backColor);
    const img = clip.getChildByName('Image');
    back.active = showBack;
    if (img) img.active = !showBack;
  }

  playIntroFlipReveal() {
    if (!this.board || !this.sourceSprite) return;
    if (!this.nodesById.length) return;

    this.dragInfo = null;
    this.interactionEnabled = false;

    if (this.introTween) {
      this.introTween.stop();
      this.introTween = null;
    }

    const backColor = new Color(245, 210, 40, 255);
    const stagger = 0.03;
    const halfDur = 0.12;
    let maxDelay = 0;
    for (let pid = 0; pid < this.nodesById.length; pid++) {
      const tile = this.nodesById[pid];
      if (!tile) continue;
      const clip = tile.getChildByName('Clip');
      if (!clip) continue;
      Tween.stopAllByTarget(clip);
      clip.setScale(1, 1, 1);
      this._setTileFace(pid, true, backColor);

      const delay = stagger * pid;
      if (delay > maxDelay) maxDelay = delay;
      tween(clip)
        .delay(delay)
        .to(halfDur, { scale: new Vec3(0, 1, 1) })
        .call(() => {
          this._setTileFace(pid, false, backColor);
        })
        .to(halfDur, { scale: new Vec3(1, 1, 1) })
        .start();
    }

    this.introTween = tween(this.node)
      .delay(maxDelay + halfDur * 2 + 0.02)
      .call(() => {
        this.interactionEnabled = true;
        this.introTween = null;
      })
      .start();
  }

  private _buildBoardLookup() {
    const size = this.board.size;
    const total = size * size;
    const positions = this.board.getPositions();
    const cellToId = new Array<number>(total).fill(-1);
    const posById: Array<{ id: number; r: number; c: number }> = new Array(total);
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      cellToId[p.r * size + p.c] = p.id;
      posById[p.id] = p;
    }
    return { size, total, positions, cellToId, posById };
  }

  setData(board: JigsawBoard, sprite: SpriteFrame, options?: { playIntro?: boolean }) {
    this.board = board;
    this.sourceSprite = sprite;
    this.render();
    if (options?.playIntro) this.playIntroFlipReveal();
  }

  setMargin(m: number) {
    this.margin = m;
    if (this.board && this.sourceSprite) this.render();
  }
  setVerticalMargin(m: number) {
    this.vMargin = m;
    if (this.board && this.sourceSprite) this.render();
  }

  private ensureContainer() {
    this.container = this.node;
    const ui = this.container.getComponent(UITransform) || this.container.addComponent(UITransform);
    const s = view.getVisibleSize();
    const availW = Math.max(100, s.width - this.margin);
    const availH = Math.max(100, s.height - this.vMargin);
    const { ow, oh } = this._getSourceOriginalSize();
    const ratio = ow / oh;
    const availRatio = availW / availH;
    let w = availW;
    let h = availH;
    if (availRatio > ratio) {
      h = availH;
      w = h * ratio;
    } else {
      w = availW;
      h = w / ratio;
    }
    ui.setContentSize(w, h);
    return ui;
  }

  private computeGridMetrics(ui: UITransform) {
    const size = this.board.size;
    const gap = 0;
    const gridW = ui.contentSize.width;
    const gridH = ui.contentSize.height;
    const cellW = (gridW - (size - 1) * gap) / size;
    const cellH = (gridH - (size - 1) * gap) / size;
    const startX = -gridW / 2 + cellW / 2;
    const startY = gridH / 2 - cellH / 2;
    this.gridW = gridW;
    this.gridH = gridH;
    this.cellW = cellW;
    this.cellH = cellH;
    this.startX = startX;
    this.startY = startY;
  }

  private updatePositions() {
    const pos = this.board.getPositions();
    for (let i = 0; i < pos.length; i++) {
      const p = pos[i];
      const n = this.nodesById[p.id];
      if (!n) continue;
      n.setPosition(this.startX + p.c * this.cellW, this.startY - p.r * this.cellH, 0);
    }
  }

  private ensureTileStructure(tile: Node, pid: number) {
    const tileUI = tile.getComponent(UITransform) || tile.addComponent(UITransform);
    tileUI.setContentSize(this.cellW, this.cellH);

    let clip = tile.getChildByName('Clip');
    if (!clip) {
      clip = new Node('Clip');
      tile.addChild(clip);
    }
    const clipUI = clip.getComponent(UITransform) || clip.addComponent(UITransform);
    clipUI.setContentSize(this.cellW, this.cellH);
    const mask = clip.getComponent(Mask) || clip.addComponent(Mask);
    const rClip = Math.max(0, this.borderRadius);
    if (this.roundedClipSprite) this._useSpriteClip(mask, clip);
    else this._useGraphicsClip(mask, clip, rClip);
    this._ensureBackFace(clip, new Color(245, 210, 40, 255));

    let imgNode = clip.getChildByName('Image');
    if (!imgNode) {
      imgNode = new Node('Image');
      clip.addChild(imgNode);
    }
    const imgUI = imgNode.getComponent(UITransform) || imgNode.addComponent(UITransform);
    imgUI.setContentSize(this.gridW, this.gridH);
    const sp = imgNode.getComponent(Sprite) || imgNode.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    sp.spriteFrame = this.sourceSprite;

    let border = tile.getChildByName('Border');
    if (!border) {
      border = new Node('Border');
      tile.addChild(border);
    }
    const borderUI = border.getComponent(UITransform) || border.addComponent(UITransform);
    borderUI.setContentSize(this.cellW, this.cellH);
    const g = border.getComponent(Graphics) || border.addComponent(Graphics);

    const { ow, oh } = this._getSourceOriginalSize();
    const sx = this.gridW / ow;
    const sy = this.gridH / oh;
    const scale = Math.max(sx, sy);
    imgNode.setScale(scale, scale, 1);
    const corr = this.board.getCorrectRC(pid);
    imgNode.setPosition(-(this.startX + corr.c * this.cellW), -(this.startY - corr.r * this.cellH), 0);

    return { borderGraphics: g };
  }

  private drawTileBorder(g: Graphics, showTop: boolean, showRight: boolean, showBottom: boolean, showLeft: boolean) {
    const w = this.cellW;
    const h = this.cellH;
    const lw = this.borderWidth;
    g.clear();
    const rBase = this.borderRadius;

    const drawLayer = (inset: number, color: Color, extendSquareEnd: boolean) => {
      const outerHalfW = w / 2;
      const outerHalfH = h / 2;
      const halfW = w / 2 - inset;
      const halfH = h / 2 - inset;
      const r = Math.max(0, rBase - inset);
      if (halfW <= 0 || halfH <= 0) return;

      g.lineWidth = lw;
      g.strokeColor = color;
      g.lineJoin = Graphics.LineJoin.ROUND;
      g.lineCap = Graphics.LineCap.ROUND;

      const tl = showTop && showLeft && r > 0;
      const tr = showTop && showRight && r > 0;
      const br = showBottom && showRight && r > 0;
      const bl = showBottom && showLeft && r > 0;

      if (showTop) {
        const x0 = extendSquareEnd && !showLeft ? -outerHalfW : -halfW + (tl ? r : 0);
        const x1 = extendSquareEnd && !showRight ? outerHalfW : halfW - (tr ? r : 0);
        g.moveTo(x0, halfH);
        g.lineTo(x1, halfH);
      }
      if (showRight) {
        const y0 = extendSquareEnd && !showBottom ? -outerHalfH : -halfH + (br ? r : 0);
        const y1 = extendSquareEnd && !showTop ? outerHalfH : halfH - (tr ? r : 0);
        g.moveTo(halfW, y0);
        g.lineTo(halfW, y1);
      }
      if (showBottom) {
        const x0 = extendSquareEnd && !showLeft ? -outerHalfW : -halfW + (bl ? r : 0);
        const x1 = extendSquareEnd && !showRight ? outerHalfW : halfW - (br ? r : 0);
        g.moveTo(x0, -halfH);
        g.lineTo(x1, -halfH);
      }
      if (showLeft) {
        const y0 = extendSquareEnd && !showBottom ? -outerHalfH : -halfH + (bl ? r : 0);
        const y1 = extendSquareEnd && !showTop ? outerHalfH : halfH - (tl ? r : 0);
        g.moveTo(-halfW, y0);
        g.lineTo(-halfW, y1);
      }

      if (tl) {
        const cx = -halfW + r;
        const cy = halfH - r;
        g.moveTo(cx, cy + r);
        g.arc(cx, cy, r, Math.PI / 2, Math.PI, true);
      }
      if (tr) {
        const cx = halfW - r;
        const cy = halfH - r;
        g.moveTo(cx + r, cy);
        g.arc(cx, cy, r, 0, Math.PI / 2, true);
      }
      if (br) {
        const cx = halfW - r;
        const cy = -halfH + r;
        g.moveTo(cx, cy - r);
        g.arc(cx, cy, r, -Math.PI / 2, 0, true);
      }
      if (bl) {
        const cx = -halfW + r;
        const cy = -halfH + r;
        g.moveTo(cx - r, cy);
        g.arc(cx, cy, r, Math.PI, (Math.PI * 3) / 2, true);
      }

      g.stroke();
    };

    drawLayer(0, new Color(0, 0, 0, 255), false);
    if (w > lw * 2 && h > lw * 2) {
      drawLayer(lw, new Color(255, 255, 255, 255), true);
    }
  }

  /**
   * 绘制用于裁剪的圆角矩形路径（仅作为 GRAPHICS_STENCIL 模板，不用于可见渲染）
   * - overrideRadius：可选覆盖半径；未提供时使用当前边框圆角半径（borderRadius）
   * - 路径坐标基于 Tile 节点的本地坐标，原点在中心，先画上边，再顺时针依次画四个圆角与边
   * - 最终调用 fill() 将路径写入模板（不依赖边框当前是否显示；裁剪始终按该路径执行）
   */
  private drawTileClip(
    g: Graphics,
    overrideRadius?:
      | number
      | {
        radius?: number;
        squareTL?: boolean;
        squareTR?: boolean;
        squareBR?: boolean;
        squareBL?: boolean;
      },
  ) {
    const w = this.cellW;
    const h = this.cellH;
    const rBase = this.borderRadius;
    const cfg =
      overrideRadius !== undefined && typeof overrideRadius === 'object'
        ? overrideRadius
        : undefined;
    const radiusOverride =
      overrideRadius !== undefined && typeof overrideRadius === 'number'
        ? overrideRadius
        : cfg?.radius;
    const r = radiusOverride !== undefined ? Math.max(0, radiusOverride) : Math.max(0, rBase);
    const halfW = w / 2;
    const halfH = h / 2;
    g.clear(); // 清空旧模板路径
    g.fillColor = new Color(255, 255, 255, 255); // 模板填充色（仅影响模板，不可见）
    g.roundRect(-halfW, -halfH, w, h, r);
    if (r > 0 && cfg) {
      if (cfg.squareTL) g.rect(-halfW, halfH - r, r, r);
      if (cfg.squareTR) g.rect(halfW - r, halfH - r, r, r);
      if (cfg.squareBR) g.rect(halfW - r, -halfH, r, r);
      if (cfg.squareBL) g.rect(-halfW, -halfH, r, r);
    }
    g.fill(); // 填充路径以更新模板
  }

  private updateBorders() {
    const { size, total, cellToId, posById } = this._buildBoardLookup();
    const solved = this.board.isSolved();
    const rClip = Math.max(0, this.borderRadius);
    for (let id = 0; id < total; id++) {
      const tile = this.nodesById[id];
      if (!tile) continue;
      const borderNode = tile.getChildByName('Border');
      const g = borderNode?.getComponent(Graphics);
      if (!g) continue;
      const p = posById[id];
      if (!p) continue;
      const gid = this.board.getGroupId(id);
      const hasGroup = gid !== 0;
      const sameGroup = (nr: number, nc: number) => {
        if (!hasGroup) return false;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) return false;
        const nid = cellToId[nr * size + nc];
        if (nid < 0) return false;
        return this.board.getGroupId(nid) === gid;
      };

      const clip = tile.getChildByName('Clip');
      const mask = clip?.getComponent(Mask);
      if (mask) {
        const connTop = sameGroup(p.r - 1, p.c);
        const connBottom = sameGroup(p.r + 1, p.c);
        const connLeft = sameGroup(p.r, p.c - 1);
        const connRight = sameGroup(p.r, p.c + 1);
        const squareTL = connTop || connLeft;
        const squareTR = connTop || connRight;
        const squareBR = connBottom || connRight;
        const squareBL = connBottom || connLeft;
        const needsSquare = squareTL || squareTR || squareBR || squareBL;
        if (clip) {
          if (needsSquare) this._useGraphicsClip(mask, clip, { radius: rClip, squareTL, squareTR, squareBR, squareBL });
          else if (this.roundedClipSprite) this._useSpriteClip(mask, clip);
          else this._useGraphicsClip(mask, clip, rClip);
        }
      }

      if (borderNode) borderNode.active = !solved;
      if (solved) {
        g.clear();
        continue;
      }

      const showTop = !sameGroup(p.r - 1, p.c);
      const showBottom = !sameGroup(p.r + 1, p.c);
      const showLeft = !sameGroup(p.r, p.c - 1);
      const showRight = !sameGroup(p.r, p.c + 1);
      this.drawTileBorder(g, showTop, showRight, showBottom, showLeft);
    }
  }

  render() {
    if (!this.board) return;
    const ui = this.ensureContainer();
    const size = this.board.size;
    this.computeGridMetrics(ui);
    const minSide = Math.min(this.cellW, this.cellH);
    this.borderWidth = Math.max(2, Math.round(minSide * 0.0267));
    this.borderRadius = Math.max(3, Math.round(minSide * 0.09));
    const total = size * size;

    let needsRebuild = this.nodesById.length !== total || this.container.children.length !== total;
    if (!needsRebuild && this.nodesById[0]) {
      const t0 = this.nodesById[0];
      if (!t0.getChildByName('Border') || !t0.getChildByName('Clip')) needsRebuild = true;
    }

    if (needsRebuild) {
      this.container.removeAllChildren();
      this.nodesById = [];

      const pos = this.board.getPositions();
      for (let i = 0; i < pos.length; i++) {
        const p = pos[i];
        const tile = new Node(`Tile_${p.id}`);
        tile.setPosition(this.startX + p.c * this.cellW, this.startY - p.r * this.cellH, 0);
        if (this.sourceSprite) this.ensureTileStructure(tile, p.id);
        else {
          const tUI = tile.addComponent(UITransform);
          tUI.setContentSize(this.cellW, this.cellH);
          const label = tile.addComponent(Label);
          label.string = String(p.id + 1);
          label.fontSize = 28;
          label.lineHeight = 30;
        }
        tile.on(Node.EventType.TOUCH_START, (ev: any) => this.onDragStart(p.id, ev), this);
        tile.on(Node.EventType.TOUCH_MOVE, (ev: any) => this.onDragMove(ev), this);
        tile.on(Node.EventType.TOUCH_END, () => this.onDragEnd(), this);
        tile.on(Node.EventType.TOUCH_CANCEL, () => this.onDragEnd(), this);
        tile.on(Node.EventType.MOUSE_DOWN, (ev: any) => this.onDragStart(p.id, ev), this);
        tile.on(Node.EventType.MOUSE_MOVE, (ev: any) => this.onDragMove(ev), this);
        tile.on(Node.EventType.MOUSE_UP, () => this.onDragEnd(), this);
        this.container.addChild(tile);
        this.nodesById[p.id] = tile;
      }
    }

    this.updatePositions();
    if (this.sourceSprite) {
      for (let pid = 0; pid < total; pid++) {
        const tile = this.nodesById[pid];
        if (!tile) continue;
        this.ensureTileStructure(tile, pid);
      }
      this.updateBorders();
    }
  }

  private _getPointerLocal(ev: any, boardUI: UITransform) {
    let x = 0, y = 0;
    if (ev && typeof ev.getUILocation === 'function') {
      const p: any = ev.getUILocation();
      x = p.x; y = p.y;
    } else if (ev && typeof ev.getLocation === 'function') {
      const p: any = ev.getLocation();
      x = p.x; y = p.y;
    }
    const world = new Vec3(x, y, 0);
    const local = boardUI.convertToNodeSpaceAR(world);
    return local;
  }

  private _playGroupBounce(ids: number[]) {
    const up = 1.12;
    const down = 0.98;
    const d1 = 0.10;
    const d2 = 0.08;
    const d3 = 0.12;
    if (this.mergeBounceRoot) {
      Tween.stopAllByTarget(this.mergeBounceRoot);
      this.mergeBounceRoot.destroy();
      this.mergeBounceRoot = null;
    }

    const tiles: Node[] = [];
    for (let i = 0; i < ids.length; i++) {
      const n = this.nodesById[ids[i]];
      if (n) tiles.push(n);
    }
    if (!tiles.length) return;

    const root = new Node('MergeBounce');
    this.container.addChild(root);
    this.mergeBounceRoot = root;

    const worldPos: Vec3[] = [];
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < tiles.length; i++) {
      const wp = tiles[i].worldPosition.clone();
      worldPos.push(wp);
      cx += wp.x;
      cy += wp.y;
    }
    cx /= tiles.length;
    cy /= tiles.length;
    root.setWorldPosition(new Vec3(cx, cy, 0));
    root.setScale(1, 1, 1);

    for (let i = 0; i < tiles.length; i++) {
      const n = tiles[i];
      n.setParent(root);
      n.setWorldPosition(worldPos[i]);
      n.setScale(1, 1, 1);
    }

    tween(root)
      .to(d1, { scale: new Vec3(up, up, 1) })
      .to(d2, { scale: new Vec3(down, down, 1) })
      .to(d3, { scale: new Vec3(1, 1, 1) })
      .call(() => {
        for (let i = 0; i < tiles.length; i++) {
          const n = tiles[i];
          const wp = n.worldPosition.clone();
          n.setParent(this.container);
          n.setWorldPosition(wp);
          n.setScale(1, 1, 1);
        }
        if (this.mergeBounceRoot === root) this.mergeBounceRoot = null;
        root.destroy();
      })
      .start();
  }

  private onDragStart(pid: number, ev?: any) {
    if (!this.interactionEnabled) return;
    const ids = this.board.getGroupPieces(pid);
    const boardUI = this.container.getComponent(UITransform)!;
    const anchorNode = this.nodesById[pid];
    ids.forEach(id => this.nodesById[id].setSiblingIndex(this.container.children.length - 1));
    const pointer = this._getPointerLocal(ev as any, boardUI);
    const anchorPos = anchorNode.position.clone();
    const offset = new Vec3(anchorPos.x - pointer.x, anchorPos.y - pointer.y, 0);
    const startPos = new Map<number, Vec3>();
    ids.forEach(id => startPos.set(id, this.nodesById[id].position.clone()));
    this.dragInfo = { ids, startPos, anchorId: pid, offset };
  }

  private onDragMove(ev: any) {
    if (!this.interactionEnabled) return;
    if (!this.dragInfo) return;
    const boardUI = this.container.getComponent(UITransform)!;
    const pointer = this._getPointerLocal(ev, boardUI);
    const desiredX = pointer.x + this.dragInfo.offset.x;
    const desiredY = pointer.y + this.dragInfo.offset.y;
    const currentAnchor = this.nodesById[this.dragInfo.anchorId].position;
    const deltaX = desiredX - currentAnchor.x;
    const deltaY = desiredY - currentAnchor.y;
    this.dragInfo.ids.forEach(id => {
      const n = this.nodesById[id];
      const p = n.position;
      n.setPosition(p.x + deltaX, p.y + deltaY, 0);
    });
  }

  private onDragEnd() {
    if (!this.interactionEnabled) return;
    if (!this.dragInfo) return;
    const size = this.board.size;
    const anchorId = this.dragInfo.anchorId;
    const anchorNode = this.nodesById[anchorId];
    const pos = anchorNode.position;
    const colfA = (pos.x - this.startX) / this.cellW;
    const rowfA = (this.startY - pos.y) / this.cellH;
    let cA = Math.round(colfA);
    let rA = Math.round(rowfA);
    const mappings: Array<{ id: number; r: number; c: number }> = [];
    const { posById } = this._buildBoardLookup();
    const anchorRC = posById[anchorId]!;
    let minDr = 0, maxDr = 0, minDc = 0, maxDc = 0;
    for (let i = 0; i < this.dragInfo.ids.length; i++) {
      const id = this.dragInfo.ids[i];
      const prc = posById[id]!;
      const dr = prc.r - anchorRC.r;
      const dc = prc.c - anchorRC.c;
      if (dr < minDr) minDr = dr;
      if (dr > maxDr) maxDr = dr;
      if (dc < minDc) minDc = dc;
      if (dc > maxDc) maxDc = dc;
    }
    const minAnchorR = 0 - minDr;
    const maxAnchorR = (size - 1) - maxDr;
    const minAnchorC = 0 - minDc;
    const maxAnchorC = (size - 1) - maxDc;
    if (rA < minAnchorR) rA = minAnchorR;
    if (rA > maxAnchorR) rA = maxAnchorR;
    if (cA < minAnchorC) cA = minAnchorC;
    if (cA > maxAnchorC) cA = maxAnchorC;
    this.dragInfo.ids.forEach(id => {
      const prc = posById[id]!;
      const dr = prc.r - anchorRC.r;
      const dc = prc.c - anchorRC.c;
      const r = rA + dr;
      const c = cA + dc;
      mappings.push({ id, r, c });
    });
    const ok = (this.board as any).dropExplicit ? (this.board as any).dropExplicit(mappings) : this.board.drop(this.dragInfo.anchorId, mappings[0].r, mappings[0].c);
    if (!ok) {
      this.dragInfo.ids.forEach(id => {
        const n = this.nodesById[id];
        const sp = (this.dragInfo as any).startPos.get(id)!;
        n.setPosition(sp);
      });
    } else {
      const beforeCount = this.dragInfo.ids.length;
      const mergedIds = this.board.getGroupPieces(anchorId);
      this.updatePositions();
      if (this.sourceSprite) this.updateBorders();
      if (mergedIds.length > beforeCount) this._playGroupBounce(mergedIds);
    }
    this.dragInfo = null;
  }
}
