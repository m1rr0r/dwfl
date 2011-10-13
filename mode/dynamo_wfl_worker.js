define(function(require, exports, module) {
    
var oop = require("pilot/oop");
var Mirror = require("ace/worker/mirror").Mirror;
var dynamo_wfl_parser = require("ace/mode/dynamo_wfl_parser").logic;
    
var DynamoWorkflowDefinitionWorker = exports.DynamoWorkflowDefinitionWorker = function(sender) {
    Mirror.call(this, sender);
    this.setTimeout(500);
};

oop.inherits(DynamoWorkflowDefinitionWorker, Mirror);

(function() {

    var getMembers = function (workflow) {
        var result = {};
        for (var op in workflow) {
            if (typeof workflow[op] === "function") continue;
            if (op.indexOf("__") === 0) continue;
            result[op] = null;
        }
        return result;
    };
    
    this.onUpdate = function() {
        var value = this.doc.getValue();
        var lines = value.split(/\n/g);
        var lineDelimitedSrc = ">" + value.replace(/\n/ig, "\n>");

        var findRowNumber = function(reg) {
            for (var i=0; i<lines.length; i++) {
                if (reg.test(lines[i]))
                    return i;
            }
        };

        var start = new Date();
        var issues = [];
        try {
            var result = dynamo_wfl_parser.parse(lineDelimitedSrc);
            //console.log(JSON.stringify(result));
            
            var ops = getMembers(result);
            for (var opname in ops) {
                var op = result[opname];
                var args = getMembers(op);
                
                for (var argname in args) {
                    var argval = op[argname];
                    
                    if (argval && argval.name) {
                        if (!result[argval.name]) {
                            
                            var row = findRowNumber(new RegExp(argval.name + "." + argval.arg));
                            if (row) {
                                issues.push({
                                        row: row,
                                        column: null,
                                        text: 'Operation with name ' + argval.name + ' is not yet defined.',
                                        type: "warning"
                                    });
                            }
                        }
                    }
                }
            }

        } catch (e) {
        }
        
        var total = new Date() - start;
        console.log('time in parse: ' + total + ' ms');
        
        if (issues.length === 0) {
            this.sender.emit("noissues", 'ok');
        } else {
            this.sender.emit("issues", issues);
        }
            
        /*
        value = value.replace(/^#!.*\n/, "\n");
        
        var parser = require("ace/narcissus/jsparse");
        try {
            parser.parse(value);
        } catch(e) {
            var chunks = e.message.split(":")
            var message = chunks.pop().trim();
            var lineNumber = parseInt(chunks.pop().trim()) - 1;
            this.sender.emit("narcissus", {
                row: lineNumber,
                column: null, // TODO convert e.cursor
                text: message,
                type: "error"
            });
            return;
        } finally {
        }
        
        lint(value, {undef: false, onevar: false, passfail: false});
        this.sender.emit("jslint", lint.errors);        
        */
    };
    
}).call(DynamoWorkflowDefinitionWorker.prototype);

});