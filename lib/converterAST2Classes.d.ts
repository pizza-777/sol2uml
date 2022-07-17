import { ASTNode } from '@solidity-parser/parser/dist/src/ast-types';
import { UmlClass } from './umlClass';
export declare function convertAST2UmlClasses(node: ASTNode, relativePath: string, filesystem?: boolean): UmlClass[];
