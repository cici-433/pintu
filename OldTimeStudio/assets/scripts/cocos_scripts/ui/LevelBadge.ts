import { _decorator, Color, Component, Label, Node, Vec3 } from 'cc';
const { ccclass } = _decorator;

export type LevelBadgeInitOptions = {
  position: Vec3;
  figmaScale: number;
  text: string;
};

@ccclass('LevelBadge')
export class LevelBadge extends Component {
  public label: Label = null!;

  init(options: LevelBadgeInitOptions) {
    this.node.removeAllChildren();
    this.node.setPosition(options.position);
    const s = Math.max(0.001, options.figmaScale);

    const textNode = new Node('Text');
    const l = textNode.addComponent(Label);
    l.string = options.text;
    l.fontSize = 80;
    l.lineHeight = 100;
    l.color = new Color(221, 221, 168, 255);
    textNode.setPosition(Vec3.ZERO);
    this.node.addChild(textNode);
    this.label = l;
  }
}
