#!/usr/bin/env bash
# cava desktop widget: foot transparan + float/pin/place via hyprctl dispatch.
# Kenapa dispatch, bukan windowrule: Hyprland 0.55 ganti syntax matcher windowrule
# (class: ditolak, wiki 404). Dispatch by-address stabil.
# Kenapa foot, bukan kitty: kitty butuh EGL -> gagal di env GL nix yang rusak.
pkill -x cava 2>/dev/null; sleep 0.3
foot --app-id=cava-widget -o colors.alpha=0.0 -o main.pad=0x0 cava &
# tunggu window muncul, ambil address
ADDR=""
for i in $(seq 1 25); do
  ADDR=$(hyprctl clients -j | python3 -c "import sys,json;[print(c['address']) for c in json.load(sys.stdin) if 'cava' in c.get('class','')]" 2>/dev/null | head -1)
  [ -n "$ADDR" ] && break
  sleep 0.2
done
[ -z "$ADDR" ] && exit 0
# float + ukuran + posisi (logical 1600x900 @scale 1.6; bottom-center) + pin semua workspace
hyprctl --batch "dispatch setfloating address:$ADDR ; dispatch resizewindowpixel exact 1000 200,address:$ADDR ; dispatch movewindowpixel exact 300 670,address:$ADDR ; dispatch pin address:$ADDR"
