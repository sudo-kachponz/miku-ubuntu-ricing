import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newFlowBox(...props) {
    return new FlowBox(...props);
}
export class FlowBox extends Gtk.FlowBox {
    static { register(this); }
    constructor(props = {}) {
        super(props);
    }
}
export default FlowBox;
