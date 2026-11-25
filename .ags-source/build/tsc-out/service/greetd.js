import App from '../app.js';
import Service from '../service.js';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
Gio._promisify(Gio.InputStream.prototype, 'read_bytes_async');
const SOCK = GLib.getenv('GREETD_SOCK');
export class Greetd extends Service {
    static { Service.register(this); }
    _decoder = new TextDecoder;
    login = async (username, password, cmd, env = []) => {
        const session = await this.createSession(username);
        if (session.type !== 'auth_message') {
            this.cancelSession();
            throw session;
        }
        const auth = await this.postAuth(password);
        if (auth.type !== 'success') {
            this.cancelSession();
            throw auth;
        }
        const start = await this.startSession(cmd, env);
        if (start.type !== 'success') {
            this.cancelSession();
            throw start;
        }
        App.quit();
    };
    createSession = (username) => {
        return this._send('create_session', { username });
    };
    postAuth = (response) => {
        return this._send('post_auth_message_response', { response });
    };
    startSession = (cmd, env = []) => {
        const cmdv = Array.isArray(cmd)
            ? cmd
            : GLib.shell_parse_argv(cmd)[1];
        return this._send('start_session', { cmd: cmdv, env });
    };
    cancelSession = () => {
        return this._send('cancel_session', {});
    };
    async _send(req, payload) {
        const connection = new Gio.SocketClient()
            .connect(new Gio.UnixSocketAddress({ path: SOCK }), null);
        try {
            const json = JSON.stringify({ type: req, ...payload });
            const ostream = new Gio.DataOutputStream({
                close_base_stream: true,
                base_stream: connection.get_output_stream(),
                byte_order: Gio.DataStreamByteOrder.HOST_ENDIAN,
            });
            const istream = connection.get_input_stream();
            ostream.put_int32(json.length, null);
            ostream.put_string(json, null);
            const data = await istream.read_bytes_async(4, GLib.PRIORITY_DEFAULT, null);
            const length = new Uint32Array(data.get_data()?.buffer || [0])[0];
            const res = await istream.read_bytes_async(length, GLib.PRIORITY_DEFAULT, null);
            return JSON.parse(this._decoder.decode(res.get_data()));
        }
        finally {
            connection.close(null);
        }
    }
}
export const greetd = new Greetd;
export default greetd;
