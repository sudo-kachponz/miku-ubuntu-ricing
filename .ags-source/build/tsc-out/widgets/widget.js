import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk?version=3.0';
import GLib from 'gi://GLib?version=2.0';
import Gdk from 'gi://Gdk?version=3.0';
import Cairo from 'gi://cairo?version=1.0';
import { Binding } from '../service.js';
import { registerGObject, kebabify } from '../utils/gobject.js';
import { interval, idle } from '../utils.js';
let warned = false;
function deprecated() {
    if (warned)
        return;
    console.warn(Error('Using "connections" and "binds" props are DEPRECATED\n' +
        'Use .hook() .bind() .poll() .on() instead, refer to the wiki to see examples'));
    warned = true;
}
const ALIGN = {
    'fill': Gtk.Align.FILL,
    'start': Gtk.Align.START,
    'end': Gtk.Align.END,
    'center': Gtk.Align.CENTER,
    'baseline': Gtk.Align.BASELINE,
};
export class AgsWidget extends Gtk.Widget {
    set attribute(attr) { this._set('attribute', attr); }
    get attribute() { return this._get('attribute'); }
    hook(gobject, callback, signal) {
        const con = typeof gobject?.connect !== 'function';
        const discon = typeof gobject?.disconnect !== 'function';
        if (con || discon) {
            console.error(Error(`${gobject} is not a Connectable, missing ` +
                ` ${[con ? 'connect' : '', discon ? 'disconnect' : ''].join(', ')} function`));
            return this;
        }
        const id = gobject.connect(signal, (_, ...args) => {
            callback(this, ...args);
        });
        this.connect('destroy', () => {
            gobject.disconnect(id);
        });
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            if (!this.is_destroyed)
                callback(this);
            return GLib.SOURCE_REMOVE;
        });
        return this;
    }
    bind(prop, gobject, objProp, transform) {
        const targetProp = objProp || 'value';
        const callback = transform
            ? () => {
                // @ts-expect-error too lazy to type
                this[prop] = transform(gobject[targetProp]);
            }
            : () => {
                // @ts-expect-error too lazy to type
                this[prop] = gobject[targetProp];
            };
        this.hook(gobject, callback, `notify::${kebabify(targetProp)}`);
        return this;
    }
    on(signal, callback) {
        this.connect(signal, callback);
        return this;
    }
    poll(timeout, callback) {
        interval(timeout, () => callback(this), this);
        return this;
    }
    keybind(modsOrKey, keyOrCallback, callback) {
        const mods = callback ? modsOrKey : [];
        const key = callback ? keyOrCallback : modsOrKey;
        const fn = callback ? callback : keyOrCallback;
        this.connect('key-press-event', (_, event) => {
            const k = event.get_keyval()[1];
            const m = event.get_state()[1];
            const ms = mods.reduce((ms, m) => ms | Gdk.ModifierType[`${m}_MASK`], 0);
            if (mods.length > 0 && k === Gdk[`KEY_${key}`] && m === ms)
                return fn(this, event);
            if (mods.length === 0 && k === Gdk[`KEY_${key}`])
                return fn(this, event);
        });
        return this;
    }
    _init(config = {}, child) {
        const { setup, attribute, ...props } = config;
        const binds = Object.keys(props)
            .map(prop => {
            if (props[prop] instanceof Binding) {
                const bind = [prop, props[prop]];
                delete props[prop];
                return bind;
            }
        })
            .filter(pair => pair);
        if (child)
            props.child = child;
        super._init(props);
        if (attribute !== undefined)
            this._set('attribute', attribute);
        binds
            .forEach(([selfProp, { emitter, prop, transformFn }]) => {
            this.bind(selfProp, emitter, prop, transformFn);
        });
        this.add_events(Gdk.EventMask.ENTER_NOTIFY_MASK);
        this.add_events(Gdk.EventMask.LEAVE_NOTIFY_MASK);
        this.connect('enter-notify-event', this._updateCursor.bind(this));
        this.connect('leave-notify-event', this._updateCursor.bind(this));
        this.connect('destroy', () => this._set('is-destroyed', true));
        idle(() => {
            if (this.click_through && !this.is_destroyed)
                this.input_shape_combine_region(new Cairo.Region);
        });
        if (setup)
            setup(this);
    }
    _handleParamProp(prop, value) {
        if (value === undefined)
            return;
        if (value instanceof Binding)
            // @ts-expect-error implementation in Connectable
            this.bind(prop, value.emitter, value.prop, value.transformFn);
        else
            this[prop] = value;
    }
    get is_destroyed() { return this._get('is-destroyed') || false; }
    // defining private fields for typescript causes
    // gobject constructor field setters to be overridden
    // so we use this _get and _set to avoid @ts-expect-error everywhere
    _get(field) {
        return this[`__${field}`];
    }
    _set(field, value, notify = true) {
        if (this._get(field) === value)
            return;
        this[`__${field}`] = value;
        if (notify)
            this.notify(field);
    }
    // FIXME: deprecated
    set connections(connections) {
        if (!connections)
            return;
        deprecated();
        connections.forEach(([s, callback, event]) => {
            if (s === undefined || callback === undefined)
                return console.error(Error('missing arguments to connections'));
            if (typeof s === 'string')
                this.connect(s, callback);
            else if (typeof s === 'number')
                interval(s, () => callback(this), this);
            else if (s instanceof GObject.Object)
                this.hook(s, callback, event);
            else
                console.error(Error(`${s} is not a GObject | string | number`));
        });
    }
    // FIXME: deprecated
    set binds(binds) {
        if (!binds)
            return;
        deprecated();
        binds.forEach(([prop, obj, objProp = 'value', transform = out => out]) => {
            // @ts-expect-error
            this.bind(prop, obj, objProp, transform);
        });
    }
    // FIXME: deprecated
    set properties(properties) {
        if (!properties)
            return;
        console.warn(Error('"properties" is deprecated use "attribute" instead'));
        properties.forEach(([key, value]) => {
            this[`_${key}`] = value;
        });
    }
    // FIXME: deprecated
    connectTo(gobject, callback, signal) {
        console.warn(Error('connectTo was renamed to hook'));
        return this.hook(gobject, callback, signal);
    }
    _setPack(orientation, align) {
        if (!align)
            return;
        if (!Object.keys(ALIGN).includes(align)) {
            return console.error(Error(`${orientation}pack has to be on of ${Object.keys(ALIGN)}, but it is ${align}`));
        }
        this[`${orientation}align`] = ALIGN[align];
    }
    _getPack(orientation) {
        return Object.keys(ALIGN).find(align => {
            return ALIGN[align] === this[`${orientation}align`];
        });
    }
    get hpack() { return this._getPack('h'); }
    set hpack(align) { this._setPack('h', align); }
    get vpack() { return this._getPack('v'); }
    set vpack(align) { this._setPack('v', align); }
    toggleClassName(className, condition = true) {
        const c = this.get_style_context();
        condition
            ? c.add_class(className)
            : c.remove_class(className);
        this.notify('class-names');
        this.notify('class-name');
    }
    get class_name() {
        return this.class_names.join(' ');
    }
    set class_name(names) {
        this.class_names = names.split(/\s+/);
    }
    get class_names() {
        return this.get_style_context().list_classes() || [];
    }
    set class_names(names) {
        this.class_names.forEach((cn) => this.toggleClassName(cn, false));
        names.forEach(cn => this.toggleClassName(cn));
    }
    _cssProvider;
    setCss(css) {
        if (!css.includes('{') || !css.includes('}'))
            css = `* { ${css} }`;
        if (this._cssProvider)
            this.get_style_context().remove_provider(this._cssProvider);
        this._cssProvider = new Gtk.CssProvider();
        this._cssProvider.load_from_data(new TextEncoder().encode(css));
        this.get_style_context()
            .add_provider(this._cssProvider, Gtk.STYLE_PROVIDER_PRIORITY_USER);
        this.notify('css');
    }
    get css() {
        return this._cssProvider?.to_string() || '';
    }
    set css(css) {
        if (!css)
            return;
        this.setCss(css);
    }
    _updateCursor() {
        if (!this.cursor)
            return;
        const display = Gdk.Display.get_default();
        if (this.isHovered() && display) {
            const cursor = Gdk.Cursor.new_from_name(display, this.cursor);
            this.get_window()?.set_cursor(cursor);
        }
        else if (display) {
            const cursor = Gdk.Cursor.new_from_name(display, 'default');
            this.get_window()?.set_cursor(cursor);
        }
    }
    get cursor() { return this._get('cursor'); }
    set cursor(cursor) {
        this._set('cursor', cursor);
        this._updateCursor();
    }
    isHovered(event) {
        let [x, y] = this.get_pointer();
        const { width: w, height: h } = this.get_allocation();
        if (event)
            [, x, y] = event.get_coords();
        return x > 0 && x < w && y > 0 && y < h;
    }
    get click_through() { return !!this._get('click-through'); }
    set click_through(clickThrough) {
        if (this.click_through === clickThrough)
            return;
        const value = clickThrough ? new Cairo.Region : null;
        this.input_shape_combine_region(value);
        this._set('click-through', value);
        this.notify('click-through');
    }
}
export function register(klass, config) {
    Object.getOwnPropertyNames(AgsWidget.prototype).forEach(name => {
        Object.defineProperty(klass.prototype, name, Object.getOwnPropertyDescriptor(AgsWidget.prototype, name) ||
            Object.create(null));
    });
    return registerGObject(klass, {
        cssName: config?.cssName,
        typename: config?.typename || `Ags_${klass.name}`,
        signals: config?.signals,
        properties: {
            ...config?.properties,
            'class-name': ['string', 'rw'],
            'class-names': ['jsobject', 'rw'],
            'css': ['string', 'rw'],
            'hpack': ['string', 'rw'],
            'vpack': ['string', 'rw'],
            'cursor': ['string', 'rw'],
            'is-destroyed': ['boolean', 'r'],
            'attribute': ['jsobject', 'rw'],
            'click-through': ['boolean', 'rw'],
            // FIXME: deprecated
            'properties': ['jsobject', 'w'],
            'connections': ['jsobject', 'w'],
            'binds': ['jsobject', 'w'],
        },
    });
}
// FIXME: backwards compatibility
export default function W(klass) {
    return klass;
}
W.register = register;
