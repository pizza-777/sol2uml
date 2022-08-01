import { Attribute, UmlClass } from './umlClass';
export declare enum StorageType {
    Contract = "Contract",
    Struct = "Struct",
    Array = "Array"
}
export interface Variable {
    id: number;
    fromSlot: number;
    toSlot: number;
    byteSize: number;
    byteOffset: number;
    type: string;
    dynamic: boolean;
    variable: string;
    contractName?: string;
    noValue: boolean;
    value?: string;
    referenceStorageId?: number;
    enumId?: number;
}
export interface Storage {
    id: number;
    name: string;
    address?: string;
    slotKey?: string;
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
export declare const parseReferenceStorage: (attribute: Attribute, otherClasses: UmlClass[], storages: Storage[]) => Storage | undefined;
export declare const calcStorageByteSize: (attribute: Attribute, umlClass: UmlClass, otherClasses: UmlClass[]) => {
    size: number;
    dynamic: boolean;
};
export declare const isElementary: (type: string) => boolean;
export declare const calcSlotKey: (variable: Variable) => string | undefined;
export declare const shiftStorageSlots: (storage: Storage, slots: number) => void;
