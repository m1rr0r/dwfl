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

//var wf = window.DynamoGlobal.parsed;
//var edl = window.DynamoGlobal.Edl;

    // validation logic
    var val = {
        verified_ok : '.val_ok',
        verified_invalid: '.val_nok',
        cannot_verify: '.val_unknown',

        getOperation : function(opName) {
            //console.log('getOperation('+ JSON.stringify(arguments) + ')');
            if (!window.DynamoGlobal) return;
            if (!window.DynamoGlobal.parsed) return;
            if (!opName) return;

            opName = opName.toLowerCase();

            var wf = window.DynamoGlobal.parsed;
            //console.log('wf=' + JSON.stringify(wf));
            return wf[opName];
        },

        getOperationType : function(opName) {
            //console.log('getOperationType('+ JSON.stringify(arguments) + ')');
            var op = val.getOperation(opName);
            if (!op) return;
            return op.__type || opName;
        },

        getOperationDescriptor : function(opName) {
            var opType = val.getOperationType(opName);
            if (!opType) return;
            if (!window.DynamoGlobal.Operations) return;

            return window.DynamoGlobal.Operations[opType];
        },

        getOperationInputEntity : function(opName) {
            if (!window.DynamoGlobal) return;
            if (!window.DynamoGlobal.Edl) return;

            var opType = val.getOperationType(opName);
            if (!opType) return;

            var entityDesigntingAttributePerType = {
                'fetch': 'entity',
                'fetchrelated': 'entity',
                'create': 'entity'
            };

            if (!entityDesigntingAttributePerType[opType]) return;

            var op = val.getOperation(opName);
            if (!op) return;

            var entityName = op[entityDesigntingAttributePerType[opType]];
            if (!entityName) return;

            return window.DynamoGlobal.Edl[entityName];
        },

        getOperationOutputEntity : function(opName) {
            if (!window.DynamoGlobal) return;
            if (!window.DynamoGlobal.Edl) return;

            var opType = val.getOperationType(opName);
            if (!opType) return;

            var entityDesigntingAttributePerType = {
                'fetch': 'entity',
                'fetchrelated': 'entity'
            };

            if (!entityDesigntingAttributePerType[opType]) return;

            var op = val.getOperation(opName);
            if (!op) return;

            var entityName = op[entityDesigntingAttributePerType[opType]];
            if (!entityName) return;

            return window.DynamoGlobal.Edl[entityName];
        },

        checkValidOperation : function(opName) {
            if (!window.DynamoGlobal) return;
            if (!window.DynamoGlobal.parsed) return;

            var op = val.getOperation(opName);
            if (op) return val.verified_ok;
            return val.verified_invalid;
        },

        checkValidInputArgument : function(opName, argName) {
            // Check build-in operation arguments
            var opDescriptor = val.getOperationDescriptor(opName);
            if (opDescriptor) {
                var signature = opDescriptor[argName];
                if (signature) {
                    if (signature === 1) return val.verified_ok;
                    if (signature === 3) return val.verified_ok;
                }
            }

            // Check if operation accepts entity properties as result args
            var entity = val.getOperationInputEntity(opName);
            if (entity) {
                if (entity[argName]) return val.verified_ok;
                return val.verified_invalid;
            }

            return; // undefined -- cannot determine
        },

        checkValidOutputArgument : function(opName, argName) {
            if (!argName) return;
            argName = argName.toLowerCase();

            // Check build-in operation arguments
            var opDescriptor = val.getOperationDescriptor(opName);
            if (opDescriptor) {
                var signature = opDescriptor[argName];
                if (signature) {
                    if (signature === 2) return val.verified_ok;
                    if (signature === 3) return val.verified_ok;
                }
            }

            // Check the operation itself
            var op = val.getOperation(opName);
            //console.log('aa');
            if (op) {
                //console.log('op=' + JSON.stringify(op));
                //console.log('argName=' + argName);
                //console.log('op[argName]=' + op[argName]);
                if (op[argName]) return val.verified_ok;
            }

            // Check if operation returns entity properties as result args
            var entity = val.getOperationOutputEntity(opName);
            if (entity) {
                //console.log('entity=' + JSON.stringify(entity));
                if (entity[argName]) return val.verified_ok;
                return val.verified_invalid;
            }

            return; // undefined -- cannot determine
        }

    };

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

                        kindOp += (val.checkValidOperation(op) || val.cannot_verify);
                        kindOutArg += (val.checkValidOutputArgument(op, outarg) || val.cannot_verify);

                        //console.log("kindOp=" + kindOp);
                        //console.log("kindOutArg=" + kindOutArg);

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
