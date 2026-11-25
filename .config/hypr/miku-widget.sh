#!/usr/bin/env bash
# Animated Miku widget: mpv --vo=tct renders MP4 as colored text in foot terminal.
pkill -x mpv 2>/dev/null || true
sleep 0.3

MIKU="$HOME/Downloads/hatsune-miku-eyes-moewalls-com.mp4"
[ ! -f "$MIKU" ] && MIKU="$HOME/Downloads/hatsune-miku-shh-moewalls-com.mp4"

foot --app-id=miku-widget -o colors.alpha=0.0 -o main.pad=0x0 \
  mpv --vo=tct --loop --really-quiet --no-audio "$MIKU" &

ADDR=""
for i in $(seq 1 30); do
  ADDR=$(hyprctl clients -j | python3 -c "import sys,json;[print(c['address']) for c in json.load(sys.stdin) if 'miku-widget' in c.get('class','')]" 2>/dev/null | head -1)
  [ -n "$ADDR" ] && break; sleep 0.15
done
[ -z "$ADDR" ] && exit 0

# kanan bawah (logical 1600x900)
hyprctl --batch "\
dispatch setfloating address:$ADDR ; \
dispatch resizewindowpixel exact 350 400,address:$ADDR ; \
dispatch movewindowpixel exact 1230 460,address:$ADDR ; \
dispatch pin address:$ADDR" >/dev/null
