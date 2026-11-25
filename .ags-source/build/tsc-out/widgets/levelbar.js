import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newLevelBar(...props) {
    return new LevelBar(...props);
}
export class LevelBar extends Gtk.LevelBar {
    static {
        register(this, {
            properties: {
                'bar-mode': ['string', 'rw'],
                'vertical': ['boolean', 'rw'],
            },
        });
    }
    constructor(props = {}) {
        super(props);
        this.connect('notify::mode', () => this.notify('bar-mode'));
        this.connect('notify::orientation', () => this.notify('vertical'));
    }
    get bar_mode() {
        return this.mode === Gtk.LevelBarMode.CONTINUOUS ? 'continuous' : 'discrete';
    }
    set bar_mode(mode) {
        this.mode = Gtk.LevelBarMode[mode === 'continuous' ? 'CONTINUOUS' : 'DISCRETE'];
    }
    get vertical() { return this.orientation === Gtk.Orientation.VERTICAL; }
    set vertical(v) {
        this.orientation = Gtk.Orientation[v ? 'VERTICAL' : 'HORIZONTAL'];
    }
}
export default LevelBar;
