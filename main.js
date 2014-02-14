/*global define, brackets */

/**
 * Provides phplint results via the core linting extension point
 */
define(function (require, exports, module) {
    "use strict";

    // Load dependent modules
    var AppInit = brackets.getModule("utils/AppInit");
    var CodeInspection = brackets.getModule("language/CodeInspection");
    var ext_utils = brackets.getModule('utils/ExtensionUtils');
    var node = new(brackets.getModule('utils/NodeConnection'));
    var errors = null;

    function loadErrorsFor(fullPath) {
        // Load errors for given path

        node.domains.phplint.commander('php -l "' + fullPath + '"').done(function (data) {
            console.log(data);
            var match = /(.+) in (.+) on line (\d+)/.exec(data);
            var type = data.indexOf('error') > -1 ? CodeInspection.Type.ERROR : CodeInspection.Type.WARNING;
            if (data.indexOf('No syntax errors detected') === -1) {
                errors = {
                    pos: {
                        line: match[3]
                    },
                    message: match[1],
                    type: type
                };
            }
        });
    }

    function lintOneFile(text, fullPath) {

        loadErrorsFor(fullPath);

        return errors ? {
            errors: errors
        } : null;
    }

    function init() {

        if (!node.domains.phplint) {
            node.connect(true).done(function () {
                var path = ext_utils.getModulePath(module, 'node/commander.js');
                node.loadDomains([path], true);
            });
        }

        var editor = brackets.getModule('editor/EditorManager');
        $(editor).on('activeEditorChange', function (event, editor) {
            try {
                loadErrorsFor(editor.document.file.fullPath);
            } catch (err) {
                console.error(err.message, err.stack);
            }
        });

        var docuManager = brackets.getModule('document/DocumentManager');
        var loadForCurrent = function () {
            console.log("loadForCurrent", arguments);
            try {
                loadErrorsFor(docuManager.getCurrentDocument().file._path);
            } catch (err) {
                console.error(err.message, err.stack);
            }
        };

        loadForCurrent();
        $(docuManager).on('documentSaved', loadForCurrent);

        // Register for PHP files
        CodeInspection.register("php", {
            name: "PHPLint",
            scanFile: lintOneFile
        });
    }

    AppInit.appReady(init);
});
