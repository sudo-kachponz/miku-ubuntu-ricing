import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';
import GLib from 'gi://GLib';
import Service from '../service.js';
import { CACHE_DIR, ensureDirectory, loadInterfaceXML, readFileAsync, timeout, writeFile, } from '../utils.js';
import { daemon } from '../utils/notify.js';
const NOTIFICATIONS_CACHE_PATH = `${CACHE_DIR}/notifications`;
const CACHE_FILE = NOTIFICATIONS_CACHE_PATH + '/notifications.json';
const NotificationIFace = loadInterfaceXML('org.freedesktop.Notifications');
const _URGENCY = (urgency) => {
    switch (urgency) {
        case 0: return 'low';
        case 2: return 'critical';
        default: return 'normal';
    }
};
export class Notification extends Service {
    static {
        Service.register(this, {
            'dismissed': [],
            'closed': [],
            'invoked': ['string'],
        }, {
            'action-icons': ['boolean'],
            'actions': ['jsobject'],
            'app-entry': ['string'],
            'app-icon': ['string'],
            'app-name': ['string'],
            'body': ['string'],
            'category': ['string'],
            'id': ['int'],
            'image': ['string'],
            'popup': ['boolean'],
            'resident': ['boolean'],
            'sound-file': ['string'],
            'sound-name': ['string'],
            'summary': ['string'],
            'suppress-sound': ['boolean'],
            'time': ['int'],
            'timeout': ['int', 'rw'],
            'transient': ['boolean'],
            'urgency': ['string'],
            'x': ['int'],
            'y': ['int'],
            'hints': ['jsobject'],
        });
    }
    _actionIcons;
    _actions = [];
    _appEntry;
    _appIcon;
    _appName;
    _body;
    _category;
    _id;
    _image;
    _popup;
    _resident;
    _soundFile;
    _soundName;
    _summary;
    _suppressSound;
    _time;
    _timeout;
    _transient;
    _urgency;
    _x;
    _y;
    _hints = {};
    get action_icons() { return this._actionIcons; }
    get actions() { return this._actions; }
    get app_entry() { return this._appEntry; }
    get app_icon() { return this._appIcon; }
    get app_name() { return this._appName; }
    get body() { return this._body; }
    get category() { return this._category; }
    get id() { return this._id; }
    get image() { return this._image; }
    get popup() { return this._popup; }
    get resident() { return this._resident; }
    get sound_file() { return this._soundFile; }
    get sound_name() { return this._soundName; }
    get summary() { return this._summary; }
    get suppress_sound() { return this._suppressSound; }
    get time() { return this._time; }
    get timeout() { return this._timeout; }
    get transient() { return this._transient; }
    get urgency() { return this._urgency; }
    get x() { return this._x; }
    get y() { return this._y; }
    get hints() { return this._hints; }
    constructor(appName, id, appIcon, summary, body, acts, hints, popup) {
        super();
        for (let i = 0; i < acts.length; i += 2) {
            acts[i + 1] !== '' && this._actions.push({
                label: acts[i + 1],
                id: acts[i],
            });
        }
        this._id = id;
        this._appName = appName;
        this._appIcon = appIcon;
        this._summary = summary;
        this._body = body;
        this._time = GLib.DateTime.new_now_local().to_unix();
        this._image = this._appIconImage() ||
            this._parseImageData(hints['image-data']) ||
            hints['image-path']?.unpack();
        this._popup = popup;
        this._urgency = _URGENCY(hints['urgency']?.unpack());
        this._appEntry = hints['desktop-entry']?.unpack();
        this._actionIcons = hints['action-icons']?.unpack();
        this._category = hints['category']?.unpack();
        this._resident = hints['resident']?.unpack();
        this._soundFile = hints['sound-file']?.unpack();
        this._soundName = hints['sound-name']?.unpack();
        this._suppressSound = hints['suppress-sound']?.unpack();
        this._transient = hints['transient']?.unpack();
        this._x = hints['x']?.unpack();
        this._y = hints['y']?.unpack();
        this._hints = hints;
    }
    dismiss = () => {
        this._popup = false;
        this.changed('popup');
        this.emit('dismissed');
    };
    close = () => {
        this.emit('closed');
    };
    invoke = (id) => {
        this.emit('invoked', id);
        if (!this.resident)
            this.close();
    };
    toJson(cacheActions = notifications.cacheActions) {
        return {
            actionIcons: this._actionIcons,
            actions: cacheActions ? this._actions : [],
            appEntry: this._appEntry,
            appIcon: this._appIcon,
            appName: this._appName,
            body: this._body,
            category: this._category,
            id: this._id,
            image: this._image,
            resident: this._resident,
            soundFile: this._soundFile,
            soundName: this._soundName,
            summary: this._summary,
            suppressSound: this._suppressSound,
            time: this._time,
            transient: this._transient,
            urgency: this._urgency,
            x: this._x,
            y: this._y,
        };
    }
    static fromJson(json) {
        const { id, appName, appIcon, summary, body, ...j } = json;
        const n = new Notification(appName, id, appIcon, summary, body, [], {}, false);
        for (const key of Object.keys(j))
            // @ts-expect-error too lazy to type
            n[`_${key}`] = j[key];
        return n;
    }
    _appIconImage() {
        if (GLib.file_test(this._appIcon, GLib.FileTest.EXISTS) ||
            GLib.file_test(this._appIcon.replace(/^(file\:\/\/)/, ''), GLib.FileTest.EXISTS))
            return this._appIcon;
    }
    _parseImageData(imageData) {
        if (!imageData)
            return null;
        ensureDirectory(NOTIFICATIONS_CACHE_PATH);
        const fileName = NOTIFICATIONS_CACHE_PATH + `/${this._id}`;
        const [w, h, rs, alpha, bps, _, data] = imageData // iiibiiay
            .recursiveUnpack();
        if (bps !== 8) {
            console.warn(`Notification image error from ${this.app_name}: ` +
                'Currently only RGB images with 8 bits per sample are supported.');
            return null;
        }
        const pixbuf = GdkPixbuf.Pixbuf.new_from_bytes(data, GdkPixbuf.Colorspace.RGB, alpha, bps, w, h, rs);
        if (!pixbuf)
            return null;
        const outputStream = Gio.File.new_for_path(fileName)
            .replace(null, false, Gio.FileCreateFlags.NONE, null);
        pixbuf.save_to_streamv(outputStream, 'png', null, null, null);
        outputStream.close(null);
        return fileName;
    }
}
export class Notifications extends Service {
    static {
        Service.register(this, {
            'dismissed': ['int'],
            'notified': ['int'],
            'closed': ['int'],
        }, {
            'notifications': ['jsobject'],
            'popups': ['jsobject'],
            'dnd': ['boolean'],
        });
    }
    popupTimeout = 3000;
    forceTimeout = false;
    cacheActions = false;
    clearDelay = 100;
    _dbus;
    _notifications;
    _dnd = false;
    _idCount = 1;
    constructor() {
        super();
        this._notifications = new Map();
        this._readFromFile();
        this._register();
    }
    get dnd() { return this._dnd; }
    set dnd(value) {
        this._dnd = value;
        this.changed('dnd');
    }
    get notifications() {
        return Array.from(this._notifications.values());
    }
    get popups() {
        const list = [];
        for (const [, notification] of this._notifications) {
            if (notification.popup)
                list.push(notification);
        }
        return list;
    }
    getPopup = (id) => {
        const n = this._notifications.get(id);
        return n?.popup ? n : null;
    };
    getNotification = (id) => {
        return this._notifications.get(id);
    };
    Notify(appName, replacesId, appIcon, summary, body, acts, hints, expiration) {
        const id = this._notifications.has(replacesId) ? replacesId : this._idCount++;
        const n = new Notification(appName, id, appIcon, summary, body, acts, hints, !this.dnd);
        if (this.forceTimeout || expiration === -1) {
            n.updateProperty('timeout', this.popupTimeout);
            timeout(this.popupTimeout, () => this.DismissNotification(id));
        }
        else {
            n.updateProperty('timeout', expiration);
            if (expiration > 0)
                timeout(expiration, () => this.DismissNotification(id));
        }
        this._addNotification(n);
        !this._dnd && this.notify('popups');
        this.notify('notifications');
        this.emit('notified', id);
        this.emit('changed');
        this._cache();
        return id;
    }
    Clear() { this.clear(); }
    DismissNotification(id) {
        this._notifications.get(id)?.dismiss();
    }
    CloseNotification(id) {
        this._notifications.get(id)?.close();
    }
    InvokeAction(id, actionId) {
        this._notifications.get(id)?.invoke(actionId);
    }
    GetCapabilities() {
        return [
            'action-icons',
            'actions',
            'body',
            'body-hyperlinks',
            'body-markup',
            'icon-static',
            'persistence',
            'sound',
        ];
    }
    GetServerInformation() {
        return new GLib.Variant('(ssss)', [pkg.name, 'Aylur', pkg.version, '1.2']);
    }
    clear = async () => {
        const close = (n, delay) => new Promise(resolve => {
            this._notifications.has(n.id)
                ? timeout(delay, () => resolve(n.close()))
                : resolve(null);
        });
        return Promise.all(this.notifications.map((n, i) => close(n, this.clearDelay * i)));
    };
    _addNotification(n) {
        n.connect('dismissed', this._onDismissed.bind(this));
        n.connect('closed', this._onClosed.bind(this));
        n.connect('invoked', this._onInvoked.bind(this));
        this._notifications.set(n.id, n);
    }
    _onDismissed(n) {
        this.emit('dismissed', n.id);
        this.changed('popups');
    }
    _onClosed(n) {
        this._dbus.emit_signal('NotificationClosed', new GLib.Variant('(uu)', [n.id, 3]));
        this._notifications.delete(n.id);
        this.notify('notifications');
        this.notify('popups');
        this.emit('closed', n.id);
        this.emit('changed');
        this._cache();
    }
    _onInvoked(n, id) {
        this._dbus.emit_signal('ActionInvoked', new GLib.Variant('(us)', [n.id, id]));
    }
    _register() {
        Gio.bus_own_name(Gio.BusType.SESSION, 'org.freedesktop.Notifications', Gio.BusNameOwnerFlags.NONE, (connection) => {
            this._dbus = Gio.DBusExportedObject
                .wrapJSObject(NotificationIFace, this);
            this._dbus.export(connection, '/org/freedesktop/Notifications');
        }, () => {
            daemon.running = true;
        }, () => {
            const [name] = Gio.DBus.session.call_sync('org.freedesktop.Notifications', '/org/freedesktop/Notifications', 'org.freedesktop.Notifications', 'GetServerInformation', null, null, Gio.DBusCallFlags.NONE, -1, null).deepUnpack();
            console.warn(`Another notification daemon is already running: ${name}`);
        });
    }
    async _readFromFile() {
        try {
            const file = await readFileAsync(CACHE_FILE);
            const notifications = JSON.parse(file)
                .map((n) => Notification.fromJson(n));
            for (const n of notifications) {
                this._addNotification(n);
                if (n.id > this._idCount)
                    this._idCount = n.id + 1;
            }
            this.changed('notifications');
        }
        catch (_) {
            // most likely there is no cache yet
        }
    }
    _cache() {
        ensureDirectory(NOTIFICATIONS_CACHE_PATH);
        const arr = Array.from(this._notifications.values()).map(n => n.toJson());
        writeFile(JSON.stringify(arr, null, 2), CACHE_FILE).catch(err => console.error(err));
    }
}
export const notifications = new Notifications;
export default notifications;
