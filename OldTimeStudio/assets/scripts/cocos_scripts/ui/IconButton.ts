/**
 * IconButton.ts
 *
 * 这是一个“纯图标按钮”组件：
 * - 只负责渲染一个 Sprite（例如 ic_setting）
 * - 不附带任何阴影/底色/文字（由需求决定是否叠加）
 * - 事件绑定由外部场景脚本处理（保持组件职责单一）
 */

import { _decorator, assetManager, Component, isValid, Node, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';

const { ccclass } = _decorator;

export type IconButtonInitOptions = {
  /**
   * 按钮的位置（父节点坐标系下本地坐标）。
   */
  position: Vec3;

  /**
   * 按钮的显示尺寸（正方形边长）。
   */
  size: number;

  /**
   * 图标 SpriteFrame 的 UUID（形如 xxx@f9941）。
   */
  spriteFrameUuid: string;
};

@ccclass('IconButton')
export class IconButton extends Component {
  /**
   * 组件内部创建并持有的 Sprite，方便外部在需要时修改 spriteFrame。
   */
  public iconSprite: Sprite = null!;

  /**
   * 初始化/重建按钮。
   * @param options 渲染所需的基础参数
   */
  public init(options: IconButtonInitOptions) {
    this.node.removeAllChildren();
    this.node.setPosition(options.position);

    const ui = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
    ui.setContentSize(options.size, options.size);

    const iconNode = new Node('Icon');
    const iconUi = iconNode.addComponent(UITransform);
    iconUi.setContentSize(options.size, options.size);
    iconNode.setPosition(Vec3.ZERO);
    this.node.addChild(iconNode);

    const sp = iconNode.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    this.iconSprite = sp;

    assetManager.loadAny({ uuid: options.spriteFrameUuid }, (err, asset) => {
      if (err) return;
      if (!isValid(this.node)) return;
      sp.spriteFrame = asset as SpriteFrame;
    });
  }
}

