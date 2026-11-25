import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newEntry(...props) {
    return new Entry(...props);
}
export class Entry extends Gtk.Entry {
    static {
        register(this, {
            properties: {
                'on-accept': ['jsobject', 'rw'],
                'on-change': ['jsobject', 'rw'],
            },
        });
    }
    constructor(props = {}) {
        super(props);
        this.connect('activate', () => this.on_accept?.(this));
        this.connect('notify::text', () => this.on_change?.(this));
    }
    get on_accept() { return this._get('on-accept'); }
    set on_accept(callback) {
        this._set('on-accept', callback);
    }
    get on_change() { return this._get('on-change'); }
    set on_change(callback) {
        this._set('on-change', callback);
    }
}
export default Entry;
