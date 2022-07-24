"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAddress = void 0;
const isAddress = (input) => {
    return input.match(/^0x([A-Fa-f0-9]{40})$/) !== null;
};
exports.isAddress = isAddress;
//# sourceMappingURL=regEx.js.map