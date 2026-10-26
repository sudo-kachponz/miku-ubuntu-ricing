#!/usr/bin/env gjs
// Widget Tamagotchi: layer-shell TRANSPARAN + WebKit2, bisa di-drag (bridge JS->gjs ubah margin).
imports.gi.versions.Gtk = '3.0';
imports.gi.versions.WebKit2 = '4.1';
imports.gi.versions.GtkLayerShell = '0.1';
const { Gtk, Gdk, WebKit2, GtkLayerShell, GLib } = imports.gi;

GLib.set_prgname('tamagotchi-widget');
Gtk.init(null);

const W = 250, H = 320;
let mR = 24, mB = 24;   // margin kanan & bawah (posisi widget)

const win = new Gtk.Window();
GtkLayerShell.init_for_window(win);
GtkLayerShell.set_layer(win, GtkLayerShell.Layer.TOP);
GtkLayerShell.set_anchor(win, GtkLayerShell.Edge.BOTTOM, true);
GtkLayerShell.set_anchor(win, GtkLayerShell.Edge.RIGHT, true);
GtkLayerShell.set_margin(win, GtkLayerShell.Edge.BOTTOM, mB);
GtkLayerShell.set_margin(win, GtkLayerShell.Edge.RIGHT, mR);
GtkLayerShell.set_exclusive_zone(win, 0);
GtkLayerShell.set_namespace(win, 'tamagotchi-widget');

win.set_default_size(W, H);
win.set_app_paintable(true);
const vis = win.get_screen().get_rgba_visual();
if (vis) win.set_visual(vis);

// --- bridge drag: HTML kirim delta, gjs geser margin ---
const ucm = new WebKit2.UserContentManager();
ucm.register_script_message_handler('move');
ucm.connect('script-message-received::move', (_u, val) => {
  try {
    const d = JSON.parse(val.to_string());
    mR = Math.max(0, mR - d.dx);   // geser kanan -> margin kanan mengecil
    mB = Math.max(0, mB - d.dy);   // geser bawah -> margin bawah mengecil
    GtkLayerShell.set_margin(win, GtkLayerShell.Edge.RIGHT, Math.round(mR));
    GtkLayerShell.set_margin(win, GtkLayerShell.Edge.BOTTOM, Math.round(mB));
  } catch (e) {}
});

const DRAG = `
(function(){
  let d=false,lx=0,ly=0;
  addEventListener('pointerdown',e=>{ if(e.button!==0)return; if(e.target.closest('.btn'))return;
    d=true; lx=e.screenX; ly=e.screenY; document.documentElement.style.cursor='grabbing'; },true);
  addEventListener('pointermove',e=>{ if(!d)return;
    const dx=e.screenX-lx, dy=e.screenY-ly; lx=e.screenX; ly=e.screenY;
    if(window.webkit&&webkit.messageHandlers.move) webkit.messageHandlers.move.postMessage(JSON.stringify({dx,dy})); });
  const stop=()=>{ d=false; document.documentElement.style.cursor='grab'; };
  addEventListener('pointerup',stop); addEventListener('pointercancel',stop);
  document.documentElement.style.cursor='grab';
})();`;
ucm.add_script(WebKit2.UserScript.new(
  DRAG,
  WebKit2.UserContentInjectedFrames.TOP_FRAME,
  WebKit2.UserScriptInjectionTime.END,
  null, null));

const view = new WebKit2.WebView({ user_content_manager: ucm });
view.set_background_color(new Gdk.RGBA({ red: 0, green: 0, blue: 0, alpha: 0 }));
view.set_size_request(W, H);
view.load_uri('http://127.0.0.1:8777/?t=' + Date.now());  // bust cache WebKit biar JS terbaru kebaca
win.add(view);

win.connect('destroy', () => Gtk.main_quit());
win.show_all();
Gtk.main();
