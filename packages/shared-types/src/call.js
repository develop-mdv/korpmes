"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallStatus = exports.CallType = void 0;
var CallType;
(function (CallType) {
    CallType["AUDIO"] = "AUDIO";
    CallType["VIDEO"] = "VIDEO";
})(CallType || (exports.CallType = CallType = {}));
var CallStatus;
(function (CallStatus) {
    CallStatus["RINGING"] = "RINGING";
    CallStatus["ACTIVE"] = "ACTIVE";
    CallStatus["ENDED"] = "ENDED";
    CallStatus["MISSED"] = "MISSED";
    CallStatus["REJECTED"] = "REJECTED";
})(CallStatus || (exports.CallStatus = CallStatus = {}));
//# sourceMappingURL=call.js.map