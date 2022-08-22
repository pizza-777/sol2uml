import { Association, UmlClass } from './umlClass';
export declare const findAssociatedClass: (association: Association, sourceUmlClass: UmlClass, umlClasses: UmlClass[], searchedAbsolutePaths?: string[]) => UmlClass | undefined;
