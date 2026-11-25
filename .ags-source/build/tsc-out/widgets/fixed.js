import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newFixed(...props) {
    return new Fixed(...props);
}
export class Fixed extends Gtk.Fixed {
    static { register(this); }
    constructor(props = {}) {
        super(props);
    }
}
export default Fixed;
