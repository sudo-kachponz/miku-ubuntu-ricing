import GLib from 'gi://GLib';
export function interval(interval, callback, bind) {
    callback();
    const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
        callback();
        return true;
    });
    if (bind)
        bind.connect('destroy', () => GLib.source_remove(id));
    return id;
}
export function timeout(ms, callback) {
    return GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
        callback();
        return GLib.SOURCE_REMOVE;
    });
}
export function idle(callback, prio = GLib.PRIORITY_DEFAULT) {
    return GLib.idle_add(prio, () => {
        callback();
        return GLib.SOURCE_REMOVE;
    });
}
