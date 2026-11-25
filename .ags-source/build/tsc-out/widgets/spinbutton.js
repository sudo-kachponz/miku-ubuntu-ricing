import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newSpinButton(...props) {
    return new SpinButton(...props);
}
export class SpinButton extends Gtk.SpinButton {
    static {
        register(this, {
            properties: {
                'on-value-changed': ['jsobject', 'rw'],
                'range': ['jsobject', 'rw'],
                'increments': ['jsobject', 'rw'],
            },
        });
    }
    constructor(props = {}) {
        super(props);
        this.connect('value-changed', this.on_value_changed.bind(this));
    }
    get on_value_changed() { return this._get('on-value-changed') || (() => false); }
    set on_value_changed(callback) { this._set('on-value-changed', callback); }
    get range() { return this.get_range(); }
    set range([min, max]) {
        if (typeof min === 'number' && typeof max === 'number')
            this.set_range(min, max);
    }
    get increments() { return this.get_increments(); }
    set increments([step, page]) {
        if (typeof step === 'number' && typeof page === 'number')
            this.set_increments(step, page);
    }
}
export default SpinButton;
