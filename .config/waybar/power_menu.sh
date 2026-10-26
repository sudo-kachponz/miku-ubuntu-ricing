#!/bin/bash
res=$(echo -e "🔄 Reboot\n Shutdown\n🚪 Log Out" | rofi -dmenu -p "Power Option:")
case $res in
    *Reboot*) systemctl reboot ;;
    *Shutdown*) systemctl poweroff ;;
    *Log*) hyprctl dispatch exit ;;
esac
