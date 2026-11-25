import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newListBox(...props) {
    return new ListBox(...props);
}
export class ListBox extends Gtk.ListBox {
    static { register(this); }
    constructor(props = {}) {
        super(props);
    }
}
export default ListBox;
