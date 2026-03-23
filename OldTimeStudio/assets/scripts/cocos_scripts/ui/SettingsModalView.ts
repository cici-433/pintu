import { _decorator, assetManager, Color, Component, Graphics, isValid, Label, Node, Sprite, SpriteFrame, UITransform, Vec3, view } from 'cc';

const { ccclass } = _decorator;

export type SettingsModalViewInitOptions = {
  figmaScale: number;
  title: string;
  showBackButton: boolean;
  onClose: () => void;
  onBack?: () => void;
};

@ccclass('SettingsModalView')
export class SettingsModalView extends Component {
  private storage: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null;
  private musicOn = true;
  private soundOn = true;

  init(options: SettingsModalViewInitOptions) {
    const s = Math.max(0.001, options.figmaScale);
    this.node.removeAllChildren();
    this.node.active = false;

    const rootUI = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
    const vs = view.getVisibleSize();
    rootUI.setContentSize(vs.width, vs.height);

    const BG_W = 2163;
    const BG_H = 1833;

    const loadSettings = () => {
      if (!this.storage) return;
      const raw = this.storage.getItem('oldtime_settings_v1');
      if (!raw) return;
      try {
        const v = JSON.parse(raw) as any;
        this.musicOn = v?.musicOn !== false;
        this.soundOn = v?.soundOn !== false;
      } catch { }
    };
    const saveSettings = () => {
      if (!this.storage) return;
      this.storage.setItem('oldtime_settings_v1', JSON.stringify({ musicOn: this.musicOn, soundOn: this.soundOn }));
    };
    loadSettings();

    const overlay = new Node('Overlay');
    const overlayUI = overlay.addComponent(UITransform);
    overlayUI.setContentSize(vs.width, vs.height);
    const overlayG = overlay.addComponent(Graphics);
    overlayG.clear();
    overlayG.fillColor = new Color(0, 0, 0, 160);
    overlayG.rect(-vs.width / 2, -vs.height / 2, vs.width, vs.height);
    overlayG.fill();
    overlay.on(Node.EventType.MOUSE_DOWN, (ev: any) => ev?.stopPropagation?.());
    overlay.on(Node.EventType.TOUCH_START, (ev: any) => ev?.stopPropagation?.());
    overlay.on(Node.EventType.TOUCH_END, (ev: any) => ev?.stopPropagation?.());
    this.node.addChild(overlay);

    const dialogW = Math.min(vs.width * 0.88, 640 * s);
    const dialogH = dialogW * (BG_H / BG_W);
    const k = dialogW / BG_W;

    const dialog = new Node('Dialog');
    dialog.setPosition(Vec3.ZERO);
    const dialogUI = dialog.addComponent(UITransform);
    dialogUI.setContentSize(dialogW, dialogH);
    dialog.on(Node.EventType.MOUSE_DOWN, (ev: any) => ev?.stopPropagation?.());
    dialog.on(Node.EventType.TOUCH_START, (ev: any) => ev?.stopPropagation?.());
    this.node.addChild(dialog);

    const makeSprite = (parent: Node, name: string, spriteFrameUuid: string, sizeW: number, sizeH: number, position: Vec3) => {
      const n = new Node(name);
      (n as any).__desiredSpriteFrameUuid = spriteFrameUuid;
      n.setPosition(position);
      const ui = n.addComponent(UITransform);
      ui.setContentSize(sizeW, sizeH);
      const sp = n.addComponent(Sprite);
      sp.sizeMode = Sprite.SizeMode.CUSTOM;
      parent.addChild(n);
      assetManager.loadAny({ uuid: spriteFrameUuid }, (err, asset) => {
        if (err) return;
        if (!isValid(n)) return;
        if ((n as any).__desiredSpriteFrameUuid !== spriteFrameUuid) return;
        sp.spriteFrame = asset as SpriteFrame;
      });
      return { node: n, sprite: sp };
    };

    const BG_UUID = '3d514710-f24d-402f-8b0d-316dcde419b3@f9941';
    const CLOSE_UUID = '9fd5a163-f09d-4a52-b523-229eff99c64b@f9941';
    const MUSIC_UUID = '33477b5e-8ae3-462a-aefe-c109e32a1119@f9941';
    const SOUND_UUID = '3dcb3b1a-90e6-4741-92d8-39f3697b9e69@f9941';
    const SWITCH_OPEN_UUID = '073da42f-6ec7-48af-a745-72a42fb50c17@f9941';
    const SWITCH_CLOSE_UUID = 'bc8ca139-78a1-451a-a0ef-7a4a6934c5e0@f9941';

    makeSprite(dialog, 'Background', BG_UUID, dialogW, dialogH, Vec3.ZERO);

    const titleNode = new Node('Title');
    const titleLabel = titleNode.addComponent(Label);
    titleLabel.string = options.title;
    titleLabel.fontSize = Math.round(140 * k);
    titleLabel.lineHeight = Math.round(160 * k);
    titleLabel.color = new Color(255, 255, 255, 255);
    titleNode.setPosition(new Vec3(0, (BG_H / 2 - 160) * k, 0));
    dialog.addChild(titleNode);

    const closeSize = 261 * k;
    const close = makeSprite(
      dialog,
      'Close',
      CLOSE_UUID,
      closeSize,
      closeSize,
      new Vec3((BG_W / 2 - 150) * k, (BG_H / 2 - 150) * k, 0),
    );
    close.node.on(Node.EventType.MOUSE_DOWN, (ev: any) => {
      ev?.stopPropagation?.();
      options.onClose();
    });
    close.node.on(Node.EventType.TOUCH_END, (ev: any) => {
      ev?.stopPropagation?.();
      options.onClose();
    });

    const row1Y = 170 * k;
    const row2Y = -260 * k;
    const iconW = 321 * k;
    const musicIconH = 336 * k;
    const soundIconH = 339 * k;
    const switchW = 420 * k;
    const switchH = 240 * k;

    const makeRow = (
      y: number,
      iconUuid: string,
      iconH: number,
      text: string,
      isOn: () => boolean,
      setOn: (v: boolean) => void,
    ) => {
      const iconX = (-BG_W / 2 + 360) * k;
      const labelX = (-BG_W / 2 + 820) * k;
      const switchX = (BG_W / 2 - 420) * k;

      makeSprite(dialog, `${text}Icon`, iconUuid, iconW, iconH, new Vec3(iconX, y, 0));

      const labelNode = new Node(`${text}Label`);
      const l = labelNode.addComponent(Label);
      l.string = text;
      l.fontSize = Math.round(150 * k);
      l.lineHeight = Math.round(165 * k);
      l.color = new Color(30, 30, 30, 255);
      labelNode.setPosition(new Vec3(labelX, y, 0));
      dialog.addChild(labelNode);

      const sw = makeSprite(dialog, `${text}Switch`, isOn() ? SWITCH_OPEN_UUID : SWITCH_CLOSE_UUID, switchW, switchH, new Vec3(switchX, y, 0));
      let lastToggleAt = 0;
      const toggle = (ev: any) => {
        ev?.stopPropagation?.();
        const now = Date.now();
        if (now - lastToggleAt < 200) return;
        lastToggleAt = now;
        const next = !isOn();
        setOn(next);
        saveSettings();
        const nextUuid = next ? SWITCH_OPEN_UUID : SWITCH_CLOSE_UUID;
        (sw.node as any).__desiredSpriteFrameUuid = nextUuid;
        assetManager.loadAny({ uuid: nextUuid }, (err, asset) => {
          if (err) return;
          if (!isValid(sw.node)) return;
          if ((sw.node as any).__desiredSpriteFrameUuid !== nextUuid) return;
          sw.sprite.spriteFrame = asset as SpriteFrame;
        });
      };
      sw.node.on(Node.EventType.MOUSE_DOWN, toggle);
      sw.node.on(Node.EventType.TOUCH_END, toggle);
    };

    makeRow(row1Y, MUSIC_UUID, musicIconH, '音乐', () => this.musicOn, v => (this.musicOn = v));
    makeRow(row2Y, SOUND_UUID, soundIconH, '音效', () => this.soundOn, v => (this.soundOn = v));
  }

  show() {
    this.node.active = true;
  }

  hide() {
    this.node.active = false;
  }
}
