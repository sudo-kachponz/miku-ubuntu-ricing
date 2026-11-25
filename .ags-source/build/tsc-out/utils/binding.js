import { Variable } from '../variable.js';
import { kebabify } from './gobject.js';
export function merge(deps, fn) {
    const update = () => fn(...deps.map(d => d.transformFn(d.emitter[d.prop])));
    const watcher = new Variable(update());
    for (const dep of deps)
        dep.emitter.connect(`notify::${kebabify(dep.prop)}`, () => watcher.value = update());
    return watcher.bind();
}
export function derive(deps, fn) {
    const update = () => fn(...deps.map(d => d.value));
    const watcher = new Variable(update());
    for (const dep of deps)
        dep.connect('changed', () => watcher.value = update());
    return watcher;
}
export function watch(init, objs, sigOrFn, callback) {
    const v = new Variable(init);
    const f = typeof sigOrFn === 'function' ? sigOrFn : callback ?? (() => v.value);
    const set = () => v.value = f();
    if (Array.isArray(objs)) {
        // multiple objects
        for (const obj of objs) {
            if (Array.isArray(obj)) {
                // obj signal pair
                const [o, s = 'changed'] = obj;
                o.connect(s, set);
            }
            else {
                // obj on changed
                obj.connect('changed', set);
            }
        }
    }
    else {
        // watch single object
        const signal = typeof sigOrFn === 'string' ? sigOrFn : 'changed';
        objs.connect(signal, set);
    }
    return v.bind();
}
