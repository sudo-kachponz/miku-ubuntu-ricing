import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
const TRANSITION = {
    'none': Gtk.RevealerTransitionType.NONE,
    'crossfade': Gtk.RevealerTransitionType.CROSSFADE,
    'slide_right': Gtk.RevealerTransitionType.SLIDE_RIGHT,
    'slide_left': Gtk.RevealerTransitionType.SLIDE_LEFT,
    'slide_up': Gtk.RevealerTransitionType.SLIDE_UP,
    'slide_down': Gtk.RevealerTransitionType.SLIDE_DOWN,
};
export function newRevealer(...props) {
    return new Revealer(...props);
}
export class Revealer extends Gtk.Revealer {
    static {
        register(this, {
            properties: { 'transition': ['string', 'rw'] },
        });
    }
    constructor(props = {}, child) {
        if (child)
            props.child = child;
        super(props);
        this.connect('notify::transition-type', () => this.notify('transition'));
    }
    get child() { return super.child; }
    set child(child) { super.child = child; }
    get transition() {
        return Object.keys(TRANSITION).find(key => {
            return TRANSITION[key] === this.transition_type;
        });
    }
    set transition(transition) {
        if (this.transition === transition)
            return;
        if (!Object.keys(TRANSITION).includes(transition)) {
            console.error(Error(`transition on Revealer has to be one of ${Object.keys(TRANSITION)}, ` +
                `but it is ${transition}`));
            return;
        }
        this.transition_type = TRANSITION[transition];
    }
}
export default Revealer;
