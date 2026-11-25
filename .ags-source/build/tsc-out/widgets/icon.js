import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';
import Gdk from 'gi://Gdk?version=3.0';
import { lookUpIcon } from '../utils.js';
export function newIcon(...props) {
    return new Icon(...props);
}
export class Icon extends Gtk.Image {
    static {
        register(this, {
            properties: {
                'size': ['double', 'rw'],
                'icon': ['jsobject', 'rw'],
            },
        });
    }
    constructor(props = {}) {
        const { icon = '', ...rest } = props;
        super(typeof props === 'string' || props instanceof GdkPixbuf.Pixbuf
            ? {}
            : rest);
        // jsobject pspec can't take a string, so we have to set it after the constructor
        this._handleParamProp('icon', typeof props === 'string' || props instanceof GdkPixbuf.Pixbuf
            ? props : icon);
    }
    get size() { return this._get('size') || this._fontSize || 0; }
    set size(size) {
        this._set('size', size);
        this.queue_draw();
    }
    get icon() { return this._get('icon'); }
    set icon(icon) {
        this._set('icon', icon);
        this._set('type', 'named', false);
        if (typeof icon === 'string') {
            if (lookUpIcon(icon)) {
                this._set('type', 'named', false);
            }
            else if (GLib.file_test(icon, GLib.FileTest.EXISTS)) {
                this._set('type', 'file', false);
            }
            else if (icon !== '') {
                console.warn(Error(`can't assign "${icon}" as icon, ` +
                    'it is not a file nor a named icon'));
            }
        }
        else if (icon instanceof GdkPixbuf.Pixbuf) {
            this._set('type', 'pixbuf', false);
        }
        else {
            console.warn(Error(`expected Pixbuf or string for icon, but got ${typeof icon}`));
        }
        this._size();
    }
    _previousSize = 0;
    _fontSize = 0;
    _size() {
        if (this.size === 0)
            return;
        const type = this._get('type');
        this._previousSize = this.size;
        if (type === 'file') {
            const pb = GdkPixbuf.Pixbuf.new_from_file_at_size(this.icon, this.size * this.scale_factor, this.size * this.scale_factor);
            const cs = Gdk.cairo_surface_create_from_pixbuf(pb, 0, this.get_window());
            this.set_from_surface(cs);
        }
        else if (type === 'named') {
            this.icon_name = this.icon;
            this.pixel_size = this.size;
        }
        else if (type === 'pixbuf') {
            const pb_scaled = this.icon.scale_simple(this.size * this.scale_factor, this.size * this.scale_factor, GdkPixbuf.InterpType.BILINEAR);
            if (pb_scaled) {
                const cs = Gdk.cairo_surface_create_from_pixbuf(pb_scaled, 0, this.get_window());
                this.set_from_surface(cs);
            }
        }
    }
    vfunc_draw(cr) {
        this._fontSize = this.get_style_context()
            .get_property('font-size', Gtk.StateFlags.NORMAL);
        if (this._previousSize !== this.size)
            this._size();
        return super.vfunc_draw(cr);
    }
}
export default Icon;
