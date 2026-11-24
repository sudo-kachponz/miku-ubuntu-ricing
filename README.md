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
- **Calendar Popup** -- MS Paint-framed Miku image slider (click image to cycle) + custom calendar grid with rainbow event dots + Google Calendar integration panel
- **Google Calendar Integration** -- Live events from Google Calendar with colored dots (mejikuhibiniu rainbow) on calendar dates and matching dots on event list. Auto-refreshes every 5 minutes and on popup open
- **Tamagotchi Widget** -- Desktop pet/system monitor as transparent overlay. Shows RAM/CPU/disk stats, mood-reactive pet, running-text marquee, power-saver toggle
- **WiFi Picker** -- Full GUI WiFi manager with scan, password entry, connect/disconnect via nmcli
- **Volume/Brightness** -- Interactive slider bar for volume, button controls for brightness
- **Fluid Animations** -- macOS-inspired bezier curves for window open/close, workspace transitions, and layer animations
- **macOS-style Trackpad Gestures** -- 3-finger swipe left/right to switch workspaces (1-5, wraps around) via libinput-gestures

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

### Google Calendar Setup

```bash
# Install gcalcli
pip install --user gcalcli

# Install libinput-tools (required by libinput-gestures)
sudo apt install -y libinput-tools

# Set up Google Calendar API credentials:
# 1. Go to https://console.cloud.google.com/apis/credentials
# 2. Create a project (or use existing)
# 3. Enable Google Calendar API:
#    https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
# 4. Create OAuth client ID (Desktop app)
# 5. Run gcalcli and paste Client ID + Secret when prompted:
gcalcli --calendar "your-email@example.com" agenda

# Update the email in .config/ags/config.js (search GCAL_CMD)
```

### Trackpad Gestures Setup (3-finger swipe)

```bash
# Install libinput-gestures from source
cd /tmp
git clone https://github.com/bulletmark/libinput-gestures.git
cd libinput-gestures
sudo make install

# Install dependency
sudo apt install -y libinput-tools

# Add yourself to input group (requires logout/login)
sudo gpasswd -a $USER input

# Deploy config
cp .config/libinput-gestures.conf ~/.config/

# Start (after re-login for group to take effect)
libinput-gestures-setup start
```

## File Structure

```
.config/
  ags/
    config.js        # All widgets: bar, dock, calendar, Google Calendar, WiFi picker
    style.css        # Theme styling
    assets/          # Miku images, frames, pet sprites
  hypr/
    hyprland.conf    # Window manager config, keybinds, animations
  foot/
    foot.ini         # Terminal config
  libinput-gestures.conf  # 3-finger swipe workspace config
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
