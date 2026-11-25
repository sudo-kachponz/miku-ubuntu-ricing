import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
export function readFile(file) {
    try {
        const f = typeof file === 'string'
            ? Gio.File.new_for_path(file)
            : file;
        const [, bytes] = f.load_contents(null);
        return new TextDecoder().decode(bytes);
    }
    catch (_) {
        return '';
    }
}
export function readFileAsync(file) {
    const f = typeof file === 'string'
        ? Gio.File.new_for_path(file)
        : file;
    return new Promise((resolve, reject) => {
        f.load_contents_async(null, (_, res) => {
            try {
                const [success, bytes] = f.load_contents_finish(res);
                if (success) {
                    resolve(new TextDecoder().decode(bytes));
                }
                else {
                    const path = typeof file === 'string' ? file : file.get_path();
                    reject(Error(`reading file ${path} was unsuccessful`));
                }
            }
            catch (error) {
                reject(error);
            }
        });
    });
}
export function writeFile(string, path) {
    const file = Gio.File.new_for_path(path);
    return new Promise((resolve, reject) => {
        file.replace_contents_bytes_async(new GLib.Bytes(new TextEncoder().encode(string)), null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null, (_, res) => {
            try {
                file.replace_contents_finish(res);
                resolve(file);
            }
            catch (error) {
                reject(error);
            }
        });
    });
}
export function writeFileSync(string, path) {
    const file = Gio.File.new_for_path(path);
    file.replace_contents(new TextEncoder().encode(string), null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
    return file;
}
const fileMonitors = new Map;
export function monitorFile(path, callback, options = {
    flags: Gio.FileMonitorFlags.NONE,
    recursive: true,
}) {
    // FIXME: remove the checking in the next release
    if (typeof options === 'number') {
        console.warn(`${options}` +
            ' passed as a parameter in `options`.\n' +
            'options parameter should be {flags: Gio.FileMonitorFlags, recursive: boolean}.');
    }
    try {
        const file = Gio.File.new_for_path(path);
        const mon = file.monitor(options.flags, null);
        if (callback)
            mon.connect('changed', (_, file, _f, event) => callback(file, event));
        if (options.recursive && GLib.file_test(path, GLib.FileTest.IS_DIR)) {
            const enumerator = file.enumerate_children('standard::*', Gio.FileQueryInfoFlags.NONE, null);
            let i = enumerator.next_file(null);
            while (i) {
                if (i.get_file_type() === Gio.FileType.DIRECTORY) {
                    const path = file.get_child(i.get_name()).get_path();
                    if (path)
                        monitorFile(path, callback, options);
                }
                i = enumerator.next_file(null);
            }
        }
        // we need to save a reference in case the user doesn't
        // otherwise GC will pick it up
        fileMonitors.set(mon, true);
        mon.connect('notify::cancelled', () => {
            fileMonitors.delete(mon);
        });
        return mon;
    }
    catch (error) {
        logError(error);
        return null;
    }
}
