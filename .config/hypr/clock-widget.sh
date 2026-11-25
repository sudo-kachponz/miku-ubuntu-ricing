#!/usr/bin/env bash
# Matrix rain + animated Miku + clock. Tiled (natural fit, gak overflow bar/dock).
pkill -x cmatrix 2>/dev/null
pkill -x cbonsai 2>/dev/null
pkill -x tty-clock 2>/dev/null
tmux kill-session -t clockwidget 2>/dev/null
sleep 0.3

foot --app-id=clock-widget -o colors.alpha=0.08 -o main.pad=0x0 \
  -o colors.foreground=39B5B5 -o colors.background=0a1218 \
  python3 ~/.config/hypr/matrix-clock.py
