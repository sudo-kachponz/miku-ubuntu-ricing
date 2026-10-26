#!/usr/bin/env python3
"""Server stats untuk Tamagotchi monitor: serve monitor.html di / dan JSON sistem di /stats."""
import http.server, json, os, re, shutil, subprocess

HTML = os.path.join(os.path.dirname(os.path.abspath(__file__)), "monitor.html")
PORT = 8777
_cpu_prev = [0, 0]  # idle, total
HOME = os.path.expanduser("~")

# Disk cleaner: HANYA sampah yang regenerate sendiri. JANGAN masukkan path data user.
# Yang dihapus: ISI folder-folder ini (foldernya tetap ada).
SAFE_DIRS = [
    "~/.cache/thumbnails",
    # Trash SENGAJA tidak di-auto-empty: bisa berisi file yang masih mau dibalikin
    # (pernah ikut kehapus permanen). Kosongkan Trash manual lewat file manager.
    "~/.cache/google-chrome",
    "~/.cache/chromium",
    "~/.cache/mozilla",
    "~/.cache/pip",
    "~/.npm/_cacache",
    "~/.cache/yarn",
    "~/.bun/install/cache",
]


def meminfo():
    d = {}
    with open("/proc/meminfo") as f:
        for line in f:
            k, _, v = line.partition(":")
            d[k.strip()] = int(v.strip().split()[0])  # kB
    return d


def cpu_pct():
    p = list(map(int, open("/proc/stat").readline().split()[1:]))
    idle = p[3] + (p[4] if len(p) > 4 else 0)
    total = sum(p)
    di, dt = idle - _cpu_prev[0], total - _cpu_prev[1]
    _cpu_prev[0], _cpu_prev[1] = idle, total
    return round((1 - di / dt) * 100) if dt > 0 else 0


def drop_caches():
    """Empty standby list ala RAMmap: lepas pagecache+dentries+inodes.
    Butuh root; dipakai lewat sudoers NOPASSWD (lihat tamagotchi-dropcaches.sudoers)."""
    subprocess.run(["sync"])
    r = subprocess.run(
        "echo 3 | sudo -n tee /proc/sys/vm/drop_caches",
        shell=True, capture_output=True,
    )
    return r.returncode == 0


def disk_pct():
    try:
        line = subprocess.check_output(["df", "-P", "/"]).decode().splitlines()[1]
        return int(re.search(r"(\d+)%", line).group(1))
    except Exception:
        return 0


def disk_free_mb():
    try:
        line = subprocess.check_output(["df", "-Pm", "/"]).decode().splitlines()[1]
        return int(line.split()[3])  # kolom Available (MB)
    except Exception:
        return 0


def _du_mb(path):
    try:
        return int(subprocess.check_output(["du", "-sm", path], stderr=subprocess.DEVNULL).decode().split()[0])
    except Exception:
        return 0


def clean_disk():
    """Hapus ISI folder sampah di SAFE_DIRS (regenerate sendiri). Return MB yang kebebasin.
    ponytail: allowlist-only + guard realpath wajib di bawah HOME -> gak bisa kabur ke path lain."""
    before = disk_free_mb()
    for d in SAFE_DIRS:
        p = os.path.expanduser(d)
        if not os.path.realpath(p).startswith(HOME + os.sep):  # guard: jangan keluar HOME
            continue
        if not os.path.isdir(p):
            continue
        for name in os.listdir(p):
            fp = os.path.join(p, name)
            try:
                if os.path.isdir(fp) and not os.path.islink(fp):
                    shutil.rmtree(fp, ignore_errors=True)
                else:
                    os.remove(fp)
            except Exception:
                pass
    # best-effort cleaner level root (dilewati diam-diam kalau sudoers gak izinin)
    subprocess.run("sudo -n apt-get clean", shell=True, capture_output=True)
    subprocess.run("sudo -n journalctl --vacuum-size=200M", shell=True, capture_output=True)
    return max(0, disk_free_mb() - before)


def stats():
    m = meminfo()
    total = m.get("MemTotal", 1)
    avail = m.get("MemAvailable", 0)
    cache = m.get("Cached", 0) + m.get("Buffers", 0) + m.get("SReclaimable", 0)
    used = max(0, total - avail)
    swap_t = m.get("SwapTotal", 0)
    swap_u = swap_t - m.get("SwapFree", 0)
    return {
        "ramPct": round(used / total * 100),
        "cpuPct": cpu_pct(),
        "diskPct": disk_pct(),
        "swapPct": round(swap_u / swap_t * 100) if swap_t else 0,
        "activeMB": round(used / 1024),
        "standbyMB": round(cache / 1024),
        "freeMB": round(max(0, avail - cache) / 1024),
        "totalMB": round(total / 1024),
    }


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path.startswith("/stats"):
            body = json.dumps(stats()).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        else:
            try:
                body = open(HTML, "rb").read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
            except Exception:
                self.send_error(404)

    def do_POST(self):
        if self.path.startswith("/empty-standby"):
            ok = drop_caches()
            body = json.dumps({"ok": ok, **stats()}).encode()
            self.send_response(200 if ok else 500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        elif self.path.startswith("/clean-disk"):
            freed = clean_disk()
            body = json.dumps({"ok": True, "freedMB": freed, **stats()}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_error(404)


if __name__ == "__main__":
    import sys
    if "--sizes" in sys.argv:  # self-check: lihat ukuran sampah TANPA menghapus
        tot = 0
        for d in SAFE_DIRS:
            p = os.path.expanduser(d)
            if os.path.isdir(p):
                mb = _du_mb(p); tot += mb
                print(f"{mb:>7} MB  {d}")
        print(f"-------\n{tot:>7} MB total sampah aman  |  free di /: {disk_free_mb()} MB")
        sys.exit(0)
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
