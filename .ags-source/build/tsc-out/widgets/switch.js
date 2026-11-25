import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newSwitch(...props) {
    return new Switch(...props);
}
export class Switch extends Gtk.Switch {
    static {
        register(this, {
            properties: {
                'on-activate': ['jsobject', 'rw'],
            },
        });
    }
    constructor(props = {}) {
        super(props);
        this.connect('notify::active', this.on_activate.bind(this));
    }
    get on_activate() { return this._get('on-activate') || (() => false); }
    set on_activate(callback) { this._set('on-activate', callback); }
}
export default Switch;
