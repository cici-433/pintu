import { _decorator, Component, Label, Node, director } from 'cc';
import { EnergyManager } from '../core/energy';
import { PuzzleBoard } from '../core/puzzle';
import { Stopwatch } from '../core/timer';
import { ProgressManager } from '../core/progress';
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

  private em = new EnergyManager();
  private pm = new ProgressManager();
  private board: PuzzleBoard = null!;
  private sw = new Stopwatch();
  private stepCount = 0;
  private levelId = 1;

  onEnable() {
    this.levelId = this.pm.getCurrentLevelId() || 1;
    const size = this.getSizeByLevel(this.levelId);
    this.board = new PuzzleBoard(size);
    this.board.shuffle();
    this.stepCount = 0;
    this.sw.reset();
    this.sw.start();
    this.timeLabel.string = 'TIME: 00:00';
    this.stepLabel.string = 'STEP: 0';
    this.renderBoard();
    this.updateEnergyUI();
    this.schedule(this.tick, 0.25);
    this.plusButton.on(Node.EventType.MOUSE_DOWN, this.onOpenEnergy, this);
  }

  onDisable() {
    this.unschedule(this.tick);
    this.plusButton.off(Node.EventType.MOUSE_DOWN, this.onOpenEnergy, this);
  }

  private formatMs(ms: number) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  private tick() {
    const next = this.em.getNextRecoverMs();
    const s = this.em.tick();
    this.energyLabel.string = `剩余: ${s.remaining}/${this.em.getMax()}`;
    if (next !== null) this.countdownLabel.string = `下次恢复: ${this.formatMs(next)}`;
    else this.countdownLabel.string = '';
    this.plusButton.active = s.remaining < this.em.getMax();
    this.timeLabel.string = `TIME: ${this.sw.format()}`;
  }

  private updateEnergyUI() {
    const s = this.em.load();
    const next = this.em.getNextRecoverMs();
    this.energyLabel.string = `剩余: ${s.remaining}/${this.em.getMax()}`;
    if (next !== null) this.countdownLabel.string = `下次恢复: ${this.formatMs(next)}`;
    else this.countdownLabel.string = '';
    this.plusButton.active = s.remaining < this.em.getMax();
  }

  private getSizeByLevel(id: number) {
    if (id === 1) return 3;
    if (id === 2) return 4;
    if (id === 3) return 5;
    return 6;
  }

  private renderBoard() {
    this.boardNode.removeAllChildren();
    const total = this.board.size * this.board.size;
    for (let i = 0; i < total; i++) {
      const val = this.board.state[i];
      const tile = new Node();
      const label = tile.addComponent(Label);
      label.string = val === 0 ? '' : String(val);
      tile.on(Node.EventType.MOUSE_DOWN, () => this.tryMove(i), this);
      this.boardNode.addChild(tile);
    }
  }

  private tryMove(index: number) {
    if (this.board.move(index)) {
      this.stepCount += 1;
      this.stepLabel.string = `STEP: ${this.stepCount}`;
      this.renderBoard();
      if (this.board.isSolved()) {
        this.sw.stop();
        if (this.resultTime) this.resultTime.string = this.sw.format();
        if (this.resultStep) this.resultStep.string = String(this.stepCount);
        this.pm.addCollected(this.levelId);
        this.resultModal.active = true;
      }
    }
  }

  nextLevel() {
    this.resultModal.active = false;
    this.levelId = Math.min(this.levelId + 1, 100);
    this.pm.setCurrentLevelId(this.levelId);
    const size = this.getSizeByLevel(this.levelId);
    this.board = new PuzzleBoard(size);
    this.board.shuffle();
    this.stepCount = 0;
    this.sw.reset();
    this.sw.start();
    this.timeLabel.string = 'TIME: 00:00';
    this.stepLabel.string = 'STEP: 0';
    this.renderBoard();
  }

  backToMain() {
    director.loadScene('Main');
  }

  showPreview() {
    if (this.previewModal) this.previewModal.active = true;
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
