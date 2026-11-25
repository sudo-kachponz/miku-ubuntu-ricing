import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newMenuItem(...props) {
    return new MenuItem(...props);
}
export class MenuItem extends Gtk.MenuItem {
    static {
        register(this, {
            properties: {
                'on-activate': ['jsobject', 'rw'],
                'on-select': ['jsobject', 'rw'],
                'on-deselect': ['jsobject', 'rw'],
            },
        });
    }
    constructor(props = {}, child) {
        if (child)
            props.child = child;
        super(props);
        this.connect('activate', () => this.on_activate?.(this));
        this.connect('select', () => this.on_select?.(this));
        this.connect('deselect', () => this.on_deselect?.(this));
    }
    get child() { return super.child; }
    set child(child) { super.child = child; }
    get on_activate() { return this._get('on-activate'); }
    set on_activate(callback) {
        this._set('on-activate', callback);
    }
    get on_select() { return this._get('on-select'); }
    set on_select(callback) {
        this._set('on-select', callback);
    }
    get on_deselect() { return this._get('on-deselect'); }
    set on_deselect(callback) {
        this._set('on-deselect', callback);
    }
}
export default MenuItem;
