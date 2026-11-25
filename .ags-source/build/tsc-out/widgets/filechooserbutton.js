import { register } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
export function newFileChooserButton(...props) {
    return new FileChooserButton(...props);
}
export class FileChooserButton extends Gtk.FileChooserButton {
    static {
        register(this, {
            properties: {
                'on-file-set': ['jsobject', 'rw'],
            },
        });
    }
    constructor(props = {}, child) {
        if (child)
            props.child = child;
        super(props);
        this.connect('file-set', this.on_file_set.bind(this));
    }
    get child() { return super.child; }
    set child(child) { super.child = child; }
    get on_file_set() { return this._get('on-file-set') || (() => false); }
    set on_file_set(callback) { this._set('on-file-set', callback); }
    get uri() { return this.get_uri(); }
    get uris() { return this.get_uris(); }
}
export default FileChooserButton;
