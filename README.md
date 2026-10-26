# Caelestia Miku Ubuntu Ricing

Personal desktop configuration inspired by Hatsune Miku's aesthetic -- dreamy, clean, and functional.

## Preview

<img width="1600" height="900" alt="Image" src="https://github.com/user-attachments/assets/810d7564-08dd-4978-862f-cbdab7c3ced0" />

## Stack

| Component | Tool |
|---|---|
| OS | Ubuntu 24.04.3 LTS (Noble Numbat) |
| Window Manager | Hyprland (dynamic tiling Wayland compositor) |
| Shell Widgets | AGS (Aylur's GTK Shell) -- bar, dock, popups |
| Terminal | Foot (Wayland-native) |
| Launcher | Wofi |
| Shell | Zsh + Oh My Zsh + Powerlevel10k |

## Features

- **Top Bar** -- Glass teal + gradient Miku aesthetic with workspace pills, clock, brightness/volume controls, battery, WiFi picker, and system tray
- **Left Dock** -- macOS-style sidebar with pinned apps + running windows (scrollable when many apps open)
- **Calendar Popup** -- MS Paint-framed Miku image slider (click image to cycle) + calendar widget, balanced proportions
- **Tamagotchi Widget** -- Desktop pet/system monitor as transparent overlay. Shows RAM/CPU/disk stats, mood-reactive pet, running-text marquee, power-saver toggle
- **WiFi Picker** -- Full GUI WiFi manager with scan, password entry, connect/disconnect via nmcli
- **Volume/Brightness** -- Interactive slider bar for volume, button controls for brightness
- **Fluid Animations** -- macOS-inspired bezier curves for window open/close, workspace transitions, and layer animations

## Color Palette

| Color | Hex | Usage |
|---|---|---|
| Miku Teal | `#137a7f` | Borders, accents |
| Cyan Light | `#86cecb` | Text, highlights |
| Miku Pink | `#e12885` | Active states, selected items |
| Magenta Soft | `#FF8EB3` | Volume/WiFi icons |
| Dark Teal Glass | `rgba(11,74,77,0.82)` | Bar/popup backgrounds |

## Installation

```bash
# Clone
git clone https://github.com/sudo-kachponz/miku-ubuntu-ricing.git
cd miku-ubuntu-ricing

# Deploy configs
cp -r .config/ags ~/.config/
cp -r .config/hypr ~/.config/
cp -r .config/foot ~/.config/
cp -r .config/tamagotchi ~/.config/
cp .zshrc ~/

# Restart
killall ags; ags &
~/.config/tamagotchi/launch.sh &
```

### Dependencies

- `hyprland`, `ags`, `foot`, `wofi`, `swaybg`
- `brightnessctl`, `networkmanager`, `gjs`, `python3`
- Font: JetBrainsMono Nerd Font

## File Structure

```
.config/
  ags/
    config.js        # All widgets: bar, dock, calendar, WiFi picker
    style.css        # Theme styling
    assets/          # Miku images, frames, pet sprites
  hypr/
    hyprland.conf    # Window manager config, keybinds, animations
  foot/
    foot.ini         # Terminal config
  tamagotchi/
    monitor.html     # Tamagotchi pet UI
    server.py        # System stats API server
    widget.js        # GJS webview layer-shell widget
    launch.sh        # Launcher script
.zshrc               # Shell config
```

## Credits

Built with love for a personalized digital environment.

*Created by [sudo-kachponz](https://github.com/sudo-kachponz)*
