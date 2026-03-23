/**
 * StartGameButton.ts
 *
 * 这是一个专门用于“开始游戏”按钮的 UI 组件，严格对齐 Figma 节点 18:375 的结构与样式。
 *
 * Figma 规格（基于 750×1335 的设计稿）：
 * - 外层 Frame：226 × 79（透明，用作点击区域）
 * - 内层 Background：217 × 70，左上角偏移 (x=5, y=5)
 *   - 填充色：#C7301A
 *   - 描边色：#83291A
 *   - 描边宽：4
 *   - 圆角：26
 * - 文案“开始游戏”：
 *   - 字号：39（Inter SemiBold）
 *   - 颜色：#E2D3A3
 *   - 位置：x=36, y=15（文字框 160×49）
 *
 * 使用方式：
 * 1) 在场景中创建一个 Node，挂载该组件
 * 2) 调用 init({ position, figmaScale })
 * 3) 场景脚本对 node 绑定点击事件即可（本组件不绑定任何业务逻辑）
 */

import { _decorator, Color, Component, Graphics, Label, Node, UITransform, Vec3 } from 'cc';

const { ccclass } = _decorator;

export type StartGameButtonInitOptions = {
  /**
   * 按钮在父节点坐标系下的位置（本地坐标）。
   */
  position: Vec3;

  /**
   * 将 Figma 像素尺寸等比映射到当前屏幕的缩放系数。
   * 通常由场景通过 Math.min(width/750, height/1335) 计算得到。
   */
  figmaScale: number;
};

@ccclass('StartGameButton')
export class StartGameButton extends Component {
  /**
   * 外部如果需要动态改文案，可以使用该引用。
   */
  public label: Label = null!;

  /**
   * 初始化/重建按钮 UI（可重复调用）。
   */
  public init(options: StartGameButtonInitOptions) {
    this.node.removeAllChildren();
    this.node.setPosition(options.position);

    const s = Math.max(0.001, options.figmaScale);

    const frameW = 226 * s;
    const frameH = 79 * s;
    const ui = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
    ui.setContentSize(frameW, frameH);

    const bgW = 217 * s;
    const bgH = 70 * s;
    const bgRadius = 26 * s;
    const bgStroke = 4 * s;

    const bgNode = new Node('Background');
    const bgUi = bgNode.addComponent(UITransform);
    bgUi.setContentSize(bgW, bgH);

    const bgG = bgNode.addComponent(Graphics);
    bgG.clear();
    bgG.fillColor = new Color(199, 48, 26, 255); // #C7301A
    bgG.strokeColor = new Color(131, 41, 26, 255); // #83291A
    bgG.lineWidth = bgStroke;
    bgG.roundRect(-bgW / 2, -bgH / 2, bgW, bgH, bgRadius);
    bgG.fill();
    bgG.stroke();

    const bgCenterOffsetX = 0.5 * s;
    const bgCenterOffsetY = -0.5 * s;
    bgNode.setPosition(new Vec3(bgCenterOffsetX, bgCenterOffsetY, 0));
    this.node.addChild(bgNode);

    const textNode = new Node('Text');
    const l = textNode.addComponent(Label);
    l.string = '开始游戏';
    l.fontSize = Math.max(12, Math.round(39 * s));
    l.lineHeight = Math.round(l.fontSize * 1.21);
    l.color = new Color(226, 211, 163, 255); // #E2D3A3

    const textCenterOffsetX = 3 * s;
    textNode.setPosition(new Vec3(textCenterOffsetX, 0, 0));
    this.node.addChild(textNode);
    this.label = l;
  }
}

