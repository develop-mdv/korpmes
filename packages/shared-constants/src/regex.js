"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRONG_PASSWORD_REGEX = exports.URL_REGEX = exports.CHANNEL_MENTION_REGEX = exports.MENTION_REGEX = exports.SLUG_REGEX = exports.PHONE_E164_REGEX = exports.EMAIL_REGEX = void 0;
exports.EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
exports.PHONE_E164_REGEX = /^\+[1-9]\d{1,14}$/;
exports.SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
exports.MENTION_REGEX = /@([a-zA-Z0-9_]+)/g;
exports.CHANNEL_MENTION_REGEX = /#([a-zA-Z0-9_-]+)/g;
exports.URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/g;
exports.STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
//# sourceMappingURL=regex.js.map