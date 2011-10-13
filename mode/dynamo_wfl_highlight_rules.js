define(function(require, exports, module) {

var oop = require("pilot/oop");
var lang = require("pilot/lang");
var DocCommentHighlightRules = require("ace/mode/doc_comment_highlight_rules").DocCommentHighlightRules;
var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;
var dynamo_wfl_parser = require("ace/mode/dynamo_wfl_parser").logic;

var dynamo_wflHighlightRules = function() {

    var keywords = lang.arrayToMap(
        ("").split("|")
    );

    var buildinOperationsStr = "aggregate|avg|concat|context|create|dateadd|delete|email|exec|execsl|" + 
        "fetch|fetchimap|fetchpop3|fetchrelated|filter|formula|gen|ifnoresult|" + 
        "iphonepush|limit|nop|notin|report|regex|scope|search|select|sendim|" + 
        "sequence|sum|trace|trigger|union";
    
    var buildinOperations = lang.arrayToMap(
        (buildinOperationsStr).split("|")
    );

    // regexp must not have capturing parentheses. Use (?:) instead.
    // regexps are ordered -> the first match is used

    this.$rules = {
        "start": [
                {   // comment
                    token: "comment",
                    regex: "^\\/\\/.*$"
                },
                {   // incorrect comment
                    token: "invalid",
                    regex: "^[^\\/].*\\/\\/.*$"
                },
                {
                    token: "string", // single line string constant
                    regex: '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]'
                },
                {
                    token: "string", // single line string constant
                    regex: "['](?:(?:\\\\.)|(?:[^'\\\\]))*?[']"
                },
                { // operationName : operationType
                    token: function (a, b, c) {
                        var op = "invalid";
                        c = c.match(/\s*.+\s*/);
                        if (buildinOperations.hasOwnProperty(c)) op = "keyword";
                        return ["identifier", "keyword.operator", op]; 
                    },
                    regex: "^(\\S.+)(:\\s*)(.+)$"
                },
                { // op.outarg
                    token: function (op, dot, outarg) {
                        var kindOp = "identifier";
                        var kindOutArg = "identifier";

                        if (window.DynamoGlobal && window.DynamoGlobal.parsed) {
                            var wf = window.DynamoGlobal.parsed;
                            var edl = window.DynamoGlobal.Edl;
                            if (!wf[op]) {
                                kindOp = "invalid";
                            } else if (edl) {
                                var entity = wf[op]['Entity'];
                                if (entity) {
                                    var es = edl[entity];
                                    if (es) {
                                        if (!es[outarg]) {
                                            kindOutArg = "invalid";
                                        }
                                    }
                                }
                            }
                            console.log(JSON.stringify(window.DynamoGlobal.parsed));
                        }

                        return [kindOp, "keyword.operator", kindOutArg];
                    },
                    regex: "([^\\s\.]+)(\\s*\\.\\s*)(.*)$"
                },
                {
                    token : "keyword.operator",
                    regex : "<=|<-|:"
                },
                {
                    token : "identifier",
                    regex : "[a-zA-Z_$][a-zA-Z0-9_$]*\\b(?=\\s*:)"
                },
                {   // Input argument starting without ident
                    token : "invalid.illegal",
                    regex : "^[a-zA-Z_$][a-zA-Z0-9_$]*(?=\\s*(<-|<=))"
                },
                {   // Operation name starting with ident
                    token : "invalid.illegal",
                    regex : "\\s+[a-zA-Z_$][a-zA-Z0-9_$]*\\b(?=\\s*:)"
                },
                {
                    token : function(value) {
                        if (keywords.hasOwnProperty(value))
                            return "keyword";
                        else if (buildinOperations.hasOwnProperty(value))
                            return "keyword";
                        else
                            return "identifier";
                    },
                    regex : "[a-zA-Z_$][a-zA-Z0-9_$]*\\b"
                }
            ]
    };
};

oop.inherits(dynamo_wflHighlightRules, TextHighlightRules);

exports.dynamo_wflHighlightRules = dynamo_wflHighlightRules;
});
