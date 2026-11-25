import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
const POLICY = {
    'automatic': Gtk.PolicyType.AUTOMATIC,
    'always': Gtk.PolicyType.ALWAYS,
    'never': Gtk.PolicyType.NEVER,
    'external': Gtk.PolicyType.EXTERNAL,
};
export function newScrollable(...props) {
    return new Scrollable(...props);
}
export class Scrollable extends Gtk.ScrolledWindow {
    static {
        register(this, {
            properties: {
                'hscroll': ['string', 'rw'],
                'vscroll': ['string', 'rw'],
            },
        });
    }
    constructor(props = {}, child) {
        if (child)
            props.child = child;
        super({
            ...props,
            hadjustment: new Gtk.Adjustment(),
            vadjustment: new Gtk.Adjustment(),
        });
        this.connect('destroy', () => {
            if (this.child instanceof Gtk.Viewport)
                this.child.child.destroy();
        });
    }
    get child() { return super.child; }
    set child(child) {
        if (this.child instanceof Gtk.Viewport)
            this.child.child = child;
        else
            super.child = child;
    }
    setScroll(orientation, scroll) {
        if (!scroll || this[`${orientation}scroll`] === scroll)
            return;
        if (!Object.keys(POLICY).includes(scroll)) {
            return console.error(Error(`${orientation}scroll has to be one of ${Object.keys(POLICY)}, but it is ${scroll}`));
        }
        this._set(`${orientation}scroll`, scroll);
        this._policy();
    }
    get hscroll() { return this._get('hscroll'); }
    set hscroll(hscroll) { this.setScroll('h', hscroll); }
    get vscroll() { return this._get('vscroll'); }
    set vscroll(vscroll) { this.setScroll('v', vscroll); }
    _policy() {
        const hscroll = POLICY[this.hscroll];
        const vscroll = POLICY[this.vscroll];
        this.set_policy(hscroll === -1 ? Gtk.PolicyType.AUTOMATIC : hscroll, vscroll === -1 ? Gtk.PolicyType.AUTOMATIC : vscroll);
    }
}
export default Scrollable;
