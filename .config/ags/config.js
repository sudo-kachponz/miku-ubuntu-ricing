const { Window, Label, Box, CenterBox, Button, Icon } = Widget;
const { execAsync, exec } = Utils;

// Mengimpor Layanan AGS
const Hyprland = await Service.import("hyprland");
const Audio = await Service.import("audio");
const Battery = await Service.import("battery");
const SystemTray = await Service.import("systemtray");

// Tombol Start Menu (Wofi) - MURNI GAMBAR TAMAGOTCHI (TANPA KOTAK)
const LauncherBtn = () => Button({
    className: "launcher-btn",
    css: `
        /* Pastikan ekstensinya benar (.png atau .jpg sesuai file aslimu) */
        background-image: url('file://${App.configDir}/assets/mikunavleft.png');
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
        
        /* Ukuran gambarnya (besarkan jika kurang jelas) */
        min-width: 40px;  
        min-height: 40px; 
        
        /* --- JURUS PENGHILANG KOTAK --- */
        background-color: transparent; /* Hilangkan warna latar */
        border: none;                  /* Hilangkan garis pinggir */
        box-shadow: none;              /* Hilangkan bayangan */
        padding: 0px;                  /* Hilangkan jarak spasi ke dalam */
    `,
    onClicked: () => execAsync("wofi --show drun --allow-images").catch(print),
});
// KIRI: Workspaces
const Workspaces = () => Box({
    className: "workspaces",
    children: [1, 2, 3, 4, 5].map(i => Button({
        onClicked: () => Hyprland.messageAsync(`dispatch workspace ${i}`),
        child: Label({ label: `${i}` }),
        className: Hyprland.active.workspace.bind("id").as(id => id === i ? "focused" : ""),
    })),
});

const LeftModules = () => Box({
    className: "left-modules",
    spacing: 15,
    children: [LauncherBtn(), Workspaces()],
});

// TENGAH: Jam & Kalender Trigger
const Clock = () => Button({
    className: "clock-btn",
    onClicked: () => App.toggleWindow("calendar-popup-window"),
    child: Label({
        className: "clock",
	label: Variable("", { poll: [1000, 'date +"⋆˚𝄂𝄚𝅦𝄚𝄞  %H:%M:%S ִֶ🪽་༘࿐ "'] }).bind(),
    }),
});

// KANAN: Modul System (SysTray, Brightness, Volume, Battery, Power)
const SysTray = () => Box({
    className: "systray",
    children: SystemTray.bind("items").as(items => items.map(item => Button({
        child: Icon({ icon: item.bind("icon") }),
        onPrimaryClick: (_, event) => item.activate(event),
        onSecondaryClick: (_, event) => item.openMenu(event),
        tooltipMarkup: item.bind("tooltip_markup"),
    }))),
});

// Widget Brightness dengan Tombol Kontrol
const Brightness = () => {
    // Variable untuk membaca angka persentase secara real-time
    const brightVar = Variable(0, {
        poll: [500, 'sh -c "brightnessctl -m | cut -d, -f4 | tr -d %"', out => Number(out)]
    });

    return Box({
        className: "brightness-box",
        spacing: 4,
        children: [
            // Tombol Kurangi Brightness (-5%)
            Button({
                className: "bright-btn",
                child: Label(""), // Ikon panah kiri
                onClicked: () => Utils.execAsync("brightnessctl set 5%-").catch(print),
            }),
            
            // Indikator Ikon & Angka
            Label({ 
                label: brightVar.bind().as(v => `󰃠 ${v}%`),
                className: "bright-label"
            }),

            // Tombol Tambah Brightness (+5%)
            Button({
                className: "bright-btn",
                child: Label(""), // Ikon panah kanan
                onClicked: () => Utils.execAsync("brightnessctl set +5%").catch(print),
            }),
        ],
    });
};

// Widget Volume dengan Slider Bar
const Volume = () => Box({
    className: "volume-box",
    spacing: 8,
    children: [
        // Ikon Volume (Bisa diklik untuk Mute/Unmute)
        Button({
            className: "volume-icon-btn",
            onClicked: () => Audio.speaker.is_muted = !Audio.speaker.is_muted,
            child: Label().hook(Audio.speaker, self => {
                const vol = Math.floor((Audio.speaker.volume || 0) * 100);
                const isMuted = Audio.speaker.is_muted;
                self.label = isMuted ? "󰖁" : (vol < 30 ? "󰕿" : (vol < 70 ? "󰖀" : "󰕾"));
            }),
        }),
        
        // Bar Slider Interaktif
        Widget.Slider({
            className: "volume-bar",
            hexpand: true, // Biar barnya menyesuaikan tempat kosong
            drawValue: false, // Menyembunyikan angka default GTK di atas bar
            onChange: ({ value }) => Audio.speaker.volume = value,
            setup: self => self.hook(Audio.speaker, () => {
                self.value = Audio.speaker.volume || 0;
            }),
        }),

        // Angka Persentase di ujung kanan (Opsional, agar tetap informatif)
        Label({
            className: "volume-percent",
            label: Audio.speaker.bind("volume").as(v => `${Math.floor(v * 100)}%`),
        })
    ],
});
const BatteryWidget = () => Box({
    className: "battery-box",
    visible: Battery.bind("available"),
    children: [
        Label().hook(Battery, self => {
            const percent = Battery.percent;
            const charging = Battery.charging;
            let icon = charging ? " " : (percent < 20 ? " " : (percent < 40 ? " " : (percent < 60 ? " " : " ")));
            self.label = `${icon} ${percent}%`;
            self.toggleClassName("low-battery", percent < 20 && !charging);
        }),
    ],
});

const PowerMenuBtn = () => Button({
    className: "power-menu",
    child: Label({ label: " " }),
    onClicked: () => App.toggleWindow("power-popup-window"),
});

const Network = await Service.import("network");

// === WIFI PICKER (scan / pilih / password / connect via nmcli) ===
const wifiAPs = Variable([]);        // daftar jaringan hasil scan
const wifiStatus = Variable("");     // teks feedback (scanning/gagal/tersambung)
const wifiScanning = Variable(false);
const selectedSSID = Variable("");   // jaringan yang lagi minta password (expand)

const sigIcon = (s) => s >= 75 ? "󰤨" : s >= 50 ? "󰤥" : s >= 25 ? "󰤢" : "󰤟";

const parseWifi = (out) => {
    const seen = {};
    out.split("\n").filter(Boolean).forEach(line => {
        // format: IN-USE:SIGNAL:SECURITY:SSID  (SSID selalu field terakhir, bisa ada ':')
        const m = line.match(/^(.*?):(\d+):(.*?):(.*)$/);
        if (!m) return;
        const ssid = m[4].replace(/\\:/g, ":").trim();
        if (!ssid) return;  // skip SSID kosong (hidden)
        const signal = parseInt(m[2]);
        const ap = { ssid, signal, active: m[1].trim() === "*", secured: m[3].trim() !== "" };
        if (!seen[ssid] || seen[ssid].signal < signal) seen[ssid] = ap;  // dedup: ambil sinyal terkuat
    });
    return Object.values(seen).sort((a, b) => (b.active - a.active) || (b.signal - a.signal));
};

const scanWifi = () => {
    if (wifiScanning.value) return;
    wifiScanning.value = true;
    wifiStatus.value = "Memindai...";
    Utils.execAsync(["nmcli", "-t", "-f", "IN-USE,SIGNAL,SECURITY,SSID", "device", "wifi", "list", "--rescan", "yes"])
        .then(out => { wifiAPs.value = parseWifi(out); wifiStatus.value = ""; wifiScanning.value = false; })
        .catch(e => { wifiStatus.value = "Scan gagal"; wifiScanning.value = false; print(e); });
};

// password lewat argv array -> aman dari shell injection (SSID/pw ada spasi/karakter aneh)
const connectWifi = (ssid, password) => {
    wifiStatus.value = `Menyambung ke ${ssid}…`;
    const cmd = password
        ? ["nmcli", "-w", "20", "device", "wifi", "connect", ssid, "password", password]
        : ["nmcli", "-w", "20", "device", "wifi", "connect", ssid];
    Utils.execAsync(cmd)
        .then(() => { wifiStatus.value = `✓ Tersambung: ${ssid}`; selectedSSID.value = ""; scanWifi(); })
        .catch(e => { wifiStatus.value = `✗ Gagal (password salah / jaringan 802.1X?)`; print(e); });
};

const disconnectWifi = (ssid) => {
    wifiStatus.value = `Memutus ${ssid}…`;
    Utils.execAsync(["nmcli", "connection", "down", "id", ssid])
        .then(() => { wifiStatus.value = ""; scanWifi(); })
        .catch(e => { wifiStatus.value = "Gagal memutus"; print(e); });
};

// auto-scan tiap popup wifi dibuka (lewat tombol bar / toggle manapun)
App.connect("window-toggled", (_, name, visible) => {
    if (name === "wifi-popup-window" && visible) scanWifi();
});

const Wifi = () => Box({
    className: "wifi-box",
    children: [
        Button({
            className: "wifi-btn",
            onClicked: () => { App.toggleWindow("wifi-popup-window"); scanWifi(); },
            child: Label().hook(Network, self => {
                const { wifi } = Network;
                const icon = wifi.internet === "connected" ? "󰤨" : "󰤭";
                self.label = `${icon} ${wifi.ssid || "Disconnected"}`;
            }),
        }),
    ],
});

const RightModules = () => Box({
    className: "right-modules",
    spacing: 15,
    halign: "end",
    children: [SysTray(), Brightness(), Volume(), BatteryWidget(), PowerMenuBtn(), Wifi()],
});

// === DEKLARASI WINDOWS ===

// 1. WINDOW: BAR UTAMA
const MyBar = () => Window({
    name: "caelestia-bar",
    anchor: ["top", "left", "right"],
    exclusivity: "exclusive",
    child: CenterBox({
        className: "bar-container",
        startWidget: LeftModules(),
        centerWidget: Clock(),
        endWidget: RightModules(),
    }),
});

// 2. WINDOW: POWER POPUP
const PowerPopupWindow = () => Window({
    name: "power-popup-window",
    visible: false, 
    anchor: ["top", "right"],
    margins: [5, 15], 
    child: Box({
        className: "power-popup-box",
        vertical: true,
        children: [
            Button({ className: "power-btn shutdown", child: Label("  Shutdown"), onClicked: () => exec("systemctl poweroff") }),
            Button({ className: "power-btn reboot", child: Label("󰑓  Reboot"), onClicked: () => exec("systemctl reboot") }),
            Button({ className: "power-btn logout", child: Label("󰍃  Logout"), onClicked: () => exec("hyprctl dispatch exit") }),
            Button({ className: "power-btn cancel", child: Label("  Cancel"), onClicked: () => App.toggleWindow("power-popup-window") }),
        ]
    })
});

// 3. WINDOW: NAVBAR SAMPING KIRI (auto-hide, pinned + window kebuka)
const AppItem = (client) => Button({
    className: "dock-item",
    tooltipText: client.title,
    onClicked: () => Hyprland.messageAsync(`dispatch focuswindow address:${client.address}`),
    child: Icon({
        icon: Utils.lookUpIcon(client.class) ? client.class : "application-x-executable",
        size: 32,
    }),
});

// App pinned tetap (launcher). Tambah/ubah di sini sesukamu.
const pinnedApps = [
    { icon: "foot",               exec: "foot" },
    { icon: "google-chrome",      exec: "google-chrome" },
    { icon: "org.gnome.Nautilus", exec: "nautilus" },
];
const PinnedItem = (app) => Button({
    className: "dock-item pinned",
    tooltipText: app.exec,
    onClicked: () => Utils.execAsync(app.exec).catch(print),
    child: Icon({
        icon: Utils.lookUpIcon(app.icon) ? app.icon : "application-x-executable",
        size: 32,
    }),
});

const MyDock = () => Window({
    name: "caelestia-dock",
    anchor: ["left", "top", "bottom"],
    margins: [8, 0, 8, 8],
    layer: "top",
    exclusivity: "exclusive", // reservasi ruang -> selalu tampil, window nyusut & gak ketutup
    child: Box({
        className: "dock-container",
        vertical: true,
        children: [
            // --- ATAS: app pinned tetap ---
            Box({ vertical: true, children: pinnedApps.map(PinnedItem) }),
            // --- pemisah ---
            Box({ className: "dock-divider" }),
            // --- BAWAH: window yang lagi kebuka (scrollable) ---
            Widget.Scrollable({
                className: "dock-scroll",
                hscroll: "never",
                vscroll: "automatic",
                vexpand: true,
                child: Box({
                    vertical: true,
                    children: Hyprland.bind("clients").as(clients => {
                        const validClients = clients.filter(c => c.title !== "" && c.class !== "");
                        return validClients.map(AppItem);
                    }),
                }),
            }),
        ],
    }),
});

// --- SISTEM SLIDER GAMBAR KALENDER ---
// --- SISTEM SLIDER GAMBAR KALENDER ---
const calendarImages = [
    `${App.configDir}/assets/mikucalendar.jpeg`,
    `${App.configDir}/assets/miku2calendar.jpeg`, 
    `${App.configDir}/assets/miku3calendar.jpeg`,
    `${App.configDir}/assets/miku4calendar.jpeg`,
    `${App.configDir}/assets/miku5calendar.jpeg`,
    `${App.configDir}/assets/miku6calendar.jpeg`,
    `${App.configDir}/assets/miku7calendar.jpeg`,
    `${App.configDir}/assets/miku8calendar.jpeg` ,
    `${App.configDir}/assets/miku9calendar.jpeg` 
];
const currentImg = Variable(0);

// 4. WINDOW: KALENDER POPUP
const CalendarPopup = () => Window({
    name: "calendar-popup-window",
    visible: false,
    anchor: ["top"],
    margins: [20, 0],
    child: Box({
        className: "calendar-popup-box",
        vertical: false,
        spacing: 20,
        children: [
            // --- BAGIAN KIRI: GAMBAR (klik = ganti gambar) ---
            Button({
                className: "calendar-image-btn",
                onClicked: () => {
                    currentImg.value = (currentImg.value + 1) % calendarImages.length;
                },
                child: Widget.Overlay({
                    hpack: "center",
                    vpack: "center",
                    child: Box({
                        className: "calendar-image",
                        vpack: "start",
                        hpack: "start",
                        setup: self => self.hook(currentImg, () => {
                            self.css = `
                                background-image: url('file://${calendarImages[currentImg.value]}');
                                background-size: cover;
                                background-position: center;
                                background-repeat: no-repeat;
                                min-width: 280px;
                                min-height: 280px;
                                margin-top: 42px;
                                margin-left: 52px;
                            `;
                        }),
                    }),
                    overlays: [
                        Box({
                            className: "calendar-frame",
                            css: `
                                background-image: url('file://${App.configDir}/assets/mikuframecalendarnew.png');
                                background-size: 100% 100%;
                                background-position: center;
                                background-repeat: no-repeat;
                                min-width: 340px;
                                min-height: 340px;
                            `
                        })
                    ]
                }),
            }),

            // --- BAGIAN KANAN: KALENDER ---
            Widget.Calendar({
                showDayNames: true,
                showHeading: true,
                className: "calendar-widget",
            })
        ]
    })
});

// =============================================================================
// TAMAGOTCHI digital pet — mood ikut RAM, poop kalau cache, layar monitor pixel,
// running-text quote, tombol: kiri=refresh / tengah=ganti layar / kanan=hemat daya
// =============================================================================
const PET_DIR = `${App.configDir}/assets/pet`;

// --- baca statistik sistem (RAM, cache, CPU delta, disk) ---
let _cpuPrev = { idle: 0, total: 0 };
const readCpu = () => {
    try {
        const p = Utils.readFile("/proc/stat").split("\n")[0].trim().split(/\s+/).slice(1).map(Number);
        const idle = p[3] + (p[4] || 0);
        const total = p.reduce((a, b) => a + b, 0);
        const dIdle = idle - _cpuPrev.idle;
        const dTotal = total - _cpuPrev.total;
        _cpuPrev = { idle: idle, total: total };
        return dTotal > 0 ? Math.max(0, Math.min(100, Math.round((1 - dIdle / dTotal) * 100))) : 0;
    } catch (e) { return 0; }
};
const readDisk = () => {
    try {
        const m = Utils.exec("df -P /").split("\n")[1].match(/(\d+)%/);
        return m ? parseInt(m[1]) : 0;
    } catch (e) { return 0; }
};
const readStats = () => {
    try {
        const mem = Utils.readFile("/proc/meminfo");
        const g = (k) => parseInt((mem.match(new RegExp(k + ":\\s+(\\d+)")) || [])[1] || 0);
        const total = g("MemTotal"), avail = g("MemAvailable");
        const cache = g("Cached") + g("Buffers") + g("SReclaimable");
        return {
            ram: total ? Math.round((1 - avail / total) * 100) : 0,
            cache: total ? Math.round((cache / total) * 100) : 0,
            cpu: readCpu(),
            disk: readDisk(),
        };
    } catch (e) { return { ram: 0, cache: 0, cpu: 0, disk: 0 }; }
};
const petStats = Variable({ ram: 0, cache: 0, cpu: 0, disk: 0 }, { poll: [2000, readStats] });

const screenMode = Variable(0);   // 0 = pet, 1 = monitor
const powerSave = Variable(false);
const togglePower = () => {
    powerSave.value = !powerSave.value;
    Utils.execAsync(["bash", "-c", `powerprofilesctl set ${powerSave.value ? "power-saver" : "balanced"}`]).catch(print);
};

const moodFor = (s) => {
    if (s.ram >= 85) return "bunny-sad";
    if (s.ram >= 65) return "bunny-think";
    if (s.ram < 40) return "bunny-happy";
    return "bunny";
};

// animasi hop: toggle tiap 650ms -> bunny loncat naik-turun
const petHop = Variable(false);
Utils.interval(650, () => { petHop.value = !petHop.value; });

const PetBunny = () => Box({
    className: "pet-bunny",
    setup: (self) => {
        const render = () => {
            const m = powerSave.value ? "bunny-sleep" : moodFor(petStats.value);
            const up = petHop.value && !powerSave.value;   // diam kalau mode hemat daya (tidur)
            self.css = `
                background-image: url('file://${PET_DIR}/${m}.svg');
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
                min-width: 44px;
                min-height: 44px;
                margin-top: ${up ? 2 : 10}px;
                margin-bottom: ${up ? 10 : 2}px;
                transition: margin 0.25s ease-in-out;
            `;
        };
        render();
        self.hook(petStats, render);
        self.hook(powerSave, render);
        self.hook(petHop, render);
    },
});

// --- running text (marquee) ---
const QUOTE = "  umur 22 belum punya lambogini? a** miskin sulit susah ripuh busung lapar homeless sipilis gonore hiv rumah kardus , haargh  ★  ";
const scrollPos = Variable(0);
Utils.interval(90, () => { scrollPos.value = (scrollPos.value + 1) % QUOTE.length; });
const Marquee = () => Label({
    className: "pet-marquee",
    label: scrollPos.bind().as((p) => (QUOTE + QUOTE).substring(p, p + 12)),
});

// --- layar monitor pixel (htop-style CPU/RAM/DISK) ---
const bar = (pct) => {
    const cells = 5;
    const f = Math.max(0, Math.min(cells, Math.round((pct / 100) * cells)));
    return "█".repeat(f) + "░".repeat(cells - f);
};
const monRow = (name, key) => Label({
    className: "pet-mon-row",
    xalign: 0,
    label: petStats.bind().as((s) => `${name} ${bar(s[key])} ${String(s[key]).padStart(3)}%`),
});

// --- PET screen (mood) ---
const PetView = () => Box({
    vertical: true,
    children: [
        Box({
            className: "pet-hud",
            children: [
                Label({ label: petStats.bind().as((s) => `RAM ${s.ram}%`), hexpand: true, xalign: 0 }),
                Label({ className: "pet-poop", label: petStats.bind().as((s) => (s.cache >= 30 ? "💩" : "")) }),
            ],
        }),
        PetBunny(),
        Label({
            className: "pet-nag",
            label: petStats.bind().as((s) => {
                if (s.ram >= 85) return "RAM penuh! bersihin";
                if (s.cache >= 35) return "cache numpuk, eek";
                if (s.ram < 40) return "sehat & happy!";
                return "semua aman ~";
            }),
        }),
        Marquee(),
    ],
});

// --- MONITOR screen (pixel htop) ---
const MonitorView = () => Box({
    vertical: true,
    children: [
        Label({ className: "pet-mon-title", label: "◉ SYS MONITOR" }),
        monRow("CPU", "cpu"),
        monRow("RAM", "ram"),
        monRow("DSK", "disk"),
        monRow("CSH", "cache"),
    ],
});

const PetWindow = () => Window({
    name: "mindpalace-pet",
    anchor: ["top", "right"],
    margins: [72, 22, 0, 0],
    layer: "top",
    child: Box({
        className: "pet-shell",
        vertical: true,
        children: [
            Label({ className: "pet-brand", label: "Tamagotchi" }),
            Box({
                className: "pet-bezel",
                hpack: "center",
                child: Box({
                    className: powerSave.bind().as((p) => (p ? "pet-screen dim" : "pet-screen")),
                    hpack: "center",
                    vpack: "center",
                    // GtkStack homogeneous -> pet & monitor otomatis seukuran (konstan), gak resize
                    child: Widget.Stack({
                        transition: "crossfade",
                        transitionDuration: 200,
                        children: { pet: PetView(), mon: MonitorView() },
                        shown: screenMode.bind().as((m) => (m === 0 ? "pet" : "mon")),
                    }),
                }),
            }),
            Box({
                className: "pet-buttons",
                hpack: "center",
                children: [
                    Button({ className: "pet-btn pet-btn-side", tooltipText: "Refresh stats", child: Label("↻"), onClicked: () => { petStats.value = readStats(); } }),
                    Button({ className: "pet-btn pet-btn-mid", tooltipText: "Ganti layar (pet <-> monitor)", child: Label("▤"), onClicked: () => { screenMode.value = screenMode.value ? 0 : 1; } }),
                    Button({ className: "pet-btn pet-btn-side", tooltipText: "Mode hemat daya", child: Label("⏻"), onClicked: togglePower }),
                ],
            }),
        ],
    }),
});

// WINDOW: WIFI PICKER POPUP
const WifiRow = (ap) => {
    const pwEntry = Widget.Entry({
        className: "wifi-pw-entry",
        visibility: false,                 // sembunyikan password (titik-titik)
        placeholderText: "Password…",
        hexpand: true,
        onAccept: ({ text }) => connectWifi(ap.ssid, text),   // Enter = connect
    });
    return Box({
        vertical: true,
        children: [
            Button({
                className: ap.active ? "wifi-row active" : "wifi-row",
                onClicked: () => {
                    if (ap.active) { disconnectWifi(ap.ssid); return; }   // klik yg aktif = putus
                    if (!ap.secured) { connectWifi(ap.ssid); return; }    // open = langsung connect
                    selectedSSID.value = selectedSSID.value === ap.ssid ? "" : ap.ssid;  // secured = minta password
                },
                child: Box({
                    children: [
                        Label({ className: "wifi-sig", label: sigIcon(ap.signal) }),
                        Label({ className: "wifi-ssid", label: ap.ssid, hexpand: true, xalign: 0, truncate: "end", maxWidthChars: 18 }),
                        Label({ className: "wifi-lock", label: ap.secured ? "󰒃" : "󰦞" }),
                        Label({ className: "wifi-check", label: ap.active ? "󰄬" : "" }),
                    ],
                }),
            }),
            Widget.Revealer({
                transition: "slide_down",
                transitionDuration: 180,
                revealChild: selectedSSID.bind().as(s => s === ap.ssid),
                child: Box({
                    className: "wifi-pw-box",
                    children: [
                        pwEntry,
                        Button({ className: "wifi-connect-btn", child: Label("󰌘"), onClicked: () => connectWifi(ap.ssid, pwEntry.text) }),
                    ],
                }),
            }),
        ],
    });
};

const WifiPopupWindow = () => Window({
    name: "wifi-popup-window",
    visible: false,
    anchor: ["top", "right"],
    margins: [5, 15],
    child: Box({
        className: "wifi-popup-box",
        vertical: true,
        children: [
            Box({
                className: "wifi-popup-header",
                children: [
                    Label({ label: "󰤨  WiFi", hexpand: true, xalign: 0 }),
                    Button({
                        className: "wifi-rescan-btn",
                        tooltipText: "Pengaturan lanjutan (enterprise/hidden)",
                        onClicked: () => execAsync("nm-connection-editor").catch(print),
                        child: Label("󰒓"),
                    }),
                    Button({
                        className: "wifi-rescan-btn",
                        tooltipText: "Scan ulang",
                        onClicked: scanWifi,
                        child: Label().hook(wifiScanning, self => { self.label = wifiScanning.value ? "󰔟" : "󰑓"; }),
                    }),
                ],
            }),
            Label({
                className: "wifi-status",
                xalign: 0,
                visible: wifiStatus.bind().as(s => !!s),
                label: wifiStatus.bind(),
            }),
            Widget.Scrollable({
                className: "wifi-list-scroll",
                hscroll: "never",
                vscroll: "automatic",
                child: Box({
                    className: "wifi-list",
                    vertical: true,
                    children: wifiAPs.bind().as(aps => aps.length
                        ? aps.map(WifiRow)
                        : [Label({ className: "wifi-empty", label: "Tidak ada jaringan" })]),
                }),
            }),
        ],
    }),
});

App.config({
    style: "/home/firania/.config/ags/style.css",
    windows: [
        MyBar(),
        PowerPopupWindow(),
        MyDock(),
        CalendarPopup(),
        WifiPopupWindow(),
        // PetWindow() dipensiunkan -> diganti widget HTML Tamagotchi (~/.config/tamagotchi)
    ],
});
