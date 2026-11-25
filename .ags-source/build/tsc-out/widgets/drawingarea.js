import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newDrawingArea(...props) {
    return new DrawingArea(...props);
}
export class DrawingArea extends Gtk.DrawingArea {
    static {
        register(this, {
            properties: {
                'draw-fn': ['jsobject', 'rw'],
            },
        });
    }
    constructor(props = {}) {
        super(props);
        this.connect('draw', (self, cr) => {
            const w = this.get_allocated_width();
            const h = this.get_allocated_height();
            this.draw_fn(self, cr, w, h);
        });
    }
    get draw_fn() { return this._get('draw-fn') || (() => undefined); }
    set draw_fn(fn) { this._set('draw-fn', fn); }
}
export default DrawingArea;
