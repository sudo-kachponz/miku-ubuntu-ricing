import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newMenuBar(...props) {
    return new MenuBar(...props);
}
export class MenuBar extends Gtk.MenuBar {
    static { register(this); }
    constructor(props = {}) {
        super(props);
    }
}
export default MenuBar;
