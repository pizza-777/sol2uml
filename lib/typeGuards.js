"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEnumDefinition = exports.isStructDefinition = exports.isEventDefinition = exports.isModifierDefinition = exports.isFunctionDefinition = exports.isUsingForDeclaration = exports.isStateVariableDeclaration = void 0;
const isStateVariableDeclaration = (node) => {
    return node.type === 'StateVariableDeclaration';
};
exports.isStateVariableDeclaration = isStateVariableDeclaration;
const isUsingForDeclaration = (node) => {
    return node.type === 'UsingForDeclaration';
};
exports.isUsingForDeclaration = isUsingForDeclaration;
const isFunctionDefinition = (node) => {
    return node.type === 'FunctionDefinition';
};
exports.isFunctionDefinition = isFunctionDefinition;
const isModifierDefinition = (node) => {
    return node.type === 'ModifierDefinition';
};
exports.isModifierDefinition = isModifierDefinition;
const isEventDefinition = (node) => {
    return node.type === 'EventDefinition';
};
exports.isEventDefinition = isEventDefinition;
const isStructDefinition = (node) => {
    return node.type === 'StructDefinition';
};
exports.isStructDefinition = isStructDefinition;
const isEnumDefinition = (node) => {
    return node.type === 'EnumDefinition';
};
exports.isEnumDefinition = isEnumDefinition;
//# sourceMappingURL=typeGuards.js.map