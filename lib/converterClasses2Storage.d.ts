import { Attribute, UmlClass } from './umlClass';
export declare enum StorageType {
    Contract = 0,
    Struct = 1
}
export interface Storage {
    id: number;
    fromSlot: number;
    toSlot: number;
    byteSize: number;
    byteOffset: number;
    type: string;
    variable: string;
    contractName?: string;
    value?: string;
    structObjectId?: number;
    enumId?: number;
}
export interface StorageObject {
    id: number;
    name: string;
    address?: string;
    type: StorageType;
    storages: Storage[];
}
export declare const convertClasses2StorageObjects: (contractName: string, umlClasses: UmlClass[]) => StorageObject[];
export declare const parseStructStorageObject: (attribute: Attribute, otherClasses: UmlClass[], storageObjects: StorageObject[]) => StorageObject | undefined;
export declare const calcStorageByteSize: (attribute: Attribute, umlClass: UmlClass, otherClasses: UmlClass[]) => number;
export declare const isElementary: (type: string) => boolean;
