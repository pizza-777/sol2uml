import { Attribute, UmlClass } from './umlClass';
export declare enum StorageType {
    Contract = 0,
    Struct = 1
}
export interface Variable {
    id: number;
    fromSlot: number;
    toSlot: number;
    byteSize: number;
    byteOffset: number;
    type: string;
    variable: string;
    contractName?: string;
    values: string[];
    structStorageId?: number;
    enumId?: number;
}
export interface Storage {
    id: number;
    name: string;
    address?: string;
    type: StorageType;
    variables: Variable[];
}
/**
 *
 * @param url
 * @param contractAddress Contract address to get the storage slot values from
 * @param storage is mutated with the storage values
 */
export declare const addStorageValues: (url: string, contractAddress: string, storage: Storage, blockTag: string) => Promise<void>;
export declare const convertClasses2Storages: (contractName: string, umlClasses: UmlClass[]) => Storage[];
export declare const parseStructStorage: (attribute: Attribute, otherClasses: UmlClass[], storages: Storage[]) => Storage | undefined;
export declare const calcStorageByteSize: (attribute: Attribute, umlClass: UmlClass, otherClasses: UmlClass[]) => number;
export declare const isElementary: (type: string) => boolean;
