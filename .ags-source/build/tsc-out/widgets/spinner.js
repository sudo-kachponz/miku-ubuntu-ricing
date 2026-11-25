import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newSpinner(...props) {
    return new Spinner(...props);
}
export class Spinner extends Gtk.Spinner {
    static { register(this); }
    constructor(props = {}) {
        super(props);
        this.start();
        this.connect('notify::visible', ({ visible }) => {
            visible ? this.start() : this.stop();
        });
    }
}
export default Spinner;
