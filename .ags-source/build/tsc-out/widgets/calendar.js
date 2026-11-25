import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newCalendar(...props) {
    return new Calendar(...props);
}
export class Calendar extends Gtk.Calendar {
    static {
        register(this, {
            properties: {
                'date': ['jsobject', 'r'],
                'on-day-selected': ['jsobject', 'rw'],
                'detail': ['jsobject', 'rw'],
            },
        });
    }
    constructor(props = {}) {
        super(props);
        this.connect('notify::day', () => this.notify('date'));
        this.connect('notify::month', () => this.notify('date'));
        this.connect('notify::year', () => this.notify('date'));
        this.connect('day-selected', this.on_day_selected.bind(this));
    }
    get date() { return this.get_date(); }
    get on_day_selected() { return this._get('on-day-selected') || (() => false); }
    set on_day_selected(callback) { this._set('on-day-selected', callback); }
    get detail() { return this._get('detail-func'); }
    set detail(func) {
        this._set('detail-func', func);
        this.set_detail_func((self, ...date) => func(self, ...date));
    }
}
export default Calendar;
