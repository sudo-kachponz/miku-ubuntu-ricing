import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newOverlay(...props) {
    return new Overlay(...props);
}
export class Overlay extends Gtk.Overlay {
    static {
        register(this, {
            properties: {
                'pass-through': ['boolean', 'rw'],
                'overlays': ['jsobject', 'rw'],
                'overlay': ['jsobject', 'rw'],
            },
        });
    }
    constructor(props = {}, child, ...overlays) {
        if (child)
            props.child = child;
        if (overlays.length > 0)
            props.overlays = overlays;
        super(props);
    }
    _updatePassThrough() {
        this.get_children().forEach(ch => this.set_overlay_pass_through(ch, this._get('pass-through')));
    }
    get pass_through() { return this._get('pass-through'); }
    set pass_through(passthrough) {
        if (this.pass_through === passthrough)
            return;
        this._set('pass-through', passthrough);
        this._updatePassThrough();
        this.notify('pass-through');
    }
    get overlay() { return this.overlays[0]; }
    set overlay(overlay) {
        this.overlays = [overlay];
        this.notify('overlay');
    }
    get overlays() {
        return this.get_children().filter(ch => ch !== this.child);
    }
    set overlays(overlays) {
        this.get_children()
            .filter(ch => ch !== this.child && !overlays.includes(ch))
            .forEach(ch => ch.destroy());
        this.get_children()
            .filter(ch => ch !== this.child)
            .forEach(ch => this.remove(ch));
        overlays.forEach(ch => this.add_overlay(ch));
        this._updatePassThrough();
        this.notify('overlays');
    }
}
export default Overlay;
