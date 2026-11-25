import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newProgressBar(...props) {
    return new ProgressBar(...props);
}
export class ProgressBar extends Gtk.ProgressBar {
    static {
        register(this, {
            properties: {
                'vertical': ['boolean', 'rw'],
                'value': ['float', 'rw'],
            },
        });
    }
    constructor(props = {}) {
        super(props);
        this.connect('notify::fraction', () => this.notify('value'));
        this.connect('notify::orientation', () => this.notify('vertical'));
    }
    get value() { return this.fraction; }
    set value(value) { this.fraction = value; }
    get vertical() { return this.orientation === Gtk.Orientation.VERTICAL; }
    set vertical(v) {
        this.orientation = Gtk.Orientation[v ? 'VERTICAL' : 'HORIZONTAL'];
    }
}
export default ProgressBar;
