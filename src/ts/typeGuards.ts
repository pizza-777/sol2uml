import {
    BaseASTNode,
    EnumDefinition,
    EventDefinition,
    FunctionDefinition,
    ModifierDefinition,
    StateVariableDeclaration,
    StructDefinition,
    UsingForDeclaration,
} from 'tvm-solidity-parser/dist/src/ast-types'

export const isStateVariableDeclaration = (
    node: BaseASTNode
): node is StateVariableDeclaration => {
    return node.type === 'StateVariableDeclaration'
}

export const isUsingForDeclaration = (
    node: BaseASTNode
): node is UsingForDeclaration => {
    return node.type === 'UsingForDeclaration'
}

export const isFunctionDefinition = (
    node: BaseASTNode
): node is FunctionDefinition => {
    return node.type === 'FunctionDefinition'
}

export const isModifierDefinition = (
    node: BaseASTNode
): node is ModifierDefinition => {
    return node.type === 'ModifierDefinition'
}

export const isEventDefinition = (
    node: BaseASTNode
): node is EventDefinition => {
    return node.type === 'EventDefinition'
}

export const isStructDefinition = (
    node: BaseASTNode
): node is StructDefinition => {
    return node.type === 'StructDefinition'
}

export const isEnumDefinition = (node: BaseASTNode): node is EnumDefinition => {
    return node.type === 'EnumDefinition'
}
