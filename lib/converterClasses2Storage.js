"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isElementary = exports.calcStorageByteSize = exports.parseStructStorageObject = exports.convertClasses2StorageObjects = exports.addStorageValues = exports.StorageType = void 0;
const umlClass_1 = require("./umlClass");
const associations_1 = require("./associations");
const slotValues_1 = require("./slotValues");
var StorageType;
(function (StorageType) {
    StorageType[StorageType["Contract"] = 0] = "Contract";
    StorageType[StorageType["Struct"] = 1] = "Struct";
})(StorageType = exports.StorageType || (exports.StorageType = {}));
let storageObjectId = 1;
let storageId = 1;
/**
 *
 * @param url
 * @param storageContract Contract address to get the storage slot values from
 * @param storageObject is mutated with the storage values
 */
const addStorageValues = async (url, contractAddress, storageObject, blockTag) => {
    const slots = storageObject.storages.map((s) => s.fromSlot);
    const values = await (0, slotValues_1.getStorageValues)(url, contractAddress, slots, blockTag);
    storageObject.storages.forEach((storage, i) => {
        storage.value = values[i];
    });
};
exports.addStorageValues = addStorageValues;
const convertClasses2StorageObjects = (contractName, umlClasses) => {
    // Find the base UML Class from the base contract name
    const umlClass = umlClasses.find(({ name }) => {
        return name === contractName;
    });
    if (!umlClass) {
        throw Error(`Failed to find contract with name "${contractName}"`);
    }
    const storageObjects = [];
    const storages = parseStorage(umlClass, umlClasses, [], storageObjects, []);
    storageObjects.unshift({
        id: storageObjectId++,
        name: contractName,
        type: StorageType.Contract,
        storages,
    });
    return storageObjects;
};
exports.convertClasses2StorageObjects = convertClasses2StorageObjects;
/**
 * Recursively parses the storage for a given contract.
 * @param umlClass contract or file level struct
 * @param umlClasses other contracts, structs and enums that may be a type of a storage variable.
 * @param storages mutable array of storage slots that is appended to
 * @param storageObjects mutable array of StorageObjects that is appended with structs
 */
const parseStorage = (umlClass, umlClasses, storages, storageObjects, inheritedContracts) => {
    // Add storage slots from inherited contracts first.
    // Get immediate parent contracts that the class inherits from
    const parentContracts = umlClass.getParentContracts();
    // Filter out any already inherited contracts
    const newInheritedContracts = parentContracts.filter((parentContract) => !inheritedContracts.includes(parentContract.targetUmlClassName));
    // Mutate inheritedContracts to include the new inherited contracts
    inheritedContracts.push(...newInheritedContracts.map((c) => c.targetUmlClassName));
    // Recursively parse each new inherited contract
    newInheritedContracts.forEach((parent) => {
        const parentClass = (0, associations_1.findAssociatedClass)(parent, umlClass, umlClasses);
        if (!parentClass)
            throw Error(`Failed to find parent contract ${parent.targetUmlClassName} of ${umlClass.absolutePath}`);
        // recursively parse inherited contract
        parseStorage(parentClass, umlClasses, storages, storageObjects, inheritedContracts);
    });
    // Parse storage for each attribute
    umlClass.attributes.forEach((attribute) => {
        // Ignore any attributes that are constants or immutable
        if (attribute.compiled)
            return;
        const byteSize = (0, exports.calcStorageByteSize)(attribute, umlClass, umlClasses);
        // find any dependent structs
        const linkedStruct = (0, exports.parseStructStorageObject)(attribute, umlClasses, storageObjects);
        const structObjectId = linkedStruct?.id;
        // Get the toSlot of the last storage item
        let lastToSlot = 0;
        let nextOffset = 0;
        if (storages.length > 0) {
            const lastStorage = storages[storages.length - 1];
            lastToSlot = lastStorage.toSlot;
            nextOffset = lastStorage.byteOffset + lastStorage.byteSize;
        }
        if (nextOffset + byteSize > 32) {
            const nextFromSlot = storages.length > 0 ? lastToSlot + 1 : 0;
            storages.push({
                id: storageId++,
                fromSlot: nextFromSlot,
                toSlot: nextFromSlot + Math.floor((byteSize - 1) / 32),
                byteSize,
                byteOffset: 0,
                type: attribute.type,
                variable: attribute.name,
                contractName: umlClass.name,
                structObjectId,
            });
        }
        else {
            storages.push({
                id: storageId++,
                fromSlot: lastToSlot,
                toSlot: lastToSlot,
                byteSize,
                byteOffset: nextOffset,
                type: attribute.type,
                variable: attribute.name,
                contractName: umlClass.name,
                structObjectId,
            });
        }
    });
    return storages;
};
const parseStructStorageObject = (attribute, otherClasses, storageObjects) => {
    if (attribute.attributeType === umlClass_1.AttributeType.UserDefined) {
        // Have we already created the storageObject?
        const existingStorageObject = storageObjects.find((dep) => dep.name === attribute.type);
        if (existingStorageObject) {
            return existingStorageObject;
        }
        // Is the user defined type linked to another Contract, Struct or Enum?
        const dependentClass = otherClasses.find(({ name }) => {
            return (name === attribute.type || name === attribute.type.split('.')[1]);
        });
        if (!dependentClass) {
            throw Error(`Failed to find user defined type "${attribute.type}"`);
        }
        if (dependentClass.stereotype === umlClass_1.ClassStereotype.Struct) {
            const storages = parseStorage(dependentClass, otherClasses, [], storageObjects, []);
            const newStorageObject = {
                id: storageObjectId++,
                name: attribute.type,
                type: StorageType.Struct,
                storages,
            };
            storageObjects.push(newStorageObject);
            return newStorageObject;
        }
        return undefined;
    }
    if (attribute.attributeType === umlClass_1.AttributeType.Mapping ||
        attribute.attributeType === umlClass_1.AttributeType.Array) {
        // get the UserDefined type from the mapping or array
        // note the mapping could be an array of Structs
        // Could also be a mapping of a mapping
        const result = attribute.attributeType === umlClass_1.AttributeType.Mapping
            ? attribute.type.match(/=\\>((?!mapping)\w*)[\\[]/)
            : attribute.type.match(/(\w+)\[/);
        if (result !== null && result[1] && !(0, exports.isElementary)(result[1])) {
            // Have we already created the storageObject?
            const existingStorageObject = storageObjects.find(({ name }) => name === result[1] || name === result[1].split('.')[1]);
            if (existingStorageObject) {
                return existingStorageObject;
            }
            // Find UserDefined type
            const typeClass = otherClasses.find(({ name }) => name === result[1] || name === result[1].split('.')[1]);
            if (!typeClass) {
                throw Error(`Failed to find user defined type "${result[1]}" in attribute type "${attribute.type}"`);
            }
            if (typeClass.stereotype === umlClass_1.ClassStereotype.Struct) {
                const storages = parseStorage(typeClass, otherClasses, [], storageObjects, []);
                const newStorageObject = {
                    id: storageObjectId++,
                    name: typeClass.name,
                    type: StorageType.Struct,
                    storages,
                };
                storageObjects.push(newStorageObject);
                return newStorageObject;
            }
        }
        return undefined;
    }
    return undefined;
};
exports.parseStructStorageObject = parseStructStorageObject;
// Calculates the storage size of an attribute in bytes
const calcStorageByteSize = (attribute, umlClass, otherClasses) => {
    if (attribute.attributeType === umlClass_1.AttributeType.Mapping ||
        attribute.attributeType === umlClass_1.AttributeType.Function) {
        return 32;
    }
    if (attribute.attributeType === umlClass_1.AttributeType.Array) {
        // All array dimensions must be fixed. eg [2][3][8].
        const result = attribute.type.match(/(\w+)(\[([\w][\w]*)\])+$/);
        // The above will not match any dynamic array dimensions, eg [],
        // as there needs to be one or more [0-9]+ in the square brackets
        if (result === null) {
            // Any dynamic array dimension means the whole array is dynamic
            // so only takes 32 bytes (1 slot)
            return 32;
        }
        // All array dimensions are fixes so we now need to multiply all the dimensions
        // to get a total number of array elements
        const arrayDimensions = attribute.type.match(/\[\w+/g);
        const dimensionsStr = arrayDimensions.map((d) => d.slice(1));
        const dimensions = dimensionsStr.map((dimension) => {
            const dimensionNum = parseInt(dimension);
            if (!isNaN(dimensionNum))
                return dimensionNum;
            // Try and size array dimension from declared constants
            const constant = umlClass.constants.find((constant) => constant.name === dimension);
            if (constant) {
                return constant.value;
            }
            throw Error(`Could not size fixed sized array with dimension "${dimension}"`);
        });
        let elementSize;
        // If a fixed sized array
        if ((0, exports.isElementary)(result[1])) {
            const elementAttribute = {
                attributeType: umlClass_1.AttributeType.Elementary,
                type: result[1],
                name: 'element',
            };
            elementSize = (0, exports.calcStorageByteSize)(elementAttribute, umlClass, otherClasses);
        }
        else {
            const elementAttribute = {
                attributeType: umlClass_1.AttributeType.UserDefined,
                type: result[1],
                name: 'userDefined',
            };
            elementSize = (0, exports.calcStorageByteSize)(elementAttribute, umlClass, otherClasses);
        }
        // Anything over 16 bytes, like an address, will take a whole 32 byte slot
        if (elementSize > 16 && elementSize < 32) {
            elementSize = 32;
        }
        const firstDimensionBytes = elementSize * dimensions[0];
        const firstDimensionSlotBytes = Math.ceil(firstDimensionBytes / 32) * 32;
        const remainingElements = dimensions
            .slice(1)
            .reduce((total, dimension) => total * dimension, 1);
        return firstDimensionSlotBytes * remainingElements;
    }
    // If a Struct or Enum
    if (attribute.attributeType === umlClass_1.AttributeType.UserDefined) {
        // Is the user defined type linked to another Contract, Struct or Enum?
        const attributeClass = otherClasses.find(({ name }) => {
            return (name === attribute.type || name === attribute.type.split('.')[1]);
        });
        if (!attributeClass) {
            throw Error(`Failed to find user defined struct or enum "${attribute.type}"`);
        }
        switch (attributeClass.stereotype) {
            case umlClass_1.ClassStereotype.Enum:
                return 1;
            case umlClass_1.ClassStereotype.Contract:
            case umlClass_1.ClassStereotype.Abstract:
            case umlClass_1.ClassStereotype.Interface:
            case umlClass_1.ClassStereotype.Library:
                return 20;
            case umlClass_1.ClassStereotype.Struct:
                let structByteSize = 0;
                attributeClass.attributes.forEach((structAttribute) => {
                    // If next attribute is an array, then we need to start in a new slot
                    if (structAttribute.attributeType === umlClass_1.AttributeType.Array) {
                        structByteSize = Math.ceil(structByteSize / 32) * 32;
                    }
                    // If next attribute is an struct, then we need to start in a new slot
                    else if (structAttribute.attributeType ===
                        umlClass_1.AttributeType.UserDefined) {
                        // UserDefined types can be a struct or enum, so we need to check if it's a struct
                        const userDefinedClass = otherClasses.find(({ name }) => {
                            return (name === structAttribute.type ||
                                name === structAttribute.type.split('.')[1]);
                        });
                        if (!userDefinedClass) {
                            throw Error(`Failed to find user defined type "${structAttribute.type}" in struct ${attributeClass.name}`);
                        }
                        // If a struct
                        if (userDefinedClass.stereotype ===
                            umlClass_1.ClassStereotype.Struct) {
                            structByteSize = Math.ceil(structByteSize / 32) * 32;
                        }
                    }
                    const attributeSize = (0, exports.calcStorageByteSize)(structAttribute, umlClass, otherClasses);
                    // check if attribute will fit into the remaining slot
                    const endCurrentSlot = Math.ceil(structByteSize / 32) * 32;
                    const spaceLeftInSlot = endCurrentSlot - structByteSize;
                    if (attributeSize <= spaceLeftInSlot) {
                        structByteSize += attributeSize;
                    }
                    else {
                        structByteSize = endCurrentSlot + attributeSize;
                    }
                });
                // structs take whole 32 byte slots so round up to the nearest 32 sized slots
                return Math.ceil(structByteSize / 32) * 32;
            default:
                return 32;
        }
    }
    if (attribute.attributeType === umlClass_1.AttributeType.Elementary) {
        switch (attribute.type) {
            case 'bool':
                return 1;
            case 'address':
                return 20;
            case 'string':
            case 'bytes':
            case 'uint':
            case 'int':
            case 'ufixed':
            case 'fixed':
                return 32;
            default:
                const result = attribute.type.match(/[u]*(int|fixed|bytes)([0-9]+)/);
                if (result === null || !result[2]) {
                    throw Error(`Failed size elementary type "${attribute.type}"`);
                }
                // If bytes
                if (result[1] === 'bytes') {
                    return parseInt(result[2]);
                }
                // TODO need to handle fixed types when they are supported
                // If an int
                const bitSize = parseInt(result[2]);
                return bitSize / 8;
        }
    }
    throw new Error(`Failed to calc bytes size of attribute with name "${attribute.name}" and type ${attribute.type}`);
};
exports.calcStorageByteSize = calcStorageByteSize;
const isElementary = (type) => {
    switch (type) {
        case 'bool':
        case 'address':
        case 'string':
        case 'bytes':
        case 'uint':
        case 'int':
        case 'ufixed':
        case 'fixed':
            return true;
        default:
            const result = type.match(/[u]*(int|fixed|bytes)([0-9]+)/);
            return result !== null;
    }
};
exports.isElementary = isElementary;
//# sourceMappingURL=converterClasses2Storage.js.map