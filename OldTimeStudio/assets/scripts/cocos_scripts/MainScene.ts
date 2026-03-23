import { _decorator, Component, Label, Node, director, Vec3, UITransform, Graphics, Color, Sprite, SpriteFrame, view } from 'cc';
import { EnergyManager } from '../core/energy';
import { EnergyBar } from './ui/EnergyBar';
import { IconButton } from './ui/IconButton';
import { TextButton } from './ui/TextButton';
import { StartGameButton } from './ui/StartGameButton';
import { GalleryButton } from './ui/GalleryButton';
import { SettingsModalView } from './ui/SettingsModalView';
const { ccclass, property } = _decorator;

@ccclass('MainScene')
export class MainScene extends Component {
  @property(SpriteFrame) backgroundSprite: SpriteFrame = null!;
  @property(Label) energyLabel: Label = null!;
  @property(Label) countdownLabel: Label = null!;
  @property(Node) plusButton: Node = null!;
  @property(Node) startButton: Node = null!;
  @property(Node) rankingButton: Node = null!;
  @property(Node) energyModal: Node = null!;
  @property(Node) settingsButton: Node = null!;

  private em = new EnergyManager();
  private settingsModal: Node = null!;
  private settingsOpenLockUntilMs = 0;

  onLoad() {
    const root = this.node;
    root.removeAllChildren();
    const ensureRootSize = () => {
      const ui = root.getComponent(UITransform) || root.addComponent(UITransform);
      const s = view.getVisibleSize();
      ui.setContentSize(s.width, s.height);
      return ui.contentSize;
    };
    const { width, height } = ensureRootSize();
    const makeLabel = (text: string, pos: Vec3, fontSize = 18, color = new Color(255, 255, 255, 255)) => {
      const n = new Node();
      const l = n.addComponent(Label);
      l.string = text;
      l.fontSize = fontSize;
      l.lineHeight = Math.round(fontSize * 1.2);
      l.color = color;
      n.setPosition(pos);
      root.addChild(n);
      return l;
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

    const bg = new Node();
    const bgUI = bg.addComponent(UITransform);
    bgUI.setContentSize(width, height);
    if (this.backgroundSprite) {
      const img = new Node();
      const imgUI = img.addComponent(UITransform);
      const org = this.backgroundSprite.getOriginalSize();
      imgUI.setContentSize(org.width, org.height);
      const sp = img.addComponent(Sprite);
      sp.spriteFrame = this.backgroundSprite;
      const scale = Math.max(width / org.width, height / org.height);
      img.setScale(new Vec3(scale, scale, 1));
      img.setPosition(new Vec3(0, 0, 0));
      bg.addChild(img);
    } else {
      const g = bg.addComponent(Graphics);
      g.fillColor = new Color(232, 220, 200, 255);
      g.rect(-width / 2, -height / 2, width, height);
      g.fill();
    }
    root.addChild(bg);

    const margin = 24;
    if (this.energyLabel?.node) this.energyLabel.node.destroy();
    if (this.plusButton) this.plusButton.destroy();
    if (this.settingsButton) this.settingsButton.destroy();
    if (this.startButton) this.startButton.destroy();
    if (this.rankingButton) this.rankingButton.destroy();

    const figmaScale = Math.min(width / 750, height / 1335);
    const pillW = 229 * figmaScale;
    const pillH = 59 * figmaScale;
    const pillPos = new Vec3(-width / 2 + 45 * figmaScale + pillW / 2, height / 2 - 65 * figmaScale - pillH / 2, 0);

    const initState = this.em.load();
    const energyBarNode = new Node('EnergyBar');
    root.addChild(energyBarNode);
    const energyBar = energyBarNode.addComponent(EnergyBar);
    energyBar.init({ position: pillPos, figmaScale, remaining: initState.remaining, backgroundColor: new Color(53, 17, 9, 255) });
    this.energyLabel = energyBar.energyLabel;
    this.plusButton = energyBar.plusButton;

    if (!this.countdownLabel) this.countdownLabel = makeLabel('', Vec3.ZERO, 14, new Color(255, 255, 255, 200));
    this.countdownLabel.string = '';
    this.countdownLabel.node.active = false;

    const settingsScale = 1.5;
    const settingsSize = 80 * settingsScale;
    const settingsGap = 50 * figmaScale;
    const settingsX = -width / 2 + 45 * figmaScale + settingsSize / 2;
    const settingsY = pillPos.y - pillH / 2 - settingsGap - settingsSize / 2;
    const settingsNode = new Node('SettingsButton');
    root.addChild(settingsNode);
    const settingsBtn = settingsNode.addComponent(IconButton);
    settingsBtn.init({ position: new Vec3(settingsX, settingsY, 0), size: settingsSize, spriteFrameUuid: '2333643f-d5cb-4574-bbdb-3c0bee65bb47@f9941' });
    this.settingsButton = settingsNode;

    const buttonScale = 2;
    const btnW = 260 * buttonScale;
    const btnH = 70 * buttonScale;
    const btnR = 16 * buttonScale;
    const btnGap = 24;
    const baseButtonsOffsetY = 100;
    const bottomY = -height / 2 + margin + btnH / 2 + 40 + baseButtonsOffsetY;
    const topYPos = bottomY + btnH + btnGap;
    const startNode = new Node('StartButton');
    root.addChild(startNode);
    const startBtn = startNode.addComponent(StartGameButton);
    startBtn.init({ position: new Vec3(0, topYPos, 0), figmaScale });
    this.startButton = startNode;

    const galleryNode = new Node('GalleryButton');
    root.addChild(galleryNode);
    const galleryBtn = galleryNode.addComponent(GalleryButton);
    galleryBtn.init({ position: new Vec3(0, bottomY, 0), figmaScale });
    this.rankingButton = galleryNode;

    if (!this.energyModal) {
      this.energyModal = makeRoundedRect(320, 220, 18, new Color(0, 0, 0, 190));
      this.energyModal.setPosition(new Vec3(0, 0, 0));
      this.energyModal.active = false;
      root.addChild(this.energyModal);
      const title = makeLabel('体力不足', new Vec3(0, 60, 0), 22, new Color(255, 255, 255, 255));
      this.energyModal.addChild(title.node);
      const recoverBtn = makeRoundedRect(220, 56, 14, new Color(242, 164, 60, 255));
      recoverBtn.setPosition(new Vec3(0, 0, 0));
      const rLabel = recoverBtn.addComponent(Label);
      rLabel.string = '观看广告(+1次)';
      rLabel.fontSize = 20;
      rLabel.lineHeight = 22;
      rLabel.color = new Color(255, 255, 255, 255);
      recoverBtn.on(Node.EventType.MOUSE_DOWN, this.recoverOne, this);
      recoverBtn.on(Node.EventType.TOUCH_END, this.recoverOne, this);
      this.energyModal.addChild(recoverBtn);
      const closeBtn = makeRoundedRect(220, 48, 14, new Color(255, 255, 255, 210));
      closeBtn.setPosition(new Vec3(0, -70, 0));
      const cLabel = closeBtn.addComponent(Label);
      cLabel.string = '关闭';
      cLabel.fontSize = 20;
      cLabel.lineHeight = 22;
      cLabel.color = new Color(60, 60, 60, 255);
      closeBtn.on(Node.EventType.MOUSE_DOWN, this.closeEnergyModal, this);
      closeBtn.on(Node.EventType.TOUCH_END, this.closeEnergyModal, this);
      this.energyModal.addChild(closeBtn);
    }
    if (!this.settingsModal) {
      const modalNode = new Node('SettingsModal');
      root.addChild(modalNode);
      const modal = modalNode.addComponent(SettingsModalView);
      modal.init({
        figmaScale,
        title: '设置',
        showBackButton: false,
        onClose: this.closeSettingsModal.bind(this),
      });
      this.settingsModal = modalNode;
    }
  }

  onEnable() {
    this.updateEnergyUI();
    this.schedule(this.tick, 1);
    this.plusButton.active = false;
    this.startButton.on(Node.EventType.MOUSE_DOWN, this.onStartGame, this);
    this.startButton.on(Node.EventType.TOUCH_END, this.onStartGame, this);
    this.rankingButton.on(Node.EventType.MOUSE_DOWN, this.onOpenRanking, this);
    this.rankingButton.on(Node.EventType.TOUCH_END, this.onOpenRanking, this);
    this.plusButton.on(Node.EventType.MOUSE_DOWN, this.onOpenEnergy, this);
    this.plusButton.on(Node.EventType.TOUCH_END, this.onOpenEnergy, this);
    this.settingsButton.on(Node.EventType.MOUSE_DOWN, this.openSettingsModal, this);
    this.settingsButton.on(Node.EventType.TOUCH_END, this.openSettingsModal, this);
  }

  onDisable() {
    this.unschedule(this.tick);
    this.startButton.off(Node.EventType.MOUSE_DOWN, this.onStartGame, this);
    this.startButton.off(Node.EventType.TOUCH_END, this.onStartGame, this);
    this.rankingButton.off(Node.EventType.MOUSE_DOWN, this.onOpenRanking, this);
    this.rankingButton.off(Node.EventType.TOUCH_END, this.onOpenRanking, this);
    this.plusButton.off(Node.EventType.MOUSE_DOWN, this.onOpenEnergy, this);
    this.plusButton.off(Node.EventType.TOUCH_END, this.onOpenEnergy, this);
    this.settingsButton.off(Node.EventType.MOUSE_DOWN, this.openSettingsModal, this);
    this.settingsButton.off(Node.EventType.TOUCH_END, this.openSettingsModal, this);
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
    const s = this.em.tick();
    this.energyLabel.string = `${s.remaining}`;
    this.plusButton.active = true;
  }

  private updateEnergyUI() {
    const s = this.em.load();
    this.energyLabel.string = `${s.remaining}`;
    this.countdownLabel.string = '';
    this.plusButton.active = true;
  }

  private onStartGame() {
    if (this.em.consumeOne()) {
      director.loadScene('Game');
    } else {
      this.onOpenEnergy();
    }
  }

  private onOpenRanking() {
    director.loadScene('Gallery');
  }

  private onOpenEnergy() {
    if (this.energyModal) {
      this.energyModal.active = true;
    }
  }

  recoverOne() {
    this.em.recoverOne();
    this.updateEnergyUI();
    if (this.energyModal) this.energyModal.active = false;
  }

  closeEnergyModal() {
    if (this.energyModal) this.energyModal.active = false;
  }

  private openSettingsModal() {
    const now = Date.now();
    if (now < this.settingsOpenLockUntilMs) return;
    this.settingsOpenLockUntilMs = now + 300;
    if (this.settingsModal) {
      if (this.settingsModal.active) return;
      this.settingsModal.active = true;
    }
  }

  private closeSettingsModal() {
    if (this.settingsModal) this.settingsModal.active = false;
  }
}
