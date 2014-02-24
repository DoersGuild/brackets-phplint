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
    var NodeConnection = brackets.getModule('utils/NodeConnection');
    var node = new NodeConnection();
    var errors = [];

    function loadErrorsFor(fullPath) {
        // Load errors for given path
        node.domains.phplint.commander('php -d display_errors=1 -d error_reporting=-1 -l "' + fullPath + '"').done(function (data) {
            var match = /(.+) in (.+) on line (\d+)/.exec(data);
            console.log("Matched data : " + JSON.stringify(data) + " \n Matches:" + JSON.stringify(match));
            var type = data.indexOf('error') > -1 ? CodeInspection.Type.ERROR : CodeInspection.Type.WARNING;
            if (data.indexOf('No syntax errors detected') === -1) {
                errors = [{
                    pos: {
                        line: parseInt(match[3], 10)
                    },
                    message: match[1],
                    type: type
                }];
            } else {
                errors = [];
            }
            CodeInspection.requestRun();
        });
    }

    function init() {

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
            scanFile: function (text, fullPath) {
                return {
                    errors: errors
                };
            }
        });
    }

    if (!node.domains.phplint) {
        node.connect(true).done(function () {
            var path = ext_utils.getModulePath(module, 'node/commander.js');
            node.loadDomains([path], true).done(function () {
                AppInit.appReady(init);
            });
        });
    } else {
        AppInit.appReady(init);
    }
});
