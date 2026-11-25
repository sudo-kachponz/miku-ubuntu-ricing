import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
function proc(arg) {
    let cmd = Array.isArray(arg) || typeof arg === 'string'
        ? arg
        : arg.cmd;
    if (typeof cmd === 'string') {
        const [, argv] = GLib.shell_parse_argv(cmd);
        cmd = argv;
    }
    return Gio.Subprocess.new(cmd, Gio.SubprocessFlags.STDIN_PIPE |
        Gio.SubprocessFlags.STDOUT_PIPE |
        Gio.SubprocessFlags.STDERR_PIPE);
}
function readStream(stream, callback) {
    stream.read_line_async(GLib.PRIORITY_DEFAULT, null, (_, res) => {
        const output = stream?.read_line_finish_utf8(res)[0];
        if (typeof output === 'string') {
            callback(output.trim());
            readStream(stream, callback);
        }
    });
}
export function subprocess(argsOrCmd, out = print, err = err => console.error(Error(err)), bind) {
    const p = proc(argsOrCmd);
    const stdin = new Gio.DataOutputStream({
        base_stream: p.get_stdin_pipe(),
        close_base_stream: true,
    });
    const stdout = new Gio.DataInputStream({
        base_stream: p.get_stdout_pipe(),
        close_base_stream: true,
    });
    const stderr = new Gio.DataInputStream({
        base_stream: p.get_stderr_pipe(),
        close_base_stream: true,
    });
    if (bind)
        bind.connect('destroy', () => p.force_exit());
    const onErr = Array.isArray(argsOrCmd) || typeof argsOrCmd === 'string'
        ? err
        : argsOrCmd.err;
    const onOut = Array.isArray(argsOrCmd) || typeof argsOrCmd === 'string'
        ? out
        : argsOrCmd.out;
    readStream(stdout, onOut ?? out);
    readStream(stderr, onErr ?? err);
    return Object.assign(p, {
        write(str) {
            stdin.write_all(new TextEncoder().encode(str), null);
        },
        writeAsync(str) {
            return new Promise((resolve, reject) => {
                stdin.write_all_async(new TextEncoder().encode(str), GLib.PRIORITY_DEFAULT, null, (stdin, res) => {
                    stdin.write_all_finish(res)[0]
                        ? resolve()
                        : reject();
                });
            });
        },
    });
}
export function exec(argsOrCmd, out = out => out, err = out => out) {
    const p = proc(argsOrCmd);
    const onErr = Array.isArray(argsOrCmd) || typeof argsOrCmd === 'string'
        ? err
        : argsOrCmd.err;
    const onOut = Array.isArray(argsOrCmd) || typeof argsOrCmd === 'string'
        ? out
        : argsOrCmd.out;
    const [, stdout, stderr] = p.communicate_utf8(null, null);
    return p.get_successful()
        ? (onOut ?? out)(stdout.trim())
        : (onErr ?? err)(stderr.trim());
}
export function execAsync(cmd) {
    const p = proc(cmd);
    return new Promise((resolve, reject) => {
        p.communicate_utf8_async(null, null, (_, res) => {
            const [, stdout, stderr] = p.communicate_utf8_finish(res);
            p.get_successful()
                ? resolve(stdout.trim())
                : reject(stderr.trim());
        });
    });
}
