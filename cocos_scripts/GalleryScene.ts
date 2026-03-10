import { _decorator, Component, Node, Label, director } from 'cc';
import { ProgressManager } from '../core/progress';
const { ccclass, property } = _decorator;

@ccclass('GalleryScene')
export class GalleryScene extends Component {
  @property(Node) listContainer: Node = null!;
  @property(Node) emptyNode: Node = null!;

  private pm = new ProgressManager();

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
