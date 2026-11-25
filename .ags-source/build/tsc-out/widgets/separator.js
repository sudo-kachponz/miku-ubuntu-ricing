import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newSeparator(...props) {
    return new Separator(...props);
}
export class Separator extends Gtk.Separator {
    static {
        register(this, {
            properties: {
                'vertical': ['boolean', 'rw'],
            },
        });
    }
    constructor(props = {}) {
        super(props);
        this.connect('notify::orientation', () => this.notify('vertical'));
    }
    get vertical() { return this.orientation === Gtk.Orientation.VERTICAL; }
    set vertical(v) {
        this.orientation = Gtk.Orientation[v ? 'VERTICAL' : 'HORIZONTAL'];
    }
}
export default Separator;
