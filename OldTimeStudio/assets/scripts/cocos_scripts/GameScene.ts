import { _decorator, Component, Label, Node, director, Vec3, Vec2, UITransform, Sprite, SpriteFrame, Mask, Size, Graphics, Color, assetManager, view } from 'cc';
import { EnergyManager } from '../core/energy';
import { JigsawBoard } from '../core/jigsaw';
import { Stopwatch } from '../core/timer';
import { ProgressManager } from '../core/progress';
import { EnergyBar } from './ui/EnergyBar';
import { IconButton } from './ui/IconButton';
import { LevelBadge } from './ui/LevelBadge';
import { JigsawBoardView } from './ui/JigsawBoardView';
import { SettingsModalView } from './ui/SettingsModalView';
const { ccclass, property } = _decorator;

@ccclass('GameScene')
export class GameScene extends Component {
  @property(Label) energyLabel: Label = null!;
  @property(Label) countdownLabel: Label = null!;
  @property(Node) plusButton: Node = null!;
  @property(Label) timeLabel: Label = null!;
  @property(Label) stepLabel: Label = null!;
  @property(Node) boardNode: Node = null!;
  @property(Node) resultModal: Node = null!;
  @property(Label) resultTime: Label = null!;
  @property(Label) resultStep: Label = null!;
  @property(Node) previewModal: Node = null!;
  @property(Node) energyModal: Node = null!;
  @property(SpriteFrame) sourceSprite: SpriteFrame = null!;
  private levelBadgeRef: LevelBadge = null!;
  private countdownTotalMs = 3 * 60 * 1000 + 30 * 1000;
  private boardView: JigsawBoardView = null!;

  private em = new EnergyManager();
  private pm = new ProgressManager();
  private board: JigsawBoard = null!;
  private sw = new Stopwatch();
  private stepCount = 0;
  private levelId = 1;
  private nodesById: Node[] = [];
  private dragInfo: { ids: number[]; startPos: Map<number, Vec3>; anchorId: number; anchorStart: Vec3; pointerStart: Vec3; offset: Vec3 } | null = null;
  private settingsModal: Node = null!;
  private settingsButton: Node = null!;
  private settingsOpenLockUntilMs = 0;
  // 边框逻辑移除
  // 边框逻辑移除



  onEnable() {
    this.levelId = this.pm.getCurrentLevelId() || 1;
    const size = this.getSizeByLevel();
    this.board = new JigsawBoard(size);
    this.board.shuffle();
    this.stepCount = 0;
    this.sw.reset();
    this.sw.start();
    if (this.countdownLabel) {
      this.countdownLabel.node.active = true;
      this.countdownLabel.string = this.formatMs(this.countdownTotalMs);
    }
    this.renderBoard(true);
    this.schedule(this.tick, 0.25);
  }

  onDisable() {
    this.unschedule(this.tick);
  }

  private formatMs(ms: number) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const mmNum = Math.floor(s / 60);
    const ssNum = s % 60;
    const mm = (mmNum < 10 ? '0' : '') + String(mmNum);
    const ss = (ssNum < 10 ? '0' : '') + String(ssNum);
    return `${mm}:${ss}`;
  }

  private tick() {
    const remain = Math.max(0, this.countdownTotalMs - this.sw.getElapsedMs());
    if (this.countdownLabel) this.countdownLabel.string = this.formatMs(remain);
  }

  private updateEnergyUI() {
    const s = this.em.load();
    this.energyLabel.string = `${s.remaining}`;
    this.plusButton.active = true;
  }

  private getSizeByLevel() {
    return 6;
  }

  private renderBoard(playIntro = false) {
    if (this.boardView) this.boardView.setData(this.board, this.sourceSprite, { playIntro });
  }

  private onDragStart(pid: number, ev?: any) {
    const ids = this.board.getGroupPieces(pid);
    const boardUI = this.boardNode.getComponent(UITransform)!;
    const anchorNode = this.nodesById[pid];
    // 置顶显示
    ids.forEach(id => this.nodesById[id].setSiblingIndex(this.boardNode.children.length - 1));
    const pointer = this._getPointerLocal(ev as any, boardUI);
    const anchorPos = anchorNode.position.clone();
    const offset = new Vec3(anchorPos.x - pointer.x, anchorPos.y - pointer.y, 0);
    const startPos = new Map<number, Vec3>();
    ids.forEach(id => startPos.set(id, this.nodesById[id].position.clone()));
    this.dragInfo = { ids, startPos, anchorId: pid, anchorStart: anchorPos, pointerStart: pointer, offset };
    // 边框逻辑移除
  }
  private onDragMove(ev: any) {
    if (!this.dragInfo) return;
    this._lastEvent = ev;
    const boardUI = this.boardNode.getComponent(UITransform)!;
    const pointer = this._getPointerLocal(ev, boardUI);
    const desiredAnchor = new Vec3(pointer.x + this.dragInfo.offset.x, pointer.y + this.dragInfo.offset.y, 0);
    const currentAnchor = this.nodesById[this.dragInfo.anchorId].position.clone();
    const delta = new Vec3(desiredAnchor.x - currentAnchor.x, desiredAnchor.y - currentAnchor.y, 0);
    this.dragInfo.ids.forEach(id => {
      const n = this.nodesById[id];
      const p = n.position;
      n.setPosition(new Vec3(p.x + delta.x, p.y + delta.y, 0));
    });
    // 边框逻辑移除
  }
  private onDragEnd() {
    if (!this.dragInfo) return;
    const size = this.board.size;
    const gap = 0;
    const bt = this.boardNode.getComponent(UITransform)!;
    const gridW = bt.contentSize.width;
    const gridH = bt.contentSize.height;
    const cell = (gridW - (size - 1) * gap) / size;
    const startX = -gridW / 2 + cell / 2;
    const startY = gridH / 2 - cell / 2;
    // 使用锚点目标格 + 当前棋盘形状偏移，保证整块落格唯一且保持组形状
    const anchorId = this.dragInfo.anchorId;
    const anchorNode = this.nodesById[anchorId];
    const pos = anchorNode.position;
    const colfA = (pos.x - startX) / (cell + gap);
    const rowfA = (startY - pos.y) / (cell + gap);
    let cA = Math.round(colfA);
    let rA = Math.round(rowfA);
    if (rA < 0) rA = 0;
    if (cA < 0) cA = 0;
    if (rA >= size) rA = size - 1;
    if (cA >= size) cA = size - 1;
    const mappings: Array<{ id: number; r: number; c: number }> = [];
    const boardPositions = this.board.getPositions();
    const anchorRC = boardPositions.find(p => p.id === anchorId)!;
    this.dragInfo.ids.forEach(id => {
      const prc = boardPositions.find(p => p.id === id)!;
      const dr = prc.r - anchorRC.r;
      const dc = prc.c - anchorRC.c;
      const r = rA + dr;
      const c = cA + dc;
      const rr = Math.max(0, Math.min(size - 1, r));
      const cc = Math.max(0, Math.min(size - 1, c));
      mappings.push({ id, r: rr, c: cc });
    });
    const ok = (this.board as any).dropExplicit ? (this.board as any).dropExplicit(mappings) : this.board.drop(this.dragInfo.anchorId, mappings[0].r, mappings[0].c);
    if (ok) {
      this.stepCount += 1;
      this.renderBoard();
      // 边框逻辑移除
    } else {
      // 无效投放，恢复拖拽前位置
      this.dragInfo.ids.forEach(id => {
        const n = this.nodesById[id];
        const sp = this.dragInfo!.startPos.get(id)!;
        n.setPosition(sp);
      });
      // 边框逻辑移除
    }
    // 边框逻辑移除
    if (this.board.isSolved()) {
      this.sw.stop();
      this.pm.addCollected(this.levelId);
    }
    this.dragInfo = null;
  }
  private _lastEvent: any = null;
  private _getPointerLocal(ev: any, boardUI: UITransform) {
    let x = 0, y = 0;
    if (ev && typeof ev.getUILocation === 'function') {
      const p: Vec2 = ev.getUILocation();
      x = p.x; y = p.y;
    } else if (ev && typeof ev.getLocation === 'function') {
      const p: Vec2 = ev.getLocation();
      x = p.x; y = p.y;
    }
    const world = new Vec3(x, y, 0);
    const local = boardUI.convertToNodeSpaceAR(world);
    return local;
  }

  // 边框逻辑移除

  // 边框逻辑移除

  nextLevel() {
    this.resultModal.active = false;
    this.levelId = Math.min(this.levelId + 1, 100);
    this.pm.setCurrentLevelId(this.levelId);
    const size = this.getSizeByLevel();
    this.board = new JigsawBoard(size);
    this.board.shuffle();
    this.stepCount = 0;
    this.sw.reset();
    this.sw.start();
    if (this.countdownLabel) {
      this.countdownLabel.node.active = true;
      this.countdownLabel.string = this.formatMs(this.countdownTotalMs);
    }
    this.renderBoard(true);
    if (this.levelBadgeRef) {
      this.levelBadgeRef.label.string = `第 ${this.levelId} 关`;
    }
  }

  backToMain() {
    director.loadScene('Main');
  }

  showPreview() {
    if (this.previewModal) this.previewModal.active = true;
  }
  openSettings() {
    const now = Date.now();
    if (now < this.settingsOpenLockUntilMs) return;
    this.settingsOpenLockUntilMs = now + 300;
    if (this.settingsModal) {
      if (this.settingsModal.active) return;
      this.settingsModal.active = true;
    }
  }
  closeSettings() {
    if (this.settingsModal) this.settingsModal.active = false;
  }
  backFromSettings() {
    this.closeSettings();
    this.backToMain();
  }

  onLoad() {
    const root = this.node;
    const ensureRootSize = () => {
      const ui = root.getComponent(UITransform) || root.addComponent(UITransform);
      const s = view.getVisibleSize();
      ui.setContentSize(s.width, s.height);
      return ui.contentSize;
    };
    const { width, height } = ensureRootSize();

    const existingBg = root.getChildByName('SceneBackground');
    if (existingBg) existingBg.destroy();
    const bg = new Node('SceneBackground');
    const bgUI = bg.addComponent(UITransform);
    bgUI.setContentSize(width, height);
    const g = bg.addComponent(Graphics);
    g.fillColor = new Color(232, 220, 200, 255);
    g.rect(-width / 2, -height / 2, width, height);
    g.fill();
    const img = new Node('BackgroundImage');
    const imgUI = img.addComponent(UITransform);
    const sp = img.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    img.setPosition(new Vec3(0, 0, 0));
    bg.addChild(img);
    assetManager.loadAny({ uuid: 'b1d73e5a-f655-48fc-bc01-6d2ddb0a8212@f9941' }, (err, asset) => {
      if (err) return;
      const sf = asset as SpriteFrame;
      sp.spriteFrame = sf;
      const org = sf.getOriginalSize();
      imgUI.setContentSize(org.width, org.height);
      const scale = Math.max(width / org.width, height / org.height);
      img.setScale(new Vec3(scale, scale, 1));
    });
    root.addChild(bg);
    bg.setSiblingIndex(0);

    const makeLabel = (text: string, pos: Vec3) => {
      const n = new Node();
      const l = n.addComponent(Label);
      l.string = text;
      n.setPosition(pos);
      root.addChild(n);
      return l;
    };
    const makeNode = (pos: Vec3, text?: string) => {
      const n = new Node();
      if (text) {
        const l = n.addComponent(Label);
        l.string = text;
      }
      const ui = n.addComponent(UITransform);
      ui.setContentSize(120, 40);
      n.setPosition(pos);
      root.addChild(n);
      return n;
    };
    const makeRoundedRect = (sizeW: number, sizeH: number, radius: number, fill: Color, stroke?: { color: Color; width: number }) => {
      const n = new Node();
      const ui = n.addComponent(UITransform);
      ui.setContentSize(sizeW, sizeH);
      const g = n.addComponent(Graphics);
      g.clear();
      g.fillColor = fill;
      const x = -sizeW / 2;
      const y = -sizeH / 2;
      g.roundRect(x, y, sizeW, sizeH, radius);
      g.fill();
      if (stroke) {
        g.strokeColor = stroke.color;
        g.lineWidth = stroke.width;
        g.stroke();
      }
      return n;
    };
    if (this.energyLabel?.node) this.energyLabel.node.destroy();
    if (this.countdownLabel?.node) this.countdownLabel.node.destroy();
    if (this.plusButton) this.plusButton.destroy();
    if (this.settingsButton) this.settingsButton.destroy();

    const figmaScale = Math.min(width / 750, height / 1335);

    const topY = height / 2 - 65 * figmaScale;
    const backSize = 80 * 1.5;
    const backX = -width / 2 + 45 * figmaScale + backSize / 2;
    const backY = topY - 30 * figmaScale;
    const backNode = new Node('BackButton');
    root.addChild(backNode);
    const backBtn = backNode.addComponent(IconButton);
    backBtn.init({ position: new Vec3(backX, backY, 0), size: backSize, spriteFrameUuid: 'f7cf471c-8aa8-42fa-b792-05dead43dad5@f9941' });
    backNode.on(Node.EventType.MOUSE_DOWN, this.backToMain, this);
    backNode.on(Node.EventType.TOUCH_END, this.backToMain, this);

    const pillW = 229 * figmaScale;
    const pillH = 59 * figmaScale;
    const pillPos = new Vec3(-width / 2 + 45 * figmaScale + pillW / 2, height / 2 - 65 * figmaScale - pillH / 2, 0);
    const settingsScale = 1.5;
    const settingsSize = 80 * settingsScale;
    const settingsGap = 50 * figmaScale;
    const pillLeftX = -width / 2 + 45 * figmaScale;
    const settingsX = pillLeftX + settingsSize / 2;
    const settingsY = pillPos.y - pillH / 2 - settingsGap - settingsSize / 2;
    const settingsNode = new Node('SettingsButton');
    root.addChild(settingsNode);
    const settingsBtn = settingsNode.addComponent(IconButton);
    settingsBtn.init({ position: new Vec3(settingsX, settingsY, 0), size: settingsSize, spriteFrameUuid: '2333643f-d5cb-4574-bbdb-3c0bee65bb47@f9941' });
    settingsNode.on(Node.EventType.MOUSE_DOWN, this.openSettings, this);
    settingsNode.on(Node.EventType.TOUCH_END, this.openSettings, this);
    this.settingsButton = settingsNode;

    const levelNode = new Node('LevelBadge');
    root.addChild(levelNode);
    const levelBadge = levelNode.addComponent(LevelBadge);
    levelBadge.init({ position: new Vec3(0, topY - 30 * figmaScale + 20 * figmaScale, 0), figmaScale, text: `第 ${this.levelId} 关` });
    this.levelBadgeRef = levelBadge;

    this.countdownLabel = makeLabel(this.formatMs(this.countdownTotalMs), new Vec3(0, 0, 0));
    this.countdownLabel.node.setPosition(new Vec3(0, (topY - 30 * figmaScale + 20 * figmaScale) - 40 * figmaScale, 0));
    this.countdownLabel.color = new Color(221, 221, 168, 255);
    this.countdownLabel.fontSize = 40;
    this.countdownLabel.lineHeight = 48;
    const boardViewNode = new Node('JigsawBoardView');
    boardViewNode.setPosition(new Vec3(0, (-30 - 20 - 10) * figmaScale, 0));
    root.addChild(boardViewNode);
    this.boardView = boardViewNode.addComponent(JigsawBoardView);
    this.boardView.setMargin(160);
    this.boardView.setVerticalMargin(300);
    this.boardView.setData(this.board, this.sourceSprite);
    this.settingsButton = null!;
    // 撤销按钮已移除
    if (!this.settingsModal) {
      const modalNode = new Node('SettingsModal');
      root.addChild(modalNode);
      const modal = modalNode.addComponent(SettingsModalView);
      modal.init({
        figmaScale,
        title: '设置',
        showBackButton: false,
        onClose: this.closeSettings.bind(this),
        onBack: this.backFromSettings.bind(this),
      });
      this.settingsModal = modalNode;
    }
    // 结果弹窗不展示
    if (!this.previewModal) {
      this.previewModal = new Node();
      const l = this.previewModal.addComponent(Label);
      l.string = '预览';
      this.previewModal.active = false;
      root.addChild(this.previewModal);
    }
    if (!this.energyModal) {
      this.energyModal = new Node();
      const l = this.energyModal.addComponent(Label);
      l.string = '体力不足';
      this.energyModal.active = false;
      root.addChild(this.energyModal);
      const recoverBtn = makeNode(new Vec3(0, -40, 0), '观看广告(+1⚡)');
      recoverBtn.on(Node.EventType.MOUSE_DOWN, this.recoverOne, this);
      recoverBtn.on(Node.EventType.TOUCH_END, this.recoverOne, this);
      this.energyModal.addChild(recoverBtn);
      const closeBtn = makeNode(new Vec3(0, -80, 0), '关 闭');
      closeBtn.on(Node.EventType.MOUSE_DOWN, this.closeEnergyModal, this);
      closeBtn.on(Node.EventType.TOUCH_END, this.closeEnergyModal, this);
      this.energyModal.addChild(closeBtn);
    }
  }
  hidePreview() {
    if (this.previewModal) this.previewModal.active = false;
  }

  onOpenEnergy() {
    if (this.energyModal) this.energyModal.active = true;
  }
  recoverOne() {
    this.em.recoverOne();
    this.updateEnergyUI();
    if (this.energyModal) this.energyModal.active = false;
  }
  closeEnergyModal() {
    if (this.energyModal) this.energyModal.active = false;
  }
}
