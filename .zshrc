# ==========================================
# 1. GLOBAL PATH EXPORTS (FAILSAFE)
# ==========================================
# Kita paksa daftarkan path utama di awal agar command 
# seperti conda dan npm SELALU terdeteksi oleh Zsh.
export PATH="$HOME/anaconda3/bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/.npm-global/bin:$PATH"
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# ==========================================
# 2. INTEGRASI GIT & TEMA PROMPT
# ==========================================
autoload -Uz vcs_info
zstyle ':vcs_info:git:*' formats ' %F{#FF007F}git:(%b)%f'
zstyle ':vcs_info:*' enable git
precmd() { vcs_info }

setopt PROMPT_SUBST
export CONDA_CHANGEPS1=false

# --- BANNER MIKU INLINE (UKURAN BESAR) ---
export inline_miku=$(chafa -f sixel -s 45x3 ~/.config/ags/assets/mikunavcenter.png | tr -d '\n')

# --- PROMPT 2 BARIS (LOCKED & RAPI) ---
PROMPT=$'\e[0m''%F{#39C5BB}◢◤ %{${inline_miku}%}'$'\n''%F{#FFFF00}%n@ubuntu %F{#FF007F}// %F{#FFFFFF}%~%F{#FF007F}${vcs_info_msg_0_} %F{#FF007F}❯%f '
RPROMPT='%F{#E12885}[%F{#F1FF00}%T%F{#E12885}]%f'

# ==========================================
# 3. CONDA INITIALIZE
# ==========================================
# >>> conda initialize >>>
# !! Contents within this block are managed by 'conda init' !!
__conda_setup="$('/home/firania/anaconda3/bin/conda' 'shell.zsh' 'hook' 2> /dev/null)"
if [ $? -eq 0 ]; then
    eval "$__conda_setup"
else
    if [ -f "/home/firania/anaconda3/etc/profile.d/conda.sh" ]; then
        . "/home/firania/anaconda3/etc/profile.d/conda.sh"
    else
        export PATH="/home/firania/anaconda3/bin:$PATH"
    fi
fi
unset __conda_setup
# <<< conda initialize <<<

# ==========================================
# 4. TOOL CONFIGURATIONS (CLAUDE & BUN)
# ==========================================
export API_TIMEOUT_MS="3000000"
export DISABLE_TELEMETRY="1"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"

# bun completions
[ -s "/home/firania/.bun/_bun" ] && source "/home/firania/.bun/_bun"

# ==========================================
# 5. ALIASES
# ==========================================
alias chrome-wayland="google-chrome --enable-features=UseOzonePlatform --ozone-platform=wayland"
alias fetch="fastfetch --logo ~/.config/ags/assets/mikuterminal.png --logo-type chafa --logo-width 35"

# ==========================================
# 6. SAMBUTAN TERMINAL
# ==========================================
clear
fetch


# Added by Antigravity CLI installer
export PATH="/home/firania/.local/bin:$PATH"
