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

const Wifi = () => Box({
    className: "wifi-box",
    children: [
        Button({
            className: "wifi-btn",
            // Klik untuk membuka pengaturan jaringan (opsional, sesuaikan dengan command-mu)
            onClicked: () => execAsync("nm-connection-editor"), 
            child: Label().hook(Network, self => {
                const { wifi } = Network;
                // Mengubah ikon berdasarkan status
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

// 3. WINDOW: DOCK BAWAH
const AppItem = (client) => Button({
    className: "dock-item",
    tooltipText: client.title,
    onClicked: () => Hyprland.messageAsync(`dispatch focuswindow address:${client.address}`),
    child: Icon({
        icon: Utils.lookUpIcon(client.class) ? client.class : "application-x-executable",
        size: 32, 
    }),
});

const MyDock = () => Window({
    name: "caelestia-dock",
    anchor: ["bottom"],
    margins: [0, 0, 15, 0], 
    layer: "top", 
    child: Box({
        className: "dock-container",
        children: Hyprland.bind("clients").as(clients => {
            const validClients = clients.filter(c => c.title !== "" && c.class !== "");
            return validClients.map(AppItem);
        }),
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

// 4. WINDOW: KALENDER 3D POPUP (Minimalist Landscape & High Contrast)
// =============================================================================
// WINDOW: KALENDER 3D POPUP (FINAL FIX: FRAME, SLIDER, & ALIGNMENT)
// =============================================================================
const CalendarPopup = () => Window({
    name: "calendar-popup-window",
    visible: false,
    anchor: ["top"],
    margins: [20, 0], 
    child: Box({
        className: "calendar-popup-box",
        vertical: false, 
        spacing: 25, 
        children: [
            // --- BAGIAN KIRI: BLOK SLIDER (GAMBAR DLM FRAME + TOMBOL) ---
            Box({
                vertical: true, 
                className: "left-slider-block",
                hpack: "center",
                spacing: 5, // MEMBERI JARAK TEGAS AGAR TOMBOL TIDAK TERTINDIH FRAME
                children: [
                    // --- KOTAK GAMBAR + FRAME (MENGGUNAKAN OVERLAY) ---
                    Widget.Overlay({
                        hpack: "center",
                        vpack: "center",
                        // 1. LAPISAN BAWAH: GAMBAR MIKU
                        child: Box({
                            className: "calendar-image",
                            vpack: "start", // Mulai hitung posisi dari Kiri Atas
                            hpack: "start",
                            setup: self => self.hook(currentImg, () => {
                                self.css = `
                                    background-image: url('file://${calendarImages[currentImg.value]}');
                                    background-size: cover;
                                    background-position: center;
                                    background-repeat: no-repeat;
                                    
                                    /* --- KALIBRASI UKURAN KANVAS HITAM --- */
                                    /* Angka ini menyesuaikan lebar/tinggi kotak hitam di dalam Paint */
                                    min-width: 300px; 
                                    min-height: 270px;
                                    
                                    /* --- KALIBRASI POSISI (DORONG KE DALAM KANVAS) --- */
                                    margin-top: 50px;  /* Dorong ke bawah menjauhi judul Paint */
                                    margin-left: 65px; /* Dorong ke kanan menjauhi toolbar kuas */
                                `;
                            }),
                        }),
                        // 2. LAPISAN ATAS: FRAME BOLONG UI PAINT
                        overlays: [
                            Box({
                                className: "calendar-frame",
                                css: `
                                    background-image: url('file://${App.configDir}/assets/mikuframecalendarnew.png');
                                    background-size: 100% 100%; /* Paksa tampilkan seluruh gambar tanpa crop */
                                    background-position: center;
                                    background-repeat: no-repeat;
                                    
                                    /* --- UKURAN FRAME PERSEGI SEMPURNA --- */
                                    min-width: 360px; 
                                    min-height: 360px; 
                                `
                            })
                        ]
                    }),                    
                    
                    // --- BAR TOMBOL DI BAWAH GAMBAR ---
                    Box({
                        className: "slider-button-bar",
                        vertical: false, 
                        spacing: 20,
                        hpack: "center",
                        children: [
                            Button({
                                className: "slider-btn-minimal",
                                child: Label(""), // Ikon panah kiri
                                onClicked: () => {
                                    let next = currentImg.value - 1;
                                    if (next < 0) next = calendarImages.length - 1;
                                    currentImg.value = next;
                                }
                            }),
                            Button({
                                className: "slider-btn-minimal",
                                child: Label(""), // Ikon panah kanan
                                onClicked: () => {
                                    let next = currentImg.value + 1;
                                    if (next >= calendarImages.length) next = 0;
                                    currentImg.value = next; 
                                }
                            })
                        ]
                    })
                ]
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

App.config({
    style: "/home/firania/.config/ags/style.css",
    windows: [
        MyBar(), 
        PowerPopupWindow(), 
        MyDock(), 
        CalendarPopup()
    ],
});
