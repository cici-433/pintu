/**
 * TextButton.ts
 *
 * 这是一个“文字按钮”组件，适用于首页的：
 * - “开始游戏”
 * - “相册”
 *
 * 组件职责：
 * 1) 绘制圆角矩形背景（Graphics.roundRect）
 * 2) 在中心放置文字 Label
 *
 * 注意：
 * - 点击事件由外部场景脚本绑定（例如 node.on('touch-end', ...)）
 * - 这样可以让业务逻辑（跳转/弹窗）与 UI 渲染解耦
 */

import { _decorator, Color, Component, Graphics, Label, Node, UITransform, Vec3 } from 'cc';

const { ccclass } = _decorator;

export type TextButtonInitOptions = {
  /**
   * 按钮位置（父节点坐标系下本地坐标）。
   */
  position: Vec3;

  /**
   * 按钮宽高。
   */
  width: number;
  height: number;

  /**
   * 背景圆角半径。
   */
  radius: number;

  /**
   * 背景填充颜色。
   */
  backgroundColor: Color;

  /**
   * 文案内容。
   */
  text: string;

  /**
   * 文案字号与颜色。
   */
  fontSize: number;
  textColor: Color;
};

@ccclass('TextButton')
export class TextButton extends Component {
  /**
   * 外部如果需要动态修改文案，可以使用该引用。
   */
  public label: Label = null!;

  /**
   * 初始化/重建按钮 UI。
   * @param options 按钮的渲染参数
   */
  public init(options: TextButtonInitOptions) {
    this.node.removeAllChildren();
    this.node.setPosition(options.position);

    const ui = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
    ui.setContentSize(options.width, options.height);

    const g = this.node.getComponent(Graphics) || this.node.addComponent(Graphics);
    g.clear();
    g.fillColor = options.backgroundColor;
    g.roundRect(-options.width / 2, -options.height / 2, options.width, options.height, options.radius);
    g.fill();

    const textNode = new Node('Label');
    const l = textNode.addComponent(Label);
    l.string = options.text;
    l.fontSize = options.fontSize;
    l.lineHeight = Math.round(options.fontSize * 1.08);
    l.color = options.textColor;
    textNode.setPosition(Vec3.ZERO);
    this.node.addChild(textNode);
    this.label = l;
  }
}

