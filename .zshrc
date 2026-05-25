# --- INTEGRASI GIT ---
autoload -Uz vcs_info
zstyle ':vcs_info:git:*' formats ' %F{#FF007F}git:(%b)%f'
zstyle ':vcs_info:*' enable git
precmd() { vcs_info }

setopt PROMPT_SUBST
export CONDA_CHANGEPS1=false

# --- BANNER MIKU INLINE (UKURAN BESAR) ---
# Ukuran diset 45x3 agar pas, besar, dan detail.
export inline_miku=$(chafa -f sixel -s 45x3 ~/.config/ags/assets/mikunavcenter.png | tr -d '\n')

# --- PROMPT 2 BARIS (LOCKED & RAPI) ---
# Baris 1: ◢◤ + Gambar Banner
# Baris 2 (dibuat dengan $'\n'): firania@ubuntu // ~ ❯
PROMPT=$'\e[0m''%F{#39C5BB}◢◤ %{${inline_miku}%}'$'\n''%F{#FFFF00}%n@ubuntu %F{#FF007F}// %F{#FFFFFF}%~%F{#FF007F}${vcs_info_msg_0_} %F{#FF007F}❯%f '

# Jam digital kanan modern
RPROMPT='%F{#E12885}[%F{#F1FF00}%T%F{#E12885}]%f'
# --- ALIAS FASTFETCH GNOME ---
# Menggunakan chafa standar tanpa paksaan protokol luar agar lebih stabil di GNOME
alias fetch="fastfetch --logo ~/.config/ags/assets/mikuterminal.png --logo-type chafa --logo-width 35"

# --- SAMBUTAN TERMINAL BARU ---
clear
fetch
