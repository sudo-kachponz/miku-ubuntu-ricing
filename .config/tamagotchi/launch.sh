#!/usr/bin/env bash
# Launcher widget Tamagotchi: server + webview layer-shell transparan (bisa di-drag).
# Membersihkan env GL nix yang rusak (mesa GBM 32-bit) supaya WebKit bisa render.

pgrep -f 'tamagotchi/server.py' >/dev/null || setsid python3 "$HOME/.config/tamagotchi/server.py" >/dev/null 2>&1 &
for i in $(seq 1 40); do curl -s http://127.0.0.1:8777/stats >/dev/null 2>&1 && break; sleep 0.3; done

exec env -u LD_LIBRARY_PATH -u LIBGL_DRIVERS_PATH -u __EGL_VENDOR_LIBRARY_DIRS \
  -u __EGL_VENDOR_LIBRARY_FILENAMES -u GBM_BACKEND -u __GLX_VENDOR_LIBRARY_NAME -u GALLIUM_DRIVER \
  WEBKIT_DISABLE_DMABUF_RENDERER=1 WEBKIT_DISABLE_COMPOSITING_MODE=1 \
  gjs "$HOME/.config/tamagotchi/widget.js"
