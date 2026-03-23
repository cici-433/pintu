/**
 * EnergyBar.ts
 *
 * 这是一个“体力条（胶囊）”UI 组件，用于在首页/游戏页复用同一套体力展示逻辑：
 * - 左侧显示体力图标（ic_tili）
 * - 中间显示体力数值（remaining）
 * - 右侧显示加号按钮图标（ic_add），由外部绑定点击事件
 *
 * 设计目标：
 * 1) 让场景脚本只负责“摆放”和“事件绑定”，而 UI 的节点结构由组件内部维护；
 * 2) 便于以后继续对齐 Figma（尺寸、间距、颜色等只需要改这一处）。
 */

import { _decorator, assetManager, Color, Component, Graphics, isValid, Label, Node, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';

const { ccclass } = _decorator;

export type EnergyBarInitOptions = {
  /**
   * 体力条整体位置（世界/父节点坐标系下的本地坐标）。
   */
  position: Vec3;

  /**
   * 按照屏幕尺寸计算出来的缩放系数（用于把 Figma 的像素尺寸等比映射到当前画布）。
   */
  figmaScale: number;

  /**
   * 初始体力值（例如 5）。
   */
  remaining: number;

  /**
   * 体力条背景色（默认 0xff351109）。
   */
  backgroundColor?: Color;

  /**
   * 左侧体力图标 spriteFrame 的 UUID（默认 textures/ic_tili）。
   */
  tiliSpriteFrameUuid?: string;

  /**
   * 右侧加号图标 spriteFrame 的 UUID（默认 textures/ic_add）。
   */
  addSpriteFrameUuid?: string;
};

@ccclass('EnergyBar')
export class EnergyBar extends Component {
  /**
   * 外部需要更新的 Label 引用（例如 tick() 里更新剩余体力）。
   */
  public energyLabel: Label = null!;

  /**
   * 外部需要绑定点击事件的“加号按钮节点”引用。
   * 注意：这里只提供 Node，本组件不强制绑定任何业务事件。
   */
  public plusButton: Node = null!;

  private currentFigmaScale = 1;

  /**
   * 初始化/重建体力条。
   * @param options 体力条的布局与资源参数
   */
  public init(options: EnergyBarInitOptions) {
    this.node.removeAllChildren();

    this.currentFigmaScale = Math.max(0.001, options.figmaScale);
    this.node.setPosition(options.position);

    const pillW = 229 * this.currentFigmaScale;
    const pillH = 59 * this.currentFigmaScale;
    const rootUi = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
    rootUi.setContentSize(pillW, pillH);

    const bgW = 183 * this.currentFigmaScale;
    const bgH = 52 * this.currentFigmaScale;
    const bgRadius = 18 * this.currentFigmaScale;
    const bgColor = options.backgroundColor ?? new Color(53, 17, 9, 255);

    const energyBg = this.createRoundedRectNode(bgW, bgH, bgRadius, bgColor);
    energyBg.setPosition(new Vec3(-pillW / 2 + (21 * this.currentFigmaScale + bgW / 2), pillH / 2 - (3 * this.currentFigmaScale + bgH / 2), 0));
    this.node.addChild(energyBg);

    const tiliW = 67 * this.currentFigmaScale;
    const tiliH = 52 * this.currentFigmaScale;
    const tiliContainer = new Node('TiliIcon');
    const tiliContainerUi = tiliContainer.addComponent(UITransform);
    tiliContainerUi.setContentSize(tiliW, tiliH);
    tiliContainer.setPosition(new Vec3(-pillW / 2 + (5 * this.currentFigmaScale + tiliW / 2), pillH / 2 - (3 * this.currentFigmaScale + tiliH / 2), 0));
    this.node.addChild(tiliContainer);

    const tiliSpriteNode = new Node('TiliSprite');
    const tiliSprite = tiliSpriteNode.addComponent(Sprite);
    tiliSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    const tiliSpriteUi = tiliSpriteNode.addComponent(UITransform);
    tiliSpriteUi.setContentSize(tiliW, tiliH);
    tiliSpriteNode.setPosition(Vec3.ZERO);
    tiliContainer.addChild(tiliSpriteNode);

    this.loadSpriteFrameByUuid(
      options.tiliSpriteFrameUuid ?? 'e5994f50-8beb-484f-8d32-973897679e61@f9941',
      (sf) => {
        if (!isValid(this.node)) return;
        tiliSprite.spriteFrame = sf;
      },
    );

    const energyNode = new Node('EnergyLabel');
    const energy = energyNode.addComponent(Label);
    energy.string = String(options.remaining);
    energy.fontSize = Math.max(20, Math.round(31 * this.currentFigmaScale));
    energy.lineHeight = Math.round(energy.fontSize * 1.21);
    energy.color = new Color(227, 224, 189, 255);
    energyNode.setPosition(new Vec3(-pillW / 2 + (101 * this.currentFigmaScale + (28 * this.currentFigmaScale) / 2), pillH / 2 - (10 * this.currentFigmaScale + (37 * this.currentFigmaScale) / 2), 0));
    this.node.addChild(energyNode);
    this.energyLabel = energy;

    const plusW = 53 * this.currentFigmaScale;
    const plusH = 52 * this.currentFigmaScale;
    const plus = new Node('PlusButton');
    const plusUi = plus.addComponent(UITransform);
    plusUi.setContentSize(plusW, plusH);
    plus.setPosition(new Vec3(-pillW / 2 + (172 * this.currentFigmaScale + plusW / 2), pillH / 2 - (3 * this.currentFigmaScale + plusH / 2), 0));
    this.node.addChild(plus);
    this.plusButton = plus;

    const addSpriteNode = new Node('AddSprite');
    const addSprite = addSpriteNode.addComponent(Sprite);
    addSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    const addSpriteUi = addSpriteNode.addComponent(UITransform);
    addSpriteUi.setContentSize(plusW, plusH);
    addSpriteNode.setPosition(Vec3.ZERO);
    plus.addChild(addSpriteNode);

    this.loadSpriteFrameByUuid(
      options.addSpriteFrameUuid ?? '3cfa9239-7287-49ba-b435-02c890250aea@f9941',
      (sf) => {
        if (!isValid(this.node)) return;
        addSprite.spriteFrame = sf;
      },
    );
  }

  /**
   * 更新体力数值显示。
   * @param remaining 当前剩余体力
   */
  public setRemaining(remaining: number) {
    if (!this.energyLabel) return;
    this.energyLabel.string = String(remaining);
  }

  /**
   * 创建一个用 Graphics 绘制的圆角矩形节点。
   * @param width 宽度
   * @param height 高度
   * @param radius 圆角半径
   * @param fill 填充颜色
   */
  private createRoundedRectNode(width: number, height: number, radius: number, fill: Color) {
    const n = new Node('RoundedRect');
    const ui = n.addComponent(UITransform);
    ui.setContentSize(width, height);

    const g = n.addComponent(Graphics);
    g.clear();
    g.fillColor = fill;
    g.roundRect(-width / 2, -height / 2, width, height, radius);
    g.fill();

    return n;
  }

  /**
   * 通过 UUID 异步加载 SpriteFrame。
   * @param uuid SpriteFrame 资源的 UUID（形如 xxx@f9941）
   * @param onLoaded 加载成功回调
   */
  private loadSpriteFrameByUuid(uuid: string, onLoaded: (spriteFrame: SpriteFrame) => void) {
    assetManager.loadAny({ uuid }, (err, asset) => {
      if (err) return;
      onLoaded(asset as SpriteFrame);
    });
  }
}

