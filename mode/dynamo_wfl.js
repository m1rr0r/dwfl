define(function(require, exports, module) {

var oop = require("pilot/oop");
var TextMode = require("ace/mode/text").Mode;
var Tokenizer = require("ace/tokenizer").Tokenizer;
var dynamo_wflHighlightRules = require("ace/mode/dynamo_wfl_highlight_rules").dynamo_wflHighlightRules;
var Range = require("ace/range").Range;
var WorkerClient = require("ace/worker/worker_client").WorkerClient;
//var MatchingBraceOutdent = require("ace/mode/matching_brace_outdent").MatchingBraceOutdent;
//var CstyleBehaviour = require("ace/mode/behaviour/cstyle").CstyleBehaviour;

var Mode = function() {
    this.$tokenizer = new Tokenizer(new dynamo_wflHighlightRules().getRules());
    //this.$outdent = new MatchingBraceOutdent();
    //this.$behaviour = new CstyleBehaviour();
};
oop.inherits(Mode, TextMode);

(function() {

    this.toggleCommentLines = function(state, doc, startRow, endRow) {
        var outdent = true;
        var outentedRows = [];
        var re = /^(\s*)\/\//;

        for (var i=startRow; i<= endRow; i++) {
            if (!re.test(doc.getLine(i))) {
                outdent = false;
                break;
            }
        }

        if (outdent) {
            var deleteRange = new Range(0, 0, 0, 0);
            for (var i=startRow; i<= endRow; i++)
            {
                var line = doc.getLine(i);
                var m = line.match(re);
                deleteRange.start.row = i;
                deleteRange.end.row = i;
                deleteRange.end.column = m[0].length;
                doc.replace(deleteRange, m[1]);
            }
        }
        else {
            doc.indentRows(startRow, endRow, "//");
        }
    };

    this.getNextLineIndent = function(state, line, tab) {
        var indent = this.$getIndent(line);

        var tokenizedLine = this.$tokenizer.getLineTokens(line, state);
        var tokens = tokenizedLine.tokens;
        var endState = tokenizedLine.state;

        if (tokens.length && tokens[tokens.length-1].type == "comment") {
            return indent;
        }

        if (state == "start") {
            var match = line.match(/^.*[\{\(\[]\s*$/);
            if (match) {
                indent += tab;
            }
        } else if (state == "doc-start") {
            if (endState == "start") {
                return "";
            }
            var match = line.match(/^\s*(\/?)\*/);
            if (match) {
                if (match[1]) {
                    indent += " ";
                }
                indent += "* ";
            }
        }

        return indent;
    };

    this.checkOutdent = function(state, line, input) {
        //return this.$outdent.checkOutdent(line, input);
    };

    this.autoOutdent = function(state, doc, row) {
        //this.$outdent.autoOutdent(doc, row);
    };

    this.createWorker = function(session) {
        var doc = session.getDocument();
        var worker = new WorkerClient(["ace", "pilot"], "worker-dynamo_wfl.js", "ace/mode/dynamo_wfl_worker", "DynamoWorkflowDefinitionWorker");
        worker.call("setValue", [doc.getValue()]);
        
        doc.on("change", function(e) {
            e.range = {
                start: e.data.range.start,
                end: e.data.range.end
            };
            worker.emit("change", e);
        });
        
        worker.on("issues", function(e) {
            session.setAnnotations(e.data);
        });

        worker.on("noissues", function(e) {
            session.clearAnnotations();
        });
        
        worker.on("terminate", function() {
            session.clearAnnotations();
        });
        
        return worker;
    };


}).call(Mode.prototype);

exports.Mode = Mode;
});
