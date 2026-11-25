import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newColorButton(...props) {
    return new ColorButton(...props);
}
export class ColorButton extends Gtk.ColorButton {
    static {
        register(this, {
            properties: {
                'on-color-set': ['jsobject', 'rw'],
            },
        });
    }
    constructor(props = {}, child) {
        if (child)
            props.child = child;
        super(props);
        this.connect('color-set', this.on_color_set.bind(this));
    }
    get child() { return super.child; }
    set child(child) { super.child = child; }
    get on_color_set() { return this._get('on-color-set') || (() => false); }
    set on_color_set(callback) { this._set('on-color-set', callback); }
}
export default ColorButton;
