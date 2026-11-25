import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Service from '../service.js';
import { ensureDirectory, idle } from '../utils.js';
import { CACHE_DIR } from '../utils.js';
import { loadInterfaceXML } from '../utils.js';
const DBusIFace = loadInterfaceXML('org.freedesktop.DBus');
const PlayerIFace = loadInterfaceXML('org.mpris.MediaPlayer2.Player');
const MprisIFace = loadInterfaceXML('org.mpris.MediaPlayer2');
const DBusProxy = Gio.DBusProxy.makeProxyWrapper(DBusIFace);
const PlayerProxy = Gio.DBusProxy.makeProxyWrapper(PlayerIFace);
const MprisProxy = Gio.DBusProxy.makeProxyWrapper(MprisIFace);
const DBUS_PREFIX = 'org.mpris.MediaPlayer2.';
const MEDIA_CACHE_PATH = `${CACHE_DIR}/media`;
export class MprisPlayer extends Service {
    static {
        Service.register(this, {
            'closed': [],
            'position': ['int'],
        }, {
            'bus-name': ['string'],
            'name': ['string'],
            'entry': ['string'],
            'identity': ['string'],
            'metadata': ['string'],
            'trackid': ['string'],
            'track-artists': ['jsobject'],
            'track-title': ['string'],
            'track-album': ['string'],
            'track-cover-url': ['string'],
            'cover-path': ['string'],
            'play-back-status': ['string'],
            'can-go-next': ['boolean'],
            'can-go-prev': ['boolean'],
            'can-play': ['boolean'],
            'shuffle-status': ['jsobject'],
            'loop-status': ['jsobject'],
            'length': ['int'],
            'position': ['float', 'rw'],
            'volume': ['float', 'rw'],
        });
    }
    get bus_name() { return this._busName; }
    get name() { return this._name; }
    get entry() { return this._entry; }
    get identity() { return this._identity; }
    get metadata() { return this._metadata; }
    get trackid() { return this._trackid; }
    get track_artists() { return this._trackArtists; }
    get track_title() { return this._trackTitle; }
    get track_album() { return this._trackAlbum; }
    get track_cover_url() { return this._trackCoverUrl; }
    get cover_path() { return this._coverPath; }
    get play_back_status() { return this._playBackStatus; }
    get can_go_next() { return this._canGoNext; }
    get can_go_prev() { return this._canGoPrev; }
    get can_play() { return this._canPlay; }
    get shuffle_status() { return this._shuffleStatus; }
    get loop_status() { return this._loopStatus; }
    get length() { return this._length; }
    _busName;
    _name;
    _entry;
    _identity;
    _metadata = {};
    _trackid;
    _trackArtists;
    _trackTitle;
    _trackAlbum;
    _trackCoverUrl;
    _coverPath;
    _playBackStatus;
    _canGoNext;
    _canGoPrev;
    _canPlay;
    _shuffleStatus;
    _loopStatus;
    _length;
    _binding = { mpris: [0, 0], player: 0 };
    _mprisProxy;
    _playerProxy;
    constructor(busName) {
        super();
        this._busName = busName;
        this._name = busName.substring(23).split('.')[0];
        this._mprisProxy = new MprisProxy(Gio.DBus.session, busName, '/org/mpris/MediaPlayer2');
        this._playerProxy = new PlayerProxy(Gio.DBus.session, busName, '/org/mpris/MediaPlayer2');
        this._onPlayerProxyReady();
        this._onMprisProxyReady();
        this._updateState();
        idle(this._updateState.bind(this));
    }
    close() {
        this._mprisProxy?.disconnect(this._binding.mpris[0]);
        this._mprisProxy?.disconnect(this._binding.mpris[1]);
        this._playerProxy?.disconnect(this._binding.player);
        this.emit('closed');
    }
    _onMprisProxyReady() {
        this._binding.mpris[0] = this._mprisProxy.connect('notify::g-name-owner', () => {
            if (!this._mprisProxy.g_name_owner)
                this.close();
        });
        this._binding.mpris[1] = this._mprisProxy.connect('g-properties-changed', () => this._updateState());
        this._identity = this._mprisProxy.Identity;
        this._entry = this._mprisProxy.DesktopEntry;
        if (!this._mprisProxy.g_name_owner)
            this.close();
    }
    _onPlayerProxyReady() {
        this._binding.player = this._playerProxy.connect('g-properties-changed', () => this._updateState());
    }
    _updateState() {
        const metadata = {};
        for (const prop in this._playerProxy.Metadata)
            metadata[prop] = this._playerProxy.Metadata[prop].deepUnpack();
        let trackArtists = metadata['xesam:artist'];
        if (!Array.isArray(trackArtists) ||
            !trackArtists.every(artist => typeof artist === 'string'))
            trackArtists = ['Unknown artist'];
        let trackTitle = metadata['xesam:title'];
        if (typeof trackTitle !== 'string')
            trackTitle = 'Unknown title';
        let trackAlbum = metadata['xesam:album'];
        if (typeof trackAlbum !== 'string')
            trackAlbum = 'Unknown album';
        let trackCoverUrl = metadata['mpris:artUrl'];
        if (typeof trackCoverUrl !== 'string')
            trackCoverUrl = '';
        let length = metadata['mpris:length'];
        length = typeof length === 'number' ? length / 1000000 : -1;
        this.updateProperty('metadata', metadata);
        this.updateProperty('shuffle-status', this._playerProxy.Shuffle);
        this.updateProperty('loop-status', this._playerProxy.LoopStatus);
        this.updateProperty('can-go-next', this._playerProxy.CanGoNext);
        this.updateProperty('can-go-prev', this._playerProxy.CanGoPrevious);
        this.updateProperty('can-play', this._playerProxy.CanPlay);
        this.updateProperty('play-back-status', this._playerProxy.PlaybackStatus);
        this.updateProperty('trackid', metadata['mpris:trackid']);
        this.updateProperty('track-artists', trackArtists);
        this.updateProperty('track-title', trackTitle);
        this.updateProperty('track-album', trackAlbum);
        this.updateProperty('track-cover-url', trackCoverUrl);
        this.updateProperty('length', length);
        this.updateProperty('identity', this._mprisProxy.Identity);
        this.updateProperty('entry', this._mprisProxy.DesktopEntry);
        this._cacheCoverArt();
        this.emit('changed');
    }
    _cacheCoverArt() {
        if (!mpris.cacheCoverArt || this._trackCoverUrl === '')
            return;
        this._coverPath = MEDIA_CACHE_PATH + '/' +
            GLib.compute_checksum_for_string(GLib.ChecksumType.SHA1, this._trackCoverUrl, -1);
        if (GLib.file_test(this._coverPath, GLib.FileTest.EXISTS))
            return this.changed('cover-path');
        ensureDirectory(MEDIA_CACHE_PATH);
        Gio.File.new_for_uri(this._trackCoverUrl).copy_async(Gio.File.new_for_path(this._coverPath), Gio.FileCopyFlags.OVERWRITE, GLib.PRIORITY_DEFAULT, null, null, (source, result) => {
            try {
                source.copy_finish(result);
                this.changed('cover-path');
            }
            catch (err) {
                logError(err);
                console.error(`failed to cache ${this._coverPath},` +
                    ' do you have gvfs installed?');
            }
        });
    }
    get volume() {
        let volume = this._playerProxy.Volume;
        if (typeof volume !== 'number')
            volume = -1;
        return volume;
    }
    set volume(value) {
        this._playerProxy.Volume = value;
    }
    get position() {
        const proxy = Gio.DBusProxy.new_for_bus_sync(Gio.BusType.SESSION, Gio.DBusProxyFlags.NONE, null, this._busName, '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player', null);
        const pos = proxy.get_cached_property('Position')?.unpack();
        return pos ? pos / 1000000 : -1;
    }
    set position(time) {
        const micro = Math.floor(time * 1000000);
        this._playerProxy.SetPositionAsync(this.trackid, micro);
        this.notify('position');
        this.emit('position', time);
    }
    playPause = () => this._playerProxy.PlayPauseAsync().catch(console.error);
    play = () => this._playerProxy.PlayAsync().catch(console.error);
    stop = () => this._playerProxy.StopAsync().catch(console.error);
    next = () => this._playerProxy.NextAsync().catch(console.error);
    previous = () => this._playerProxy.PreviousAsync().catch(console.error);
    shuffle = () => this._playerProxy.Shuffle = !this._playerProxy.Shuffle;
    loop = () => {
        switch (this._playerProxy.LoopStatus) {
            case 'None':
                this._playerProxy.LoopStatus = 'Track';
                break;
            case 'Track':
                this._playerProxy.LoopStatus = 'Playlist';
                break;
            case 'Playlist':
                this._playerProxy.LoopStatus = 'None';
                break;
            default:
                break;
        }
    };
}
export class Mpris extends Service {
    static {
        Service.register(this, {
            'player-changed': ['string'],
            'player-closed': ['string'],
            'player-added': ['string'],
        }, {
            'players': ['jsobject'],
        });
    }
    cacheCoverArt = true;
    _proxy;
    _players = new Map;
    get players() {
        return Array.from(this._players.values());
    }
    constructor() {
        super();
        this._proxy = new DBusProxy(Gio.DBus.session, 'org.freedesktop.DBus', '/org/freedesktop/DBus', this._onProxyReady.bind(this), null, Gio.DBusProxyFlags.NONE);
    }
    _addPlayer(busName) {
        if (this._players.has(busName))
            return;
        const player = new MprisPlayer(busName);
        player.connect('closed', () => {
            this._players.delete(busName);
            this.emit('player-closed', busName);
            this.changed('players');
        });
        player.connect('changed', () => {
            this.emit('player-changed', busName);
            this.emit('changed');
        });
        this._players.set(busName, player);
        this.emit('player-added', busName);
        this.changed('players');
    }
    async _onProxyReady(_, error) {
        if (error)
            return logError(error);
        const [names] = await this._proxy.ListNamesAsync();
        for (const name of names) {
            if (name.startsWith(DBUS_PREFIX))
                this._addPlayer(name);
        }
        this._proxy.connectSignal('NameOwnerChanged', this._onNameOwnerChanged.bind(this));
    }
    _onNameOwnerChanged(_proxy, _sender, [name, oldOwner, newOwner]) {
        if (!name.startsWith(DBUS_PREFIX))
            return;
        if (newOwner && !oldOwner)
            this._addPlayer(name);
    }
    getPlayer = (name = '') => {
        for (const [busName, player] of this._players) {
            if (busName.includes(name))
                return player;
        }
        return null;
    };
}
export const mpris = new Mpris;
export default mpris;
