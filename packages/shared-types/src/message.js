"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageStatus = exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "TEXT";
    MessageType["IMAGE"] = "IMAGE";
    MessageType["FILE"] = "FILE";
    MessageType["VIDEO"] = "VIDEO";
    MessageType["AUDIO"] = "AUDIO";
    MessageType["VOICE"] = "VOICE";
    MessageType["SYSTEM"] = "SYSTEM";
    MessageType["TASK"] = "TASK";
    MessageType["CALL"] = "CALL";
})(MessageType || (exports.MessageType = MessageType = {}));
var MessageStatus;
(function (MessageStatus) {
    MessageStatus["SENT"] = "SENT";
    MessageStatus["DELIVERED"] = "DELIVERED";
    MessageStatus["READ"] = "READ";
})(MessageStatus || (exports.MessageStatus = MessageStatus = {}));
//# sourceMappingURL=message.js.map