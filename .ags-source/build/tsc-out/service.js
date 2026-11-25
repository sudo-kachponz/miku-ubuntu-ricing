import GObject from 'gi://GObject';
import { pspec, registerGObject } from './utils/gobject.js';
export class Binding {
    emitter;
    prop;
    transformFn = (v) => v; // see #262
    constructor(emitter, prop) {
        this.emitter = emitter;
        this.prop = prop;
    }
    /** alias for transform */
    as(fn) { return this.transform(fn); }
    transform(fn) {
        const bind = new Binding(this.emitter, this.prop);
        const prev = this.transformFn;
        bind.transformFn = (v) => fn(prev(v));
        return bind;
    }
}
export default class Service extends GObject.Object {
    static {
        GObject.registerClass({
            GTypeName: 'AgsService',
            Signals: { 'changed': {} },
        }, this);
    }
    static async import(service) {
        return (await import(`./service/${service}.js`)).default;
    }
    static pspec(name, type = 'jsobject', handle = 'r') {
        return pspec(name, type, handle);
    }
    static register(service, signals, properties) {
        registerGObject(service, { signals, properties });
    }
    connect(signal = 'changed', callback) {
        return super.connect(signal, callback);
    }
    updateProperty(prop, value) {
        if (this[prop] === value ||
            JSON.stringify(this[prop]) === JSON.stringify(value))
            return;
        const privateProp = prop
            .split('-')
            .map((w, i) => i > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)
            .join('');
        // @ts-expect-error
        this[`_${privateProp}`] = value;
        this.notify(prop);
    }
    changed(property) {
        this.notify(property);
        this.emit('changed');
    }
    bind(prop) {
        return new Binding(this, prop);
    }
}
