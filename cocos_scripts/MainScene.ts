import { _decorator, Component, Label, Node, director } from 'cc';
import { EnergyManager } from '../core/energy';
const { ccclass, property } = _decorator;

@ccclass('MainScene')
export class MainScene extends Component {
    @property(Label) energyLabel: Label = null!;
    @property(Label) countdownLabel: Label = null!;
    @property(Node) plusButton: Node = null!;
    @property(Node) startButton: Node = null!;
    @property(Node) albumButton: Node = null!;
    @property(Node) energyModal: Node = null!;

    private em = new EnergyManager();

    onEnable() {
        this.updateEnergyUI();
        this.schedule(this.tick, 1);
        this.plusButton.active = false;
        this.startButton.on(Node.EventType.MOUSE_DOWN, this.onStartGame, this);
        this.albumButton.on(Node.EventType.MOUSE_DOWN, this.onOpenAlbum, this);
        this.plusButton.on(Node.EventType.MOUSE_DOWN, this.onOpenEnergy, this);
    }

    onDisable() {
        this.unschedule(this.tick);
        this.startButton.off(Node.EventType.MOUSE_DOWN, this.onStartGame, this);
        this.albumButton.off(Node.EventType.MOUSE_DOWN, this.onOpenAlbum, this);
        this.plusButton.off(Node.EventType.MOUSE_DOWN, this.onOpenEnergy, this);
    }

    private formatMs(ms: number) {
        const s = Math.max(0, Math.floor(ms / 1000));
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        return `${mm}:${ss}`;
    }

    private tick() {
        const s = this.em.tick();
        const next = this.em.getNextRecoverMs();
        this.energyLabel.string = `剩余: ${s.remaining}/${this.em.getMax()}`;
        if (next !== null) {
            this.countdownLabel.string = `下次恢复: ${this.formatMs(next)}`;
        } else {
            this.countdownLabel.string = '';
        }
        this.plusButton.active = s.remaining < this.em.getMax();
    }

    private updateEnergyUI() {
        const s = this.em.load();
        const next = this.em.getNextRecoverMs();
        this.energyLabel.string = `剩余: ${s.remaining}/${this.em.getMax()}`;
        if (next !== null) {
            this.countdownLabel.string = `下次恢复: ${this.formatMs(next)}`;
        } else {
            this.countdownLabel.string = '';
        }
        this.plusButton.active = s.remaining < this.em.getMax();
    }

    private onStartGame() {
        if (this.em.consumeOne()) {
            director.loadScene('Game');
        } else {
            this.onOpenEnergy();
        }
    }

    private onOpenAlbum() {
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
}
