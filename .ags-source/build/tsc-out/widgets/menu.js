import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newMenu(...props) {
    return new Menu(...props);
}
export class Menu extends Gtk.Menu {
    static {
        register(this, {
            properties: {
                'children': ['jsobject', 'rw'],
                'on-popup': ['jsobject', 'rw'],
                'on-move-scroll': ['jsobject', 'rw'],
            },
        });
    }
    constructor(props = {}, ...children) {
        if (children.length > 0)
            props.children = children;
        super(props);
        this.connect('popped-up', (_, ...args) => this.on_popup?.(this, ...args));
        this.connect('move-scroll', (_, ...args) => this.on_move_scroll?.(this, ...args));
    }
    get on_popup() { return this._get('on-popup'); }
    set on_popup(callback) {
        this._set('on-popup', callback);
    }
    get on_move_scroll() { return this._get('on-move-scroll'); }
    set on_move_scroll(callback) {
        this._set('on-move-scroll', callback);
    }
    get children() { return this.get_children(); }
    set children(children) {
        this.get_children().forEach(ch => ch.destroy());
        if (!children)
            return;
        children.forEach(w => w && this.add(w));
        const visible = this.visible;
        this.show_all();
        this.visible = visible;
    }
}
export default Menu;
