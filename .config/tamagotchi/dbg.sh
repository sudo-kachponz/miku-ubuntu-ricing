#!/usr/bin/env bash
# Debug launcher: log ke fs asli biar kebaca via Read tool.
exec >"$HOME/.config/tamagotchi/dbg.log" 2>&1
echo "START $(date) WAYLAND_DISPLAY=$WAYLAND_DISPLAY"
pkill -f 'tamagotchi/widget.js'
sleep 1
pgrep -f 'tamagotchi/server.py' >/dev/null || setsid python3 "$HOME/.config/tamagotchi/server.py" &
for i in $(seq 1 30); do curl -s http://127.0.0.1:8777/stats >/dev/null 2>&1 && break; sleep 0.3; done
echo "server ok, launching gjs"
env -u LD_LIBRARY_PATH -u LIBGL_DRIVERS_PATH -u __EGL_VENDOR_LIBRARY_DIRS \
  -u __EGL_VENDOR_LIBRARY_FILENAMES -u GBM_BACKEND -u __GLX_VENDOR_LIBRARY_NAME -u GALLIUM_DRIVER \
  WEBKIT_DISABLE_DMABUF_RENDERER=1 WEBKIT_DISABLE_COMPOSITING_MODE=1 \
  gjs "$HOME/.config/tamagotchi/widget.js"
echo "gjs EXITED code=$?"
