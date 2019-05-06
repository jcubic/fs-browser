import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/twilight.css';

import 'codemirror/addon/scroll/simplescrollbars';
import 'codemirror/addon/scroll/simplescrollbars.css';
import "codemirror/addon/edit/matchbrackets";

import emacs from 'codemirror/keymap/emacs';
import js from 'codemirror/mode/javascript/javascript';
import ruby from 'codemirror/mode/ruby/ruby';
import python from 'codemirror/mode/python/python';
import mysql from 'codemirror/mode/sql/sql';
import xml from 'codemirror/mode/xml/xml';
import php from 'codemirror/mode/php/php';

const $ = jQuery;

$.editors = {};

let id = 0;

export default function(service, path) {
    var fname = path.replace(/.*\//, '');
    var readonly = true;
    var mtime;
    service.is_writable(path).then(function(is_writable) {
        readonly = !is_writable;
    });
    service.filemtime(path).then(function(time) {
        mtime = time;
    });
    var ext = fname.replace(/^.*\./, '');
    var mode;
    // you can add more modes here:
    switch(ext) {
        case 'js':
            mode = 'javascript';
            break;
        case 'html':
            mode = 'htmlmixed';
            break;
        case 'rb':
            mode = 'ruby';
            break;
        case 'py':
            mode = 'python';
            break;
        case 'mysql':
            mode = 'sql';
            break;
        case 'svg':
            mode = 'xml';
            break;
        case 'xml':
        case 'css':
        case 'php':
        case 'sql':
            mode = ext;
            break;
    }
    var scripts = $('script').map(function() {
        return ($(this).attr('src') || '').replace(/.*\//, '');
    }).get();
    if (scripts.indexOf(mode + '.js') == -1) {
        var name = 'codemirror-5.29.0/mode/' + mode + '/' + mode + '.js';
        service.file_exists(name).then(function(exists) {
            if (exists) {
                $('<script/>').attr('src', name).appendTo('head');
            }
        });
    }
    const new_id = ++id;
    service.file(path).then(function(content) {
        var unsaved = false;
        var div = $('<div><textarea/></div>').data('data-id', new_id);
        var textarea = div.find('textarea').hide();
        textarea.val(content);
        div.dialog({
            title: fname,
            width: 650,
            beforeClose: function(e, ui) {
                if (unsaved) {
                    if (confirm('Unsaved file, are you sure?')) {
                        $(this).dialog('destroy');
                        delete $.editors[new_id];
                    } else {
                        return false;
                    }
                } else {
                    $(this).dialog('destroy');
                }
            },
            resize: function(e, ui) {
                const d = editor.dialog;
                editor.editor.setSize(d.width(), d.height());
            }
        });
        var editor = {
            dialog: div,
            editor: CodeMirror.fromTextArea(textarea[0], {
                lineNumbers: true,
                matchBrackets: true,
                mode: mode,
                readOnly: readonly,
                theme: 'twilight',
                indentUnit: 4,
                scrollbarStyle: "simple",
                lineWrapping: true,
                matchBrackets: true,
                keymap: {
                    ...emacs,
                    "Ctrl-S": function(cm) {
                        if (unsaved) {
                            function saveFile() {
                                editor.editor.save();
                                var content = textarea.val();
                                service.save(path, content).then(function() {
                                    unsaved = false;
                                    div.dialog('option', 'title', fname);
                                });
                            }
                            service.filemtime(path).then(function(time) {
                                if (mtime != time) {
                                    if (confirm('File `' + fname + '\' changed ' +
                                                'on Disk are you sure?')) {
                                        saveFile();
                                    }
                                } else {
                                    saveFile();
                                }
                            });
                        }
                    }
                }
            })
        };

        editor.editor.on('change', function(editor) {
            unsaved = true;
            div.dialog('option', 'title', '*' + fname);
        });
        $.editors[new_id] = editor;
    });
};
