import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
const JUSTIFICATION = {
    'left': Gtk.Justification.LEFT,
    'right': Gtk.Justification.RIGHT,
    'center': Gtk.Justification.CENTER,
    'fill': Gtk.Justification.FILL,
};
const TRUNCATE = {
    'none': Pango.EllipsizeMode.NONE,
    'start': Pango.EllipsizeMode.START,
    'middle': Pango.EllipsizeMode.MIDDLE,
    'end': Pango.EllipsizeMode.END,
};
export function newLabel(...props) {
    return new Label(...props);
}
export class Label extends Gtk.Label {
    static {
        register(this, {
            properties: {
                'justification': ['string', 'rw'],
                'truncate': ['string', 'rw'],
            },
        });
    }
    constructor(props = {}) {
        const { label, ...config } = props;
        const text = typeof props === 'string' ? props : label;
        super(typeof props === 'string' ? {} : config);
        this._handleParamProp('label', text || '');
        this.connect('notify::justify', () => this.notify('justification'));
        this.connect('notify::ellipsize', () => this.notify('truncate'));
    }
    get label() { return super.label || ''; }
    set label(label) {
        if (this.use_markup) {
            try {
                Pango.parse_markup(label, -1, '0');
            }
            catch (e) {
                // @ts-expect-error
                if (e instanceof GLib.MarkupError)
                    label = GLib.markup_escape_text(label, -1) || '';
                else
                    logError(e);
            }
        }
        super.label = label;
    }
    get truncate() {
        return Object.keys(TRUNCATE).find(key => {
            return TRUNCATE[key] === this.ellipsize;
        });
    }
    set truncate(truncate) {
        if (this.truncate === truncate)
            return;
        if (!Object.keys(TRUNCATE).includes(truncate)) {
            console.error(Error(`truncate for Label has to be one of ${Object.keys(TRUNCATE)}, ` +
                `but it is ${truncate}`));
            return;
        }
        this.ellipsize = TRUNCATE[truncate];
    }
    get justification() {
        return Object.keys(JUSTIFICATION).find(key => {
            return JUSTIFICATION[key] === this.justify;
        });
    }
    set justification(justify) {
        if (this.justification === justify)
            return;
        if (!Object.keys(JUSTIFICATION).includes(justify)) {
            console.error(Error(`justify for Label has to be one of ${Object.keys(JUSTIFICATION)}, ` +
                `but it is ${justify}`));
            return;
        }
        this.justify = JUSTIFICATION[justify];
    }
}
export default Label;
