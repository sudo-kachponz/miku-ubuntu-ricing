import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newFontButton(...props) {
    return new FontButton(...props);
}
export class FontButton extends Gtk.FontButton {
    static {
        register(this, {
            properties: {
                'on-font-set': ['jsobject', 'rw'],
            },
        });
    }
    constructor(props = {}, child) {
        if (child)
            props.child = child;
        super(props);
        this.connect('font-set', this.on_font_set.bind(this));
    }
    get child() { return super.child; }
    set child(child) { super.child = child; }
    get on_font_set() { return this._get('on-font-set') || (() => false); }
    set on_font_set(callback) { this._set('on-font-set', callback); }
}
export default FontButton;
