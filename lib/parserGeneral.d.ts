import { UmlClass } from './umlClass';
export declare const parserUmlClasses: (fileFolderAddress: string, options: any) => Promise<{
    umlClasses: UmlClass[];
    contractName?: string;
}>;
