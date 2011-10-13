#!/usr/bin/env node
var fs = require("fs");

var args = process.argv;
var targetDir = null;

var targetDir = "build";
console.log("using targetDir '", targetDir, "'");

var copy = require('./support/ace/support/dryice/lib/dryice').copy;

fs.copy

var aceHome = __dirname + '/support/ace';

console.log('# ace ---------');

var aceProject = [
    aceHome + '/support/pilot/lib',
    aceHome + '/lib',
    aceHome
];

var project = copy.createCommonJsProject(aceProject);

function filterTextPlugin(text) {
    return text.replace(/(['"])ace\/requirejs\/text\!/g, "$1text!");
}

var ace = copy.createDataObject();
copy({
    source: [
            aceHome + '/build_support/mini_require.js'
    ],
    dest: ace
});
copy({
    source: [
        copy.source.commonjs({
            project: project,
            require: [
                "pilot/fixoldbrowsers",
                "ace/ace"
            ]
        })
    ],
    filter: [ copy.filter.moduleDefines ],
    dest: ace
});
copy({
    source: {
        root: project,
        include: /.*\.css$/,
        exclude: /tests?\//
    },
    filter: [ copy.filter.addDefines ],
    dest: ace
});
copy({
    source: [
            aceHome + '/build_support/boot.js'
    ],
    dest: ace
});

// Create the compressed and uncompressed output files
copy({
    source: ace,
    filter: [copy.filter.uglifyjs, filterTextPlugin],
    dest:   targetDir + '/src/ace.js'
});
copy({
    source: ace,
    filter: [filterTextPlugin],
    dest:   targetDir + '/src/ace-uncompressed.js'
});

var modeThemeFilters = [
        copy.filter.moduleDefines,
        copy.filter.uglifyjs,
        filterTextPlugin
    ];

console.log('# ace modes ---------');

project.assumeAllFilesLoaded();
[
    "xml", "dynamo_wfl"
].forEach(function(mode) {
    console.log("mode " + mode);
    copy({
        source: [
            copy.source.commonjs({
                project: project.clone(),
                require: [ 'ace/mode/' + mode ]
            })
        ],
        filter: modeThemeFilters,
        dest:   targetDir + "/src/mode-" + mode + ".js"
    });
});

console.log('# ace themes ---------');

[
    "clouds", "clouds_midnight", "cobalt", "crimson_editor", "dawn", "eclipse",
    "idle_fingers", "kr_theme", "merbivore", "merbivore_soft",
    "mono_industrial", "monokai", "pastel_on_dark", "solarized_dark",
    "solarized_light", "textmate", "tomorrow", "tomorrow_night",
    "tomorrow_night_blue", "tomorrow_night_bright", "tomorrow_night_eighties",
    "twilight", "vibrant_ink"
].forEach(function(theme) {
    copy({
        source: [{
            root: aceHome + '/lib',
            include: "ace/theme/" + theme + ".js"
        }],
        filter: modeThemeFilters,
        dest:   targetDir + "/src/theme-" + theme + ".js"
    });
});

console.log('# ace worker ---------');

["dynamo_wfl"].forEach(function(mode) {
    console.log("worker for " + mode + " mode");
    var worker = copy.createDataObject();
    var workerProject = copy.createCommonJsProject([
        aceHome + '/support/pilot/lib',
        aceHome + '/lib'
    ]);
    copy({
        source: [
            copy.source.commonjs({
                project: workerProject,
                require: [
                    'pilot/fixoldbrowsers',
                    'pilot/event_emitter',
                    'pilot/oop',
                    'ace/mode/' + mode + '_parser',
                    'ace/mode/' + mode + '_worker'
                ]
            })
        ],
        filter: [ copy.filter.moduleDefines],
        dest: worker
    });
    copy({
        source: [
            aceHome + "/lib/ace/worker/worker.js",
            worker
        ],
        filter: [ copy.filter.uglifyjs, filterTextPlugin ],
        dest: "build/src/worker-" + mode + ".js"
    });
});

console.log('# ace key bindings ---------');

// copy key bindings
project.assumeAllFilesLoaded();
["vim", "emacs"].forEach(function(keybinding) {
    copy({
        source: [
            copy.source.commonjs({
                project: project.clone(),
                require: [ 'ace/keyboard/keybinding/' + keybinding ]
            })
        ],
        filter: [ copy.filter.moduleDefines, copy.filter.uglifyjs, filterTextPlugin ],
        dest: "build/src/keybinding-" + keybinding + ".js"
    });
});