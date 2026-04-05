"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMemberRole = exports.ChatType = void 0;
var ChatType;
(function (ChatType) {
    ChatType["PERSONAL"] = "PERSONAL";
    ChatType["GROUP"] = "GROUP";
    ChatType["CHANNEL"] = "CHANNEL";
    ChatType["PROJECT"] = "PROJECT";
    ChatType["ANNOUNCEMENT"] = "ANNOUNCEMENT";
})(ChatType || (exports.ChatType = ChatType = {}));
var ChatMemberRole;
(function (ChatMemberRole) {
    ChatMemberRole["ADMIN"] = "ADMIN";
    ChatMemberRole["MEMBER"] = "MEMBER";
})(ChatMemberRole || (exports.ChatMemberRole = ChatMemberRole = {}));
//# sourceMappingURL=chat.js.map