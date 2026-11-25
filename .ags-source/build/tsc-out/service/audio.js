import Service from '../service.js';
import Gvc from 'gi://Gvc';
import { bulkConnect, bulkDisconnect } from '../utils.js';
const _MIXER_CONTROL_STATE = {
    [Gvc.MixerControlState.CLOSED]: 'closed',
    [Gvc.MixerControlState.READY]: 'ready',
    [Gvc.MixerControlState.CONNECTING]: 'connecting',
    [Gvc.MixerControlState.FAILED]: 'failed',
};
export class Stream extends Service {
    static {
        Service.register(this, {
            'closed': [],
        }, {
            'application-id': ['string'],
            'description': ['string'],
            'is-muted': ['boolean'],
            'volume': ['float', 'rw'],
            'icon-name': ['string'],
            'id': ['int'],
            'state': ['string'],
            'stream': ['jsobject'],
        });
    }
    _stream;
    _ids;
    _oldVolume = 0;
    setStream = (stream) => {
        if (this._ids)
            bulkDisconnect(this._stream, this._ids);
        if (!stream)
            return;
        this._stream = stream;
        this._ids = [
            'application-id',
            'description',
            'is-muted',
            'volume',
            'icon-name',
            'id',
            'state',
        ].map(prop => {
            this.notify(prop);
            return stream.connect(`notify::${prop}`, () => {
                this.changed(prop);
            });
        });
        this.changed('stream');
    };
    constructor(stream) {
        super();
        this.setStream(stream || null);
    }
    get application_id() { return this._stream?.application_id ?? null; }
    get stream() { return this._stream ?? null; }
    get description() { return this._stream?.description ?? null; }
    get icon_name() { return this._stream?.icon_name ?? null; }
    get id() { return this._stream?.id ?? null; }
    get name() { return this._stream?.name ?? null; }
    get state() {
        return _MIXER_CONTROL_STATE[this._stream?.state || Gvc.MixerControlState.CLOSED];
    }
    get is_muted() {
        return this._stream?.is_muted ?? false;
    }
    set is_muted(mute) {
        if (this._stream) {
            this._stream.is_muted = mute;
        }
    }
    get volume() {
        const max = audio.control.get_vol_max_norm();
        return this._stream ? this._stream.volume / max : 0;
    }
    set volume(value) {
        if (value > (audio.maxStreamVolume))
            value = (audio.maxStreamVolume);
        if (value < 0)
            value = 0;
        const max = audio.control.get_vol_max_norm();
        this._stream?.set_volume(value * max);
        this._stream?.push_volume();
    }
    close = () => {
        this.setStream(null);
        this.emit('closed');
    };
}
export class Audio extends Service {
    static {
        Service.register(this, {
            'speaker-changed': [],
            'microphone-changed': [],
            'stream-added': ['int'],
            'stream-removed': ['int'],
        }, {
            'apps': ['jsobject'],
            'recorders': ['jsobject'],
            'speakers': ['jsobject'],
            'microphones': ['jsobject'],
            'speaker': ['jsobject', 'rw'],
            'microphone': ['jsobject', 'rw'],
        });
    }
    maxStreamVolume = 1.5;
    _control;
    _streams;
    _streamBindings;
    _speaker;
    _microphone;
    constructor() {
        super();
        this._control = new Gvc.MixerControl({
            name: `${pkg.name} mixer control`,
        });
        this._streams = new Map();
        this._streamBindings = new Map();
        for (const s of ['speaker', 'microphone']) {
            this[`_${s}`] = new Stream();
            this[`_${s}`].connect('changed', () => {
                this.emit(`${s}-changed`);
                this.emit('changed');
            });
        }
        bulkConnect(this._control, [
            ['default-sink-changed', (_c, id) => this._defaultChanged(id, 'speaker')],
            ['default-source-changed', (_c, id) => this._defaultChanged(id, 'microphone')],
            ['stream-added', this._streamAdded.bind(this)],
            ['stream-removed', this._streamRemoved.bind(this)],
        ]);
        this._control.open();
    }
    get control() { return this._control; }
    get speaker() { return this._speaker; }
    set speaker(stream) {
        this._control.set_default_sink(stream.stream);
    }
    get microphone() { return this._microphone; }
    set microphone(stream) {
        this._control.set_default_source(stream.stream);
    }
    get microphones() { return this._getStreams(Gvc.MixerSource); }
    get speakers() { return this._getStreams(Gvc.MixerSink); }
    get apps() { return this._getStreams(Gvc.MixerSinkInput); }
    get recorders() { return this._getStreams(Gvc.MixerSourceOutput); }
    getStream = (id) => {
        return this._streams.get(id);
    };
    _defaultChanged(id, type) {
        const stream = this._streams.get(id);
        if (!stream)
            return;
        this[`_${type}`].setStream(stream.stream);
        this.changed(type);
        this.emit(`${type}-changed`);
    }
    _streamAdded(_c, id) {
        if (this._streams.has(id))
            return;
        const gvcstream = this._control.lookup_stream_id(id);
        const stream = new Stream(gvcstream);
        const binding = stream.connect('changed', () => this.emit('changed'));
        this._streams.set(id, stream);
        this._streamBindings.set(id, binding);
        this._notifyStreams(stream);
        this.emit('stream-added', id);
        this.emit('changed');
    }
    _streamRemoved(_c, id) {
        const stream = this._streams.get(id);
        if (!stream)
            return;
        stream.disconnect(this._streamBindings.get(id));
        stream.close();
        this._streams.delete(id);
        this._streamBindings.delete(id);
        this.emit('stream-removed', id);
        this._notifyStreams(stream);
        this.emit('changed');
    }
    _getStreams(filter) {
        const list = [];
        for (const [, stream] of this._streams) {
            if (stream.stream instanceof filter)
                list.push(stream);
        }
        return list;
    }
    _notifyStreams(stream) {
        if (stream.stream instanceof Gvc.MixerSource)
            this.notify('microphones');
        if (stream.stream instanceof Gvc.MixerSink)
            this.notify('speakers');
        if (stream.stream instanceof Gvc.MixerSinkInput)
            this.notify('apps');
        if (stream.stream instanceof Gvc.MixerSourceOutput)
            this.notify('recorders');
    }
}
const audio = new Audio;
export default audio;
