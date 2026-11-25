import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newToggleButton(...props) {
    return new ToggleButton(...props);
}
export class ToggleButton extends Gtk.ToggleButton {
    static {
        register(this, {
            properties: {
                'on-toggled': ['jsobject', 'rw'],
            },
        });
    }
    constructor(props = {}, child) {
        if (child)
            props.child = child;
        super(props);
        this.connect('toggled', this.on_toggled.bind(this));
    }
    get child() { return super.child; }
    set child(child) { super.child = child; }
    get on_toggled() { return this._get('on-toggled') || (() => false); }
    set on_toggled(callback) { this._set('on-toggled', callback); }
}
