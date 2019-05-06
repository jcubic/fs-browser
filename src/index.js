import $ from 'expose-loader?jQuery!jquery';
import LightningFS from 'expose-loader?LightningFS!@isomorphic-git/lightning-fs';
import 'jquery-ui/ui/widgets/dialog';
import 'jquery-ui/ui/widgets/menu';

import 'jquery-ui/themes/base/dialog.css';
import 'jquery-ui/themes/base/draggable.css';
import 'jquery-ui/themes/base/draggable.css';
import 'jquery-ui/themes/base/base.css';
import 'jquery-ui/themes/base/resizable.css';
import 'jquery-ui/themes/base/theme.css';
import 'jquery-ui/themes/base/menu.css';

import 'jquery.filebrowser';
import 'jquery.filebrowser/css/jquery.filebrowser.min.css';

import open from './editor';

$(function() {
    var fs = new LightningFS('fs').promises;
    // facade for RPC service used for editor
    const service = {
        is_writable: function() {
            return Promise.resolve(true);
        },
        file: function(path) {
            return fs.readFile(path, 'utf8');
        },
        filemtime: async function(path) {
            const stat = await fs.stat(path);
            return stat && stat.mtimeMs;
        },
        file_exists: async function(path) {
            try {
                await fs.stat(path);
                return true;
            } catch(e) {
                return false;
            }
        },
        save: function(path, content) {
            return fs.writeFile(path, content);
        }
    };
    var browser = $('<div/>').dialog({
        width: 600,
        height: 480
    }).browse({
        root: '/',
        separator: '/',
        contextmenu: true,
        menu: function(type) {
            if (type == 'li') {
                return {
                    'delete': function($li) {
                        alert(`delete "${ $li.text() }"`);
                    }
                };
            }  else {
                return true;
            }
        },
        dir: async function(path) {
            var names = await fs.readdir(path);
            var result = {files:[], dirs: []};
            for (let name of names) {
                const stat = await fs.stat(path + '/' + name);
                if (stat && stat.isDirectory()) {
                    result.dirs.push(name);
                } else {
                    result.files.push(name);
                }
            }
            return result;
        },
        exists: async function(path) {
            try {
                return await fs.stat(path);
            } catch (e) {
                return false;
            }
        },
        error: function(message) {
            alert(message);
        },
        create: function(type, path) {
            var m = path.match(/(.*)\/(.*)/);
            var parent = get(m[1]);
            if (type == 'directory') {
                parent[m[2]] = {};
            } else {
                parent[m[2]] = 'Content of new File';
            }
        },
        remove: function(path) {
            var m = path.match(/(.*)\/(.*)/);
            var parent = get(m[1]);
            delete parent[m[2]];
        },
        rename: function(src, dest) {
            var m = src.match(/(.*)\/(.*)/);
            var parent = get(m[1]);
            var content = parent[m[2]];
            delete parent[m[2]];
            parent[dest.replace(/.*\//, '')] = content;
        },
        open: function(filename) {
            open(service, filename);
        },
        on_change: function() {
            $('#path').val(this.path());
        }
    });
});
