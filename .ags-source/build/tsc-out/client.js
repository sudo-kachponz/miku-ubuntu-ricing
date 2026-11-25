import Gtk from 'gi://Gtk?version=3.0';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { loadInterfaceXML } from './utils.js';
const AgsIFace = (bus) => loadInterfaceXML('com.github.Aylur.ags').replace('@BUS@', bus);
const ClientIFace = (bus) => loadInterfaceXML('com.github.Aylur.ags.client').replace('@BUS@', bus);
const TIME = `${GLib.DateTime.new_now_local().to_unix()}`;
class Client extends Gtk.Application {
    static { GObject.registerClass(this); }
    _objectPath;
    _dbus;
    _proxy;
    _callback;
    constructor(bus, path, proxy) {
        super({
            application_id: bus + '.client' + TIME,
            flags: Gio.ApplicationFlags.DEFAULT_FLAGS,
        });
        this._objectPath = path + '/client' + TIME;
        this._proxy = proxy;
    }
    _register() {
        Gio.bus_own_name(Gio.BusType.SESSION, this.application_id, Gio.BusNameOwnerFlags.NONE, (connection) => {
            this._dbus = Gio.DBusExportedObject
                .wrapJSObject(ClientIFace(this.application_id), this);
            this._dbus.export(connection, this._objectPath);
        }, null, null);
    }
    Return(str) {
        print(str);
        this.quit();
    }
    Print(str) {
        print(str);
    }
    // FIXME: promise deprecated
    remote(method, body) {
        if (method === 'Promise') {
            console.warn('--run-promise is DEPRECATED, ' +
                ' use --run-js instead, which now supports await syntax');
        }
        this._callback = () => this._proxy[`Run${method}Remote`](body, this.application_id, this._objectPath);
        this.run(null);
    }
    vfunc_activate() {
        this.hold();
        this._register();
        this._callback();
    }
}
export default function (bus, path, flags) {
    const AgsProxy = Gio.DBusProxy.makeProxyWrapper(AgsIFace(bus));
    const proxy = AgsProxy(Gio.DBus.session, bus, path);
    const client = new Client(bus, path, proxy);
    if (flags.toggleWindow)
        print(proxy.ToggleWindowSync(flags.toggleWindow));
    else if (flags.runJs)
        client.remote('Js', flags.runJs);
    else if (flags.runFile)
        client.remote('File', flags.runFile);
    else if (flags.inspector)
        proxy.InspectorRemote();
    else if (flags.quit)
        proxy.QuitRemote();
    // FIXME: deprecated
    else if (flags.runPromise)
        client.remote('Promise', flags.runPromise);
    else
        print(`Ags with busname "${flags.busName}" is already running`);
}
