import { BaseASTNode, EnumDefinition, EventDefinition, FunctionDefinition, ModifierDefinition, StateVariableDeclaration, StructDefinition, UsingForDeclaration } from '@solidity-parser/parser/dist/src/ast-types';
export declare const isStateVariableDeclaration: (node: BaseASTNode) => node is StateVariableDeclaration;
export declare const isUsingForDeclaration: (node: BaseASTNode) => node is UsingForDeclaration;
export declare const isFunctionDefinition: (node: BaseASTNode) => node is FunctionDefinition;
export declare const isModifierDefinition: (node: BaseASTNode) => node is ModifierDefinition;
export declare const isEventDefinition: (node: BaseASTNode) => node is EventDefinition;
export declare const isStructDefinition: (node: BaseASTNode) => node is StructDefinition;
export declare const isEnumDefinition: (node: BaseASTNode) => node is EnumDefinition;
