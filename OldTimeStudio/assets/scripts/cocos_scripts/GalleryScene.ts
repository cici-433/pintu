import { _decorator, Component, Node, Label, director, Vec3, UITransform, view } from 'cc';
import { ProgressManager } from '../core/progress';
import { IconButton } from './ui/IconButton';
const { ccclass, property } = _decorator;

@ccclass('GalleryScene')
export class GalleryScene extends Component {
  @property(Node) listContainer: Node = null!;
  @property(Node) emptyNode: Node = null!;

  private pm = new ProgressManager();

  onLoad() {
    const root = this.node;
    const ensureRootSize = () => {
      const ui = root.getComponent(UITransform) || root.addComponent(UITransform);
      const s = view.getVisibleSize();
      ui.setContentSize(s.width, s.height);
      return ui.contentSize;
    };
    const { width, height } = ensureRootSize();
    const makeNode = (pos: Vec3, text?: string) => {
      const n = new Node();
      if (text) {
        const l = n.addComponent(Label);
        l.string = text;
      }
      n.setPosition(pos);
      root.addChild(n);
      return n;
    };
    const figmaScale = Math.min(width / 750, height / 1335);
    const backSize = 80 * 1.5;
    const backX = -width / 2 + 45 * figmaScale + backSize / 2;
    const backY = height / 2 - 65 * figmaScale;
    const backNode = new Node('BackButton');
    root.addChild(backNode);
    const backBtn = backNode.addComponent(IconButton);
    backBtn.init({ position: new Vec3(backX, backY, 0), size: backSize, spriteFrameUuid: 'f7cf471c-8aa8-42fa-b792-05dead43dad5@f9941' });
    backNode.on(Node.EventType.MOUSE_DOWN, this.backToMain, this);
    backNode.on(Node.EventType.TOUCH_END, this.backToMain, this);
    if (!this.listContainer) this.listContainer = makeNode(new Vec3(0, 120, 0));
    if (!this.emptyNode) this.emptyNode = makeNode(new Vec3(0, 0, 0), '暂无照片，快去“开始游戏”收集吧！');
  }

  onEnable() {
    this.renderList();
  }

  private renderList() {
    this.listContainer.removeAllChildren();
    const arr = this.pm.getCollected();
    if (!arr.length) {
      this.emptyNode.active = true;
      return;
    }
    this.emptyNode.active = false;
    arr.forEach(id => {
      const item = new Node();
      const label = item.addComponent(Label);
      label.string = `第 ${id} 关`;
      this.listContainer.addChild(item);
    });
  }

  backToMain() {
    director.loadScene('Main');
  }
}
