"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shiftStorageSlots = exports.calcSlotKey = exports.isElementary = exports.calcStorageByteSize = exports.parseReferenceStorage = exports.convertClasses2Storages = exports.addStorageValues = exports.StorageType = void 0;
const umlClass_1 = require("./umlClass");
const associations_1 = require("./associations");
const slotValues_1 = require("./slotValues");
const utils_1 = require("ethers/lib/utils");
const ethers_1 = require("ethers");
var StorageType;
(function (StorageType) {
    StorageType["Contract"] = "Contract";
    StorageType["Struct"] = "Struct";
    StorageType["Array"] = "Array";
})(StorageType = exports.StorageType || (exports.StorageType = {}));
let storageId = 1;
let variableId = 1;
/**
 *
 * @param url
 * @param contractAddress Contract address to get the storage slot values from
 * @param storage is mutated with the storage values
 */
const addStorageValues = async (url, contractAddress, storage, blockTag) => {
    const valueVariables = storage.variables.filter((s) => !s.noValue);
    const slots = valueVariables.map((s) => s.fromSlot);
    const values = await (0, slotValues_1.getStorageValues)(url, contractAddress, slots, blockTag);
    valueVariables.forEach((storage, i) => {
        storage.value = values[i];
    });
};
exports.addStorageValues = addStorageValues;
const convertClasses2Storages = (contractName, umlClasses) => {
    // Find the base UML Class from the base contract name
    const umlClass = umlClasses.find(({ name }) => {
        return name === contractName;
    });
    if (!umlClass) {
        throw Error(`Failed to find contract with name "${contractName}"`);
    }
    const storages = [];
    const variables = parseVariables(umlClass, umlClasses, [], storages, []);
    storages.unshift({
        id: storageId++,
        name: contractName,
        type: StorageType.Contract,
        variables: variables,
    });
    return storages;
};
exports.convertClasses2Storages = convertClasses2Storages;
/**
 * Recursively parses the storage variables for a given contract.
 * @param umlClass contract or file level struct
 * @param umlClasses other contracts, structs and enums that may be a type of a storage variable.
 * @param variables mutable array of storage slots that is appended to
 * @param storages mutable array of storages that is appended with structs
 */
const parseVariables = (umlClass, umlClasses, variables, storages, inheritedContracts) => {
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
        parseVariables(parentClass, umlClasses, variables, storages, inheritedContracts);
    });
    // Parse storage for each attribute
    umlClass.attributes.forEach((attribute) => {
        // Ignore any attributes that are constants or immutable
        if (attribute.compiled)
            return;
        const { size: byteSize, dynamic } = (0, exports.calcStorageByteSize)(attribute, umlClass, umlClasses);
        const noValue = attribute.attributeType === umlClass_1.AttributeType.Mapping ||
            (attribute.attributeType === umlClass_1.AttributeType.Array && !dynamic);
        // find any dependent storage locations
        const referenceStorage = (0, exports.parseReferenceStorage)(attribute, umlClasses, storages);
        // Get the toSlot of the last storage item
        let lastToSlot = 0;
        let nextOffset = 0;
        if (variables.length > 0) {
            const lastStorage = variables[variables.length - 1];
            lastToSlot = lastStorage.toSlot;
            nextOffset = lastStorage.byteOffset + lastStorage.byteSize;
        }
        let newVariable;
        if (nextOffset + byteSize > 32) {
            const nextFromSlot = variables.length > 0 ? lastToSlot + 1 : 0;
            newVariable = {
                id: variableId++,
                fromSlot: nextFromSlot,
                toSlot: nextFromSlot + Math.floor((byteSize - 1) / 32),
                byteSize,
                byteOffset: 0,
                type: attribute.type,
                dynamic,
                noValue,
                variable: attribute.name,
                contractName: umlClass.name,
                referenceStorageId: referenceStorage?.id,
            };
        }
        else {
            newVariable = {
                id: variableId++,
                fromSlot: lastToSlot,
                toSlot: lastToSlot,
                byteSize,
                byteOffset: nextOffset,
                type: attribute.type,
                dynamic,
                noValue,
                variable: attribute.name,
                contractName: umlClass.name,
                referenceStorageId: referenceStorage?.id,
            };
        }
        if (referenceStorage) {
            if (!newVariable.dynamic) {
                (0, exports.shiftStorageSlots)(referenceStorage, newVariable.fromSlot);
            }
            else if (attribute.attributeType === umlClass_1.AttributeType.Array) {
                referenceStorage.slotKey = (0, exports.calcSlotKey)(newVariable);
            }
        }
        variables.push(newVariable);
    });
    return variables;
};
const parseReferenceStorage = (attribute, otherClasses, storages) => {
    if (attribute.attributeType === umlClass_1.AttributeType.UserDefined) {
        // Is the user defined type linked to another Contract, Struct or Enum?
        const dependentClass = otherClasses.find(({ name }) => {
            return (name === attribute.type || name === attribute.type.split('.')[1]);
        });
        if (!dependentClass) {
            throw Error(`Failed to find user defined type "${attribute.type}"`);
        }
        if (dependentClass.stereotype === umlClass_1.ClassStereotype.Struct) {
            const variables = parseVariables(dependentClass, otherClasses, [], storages, []);
            const newStorage = {
                id: storageId++,
                name: attribute.type,
                type: StorageType.Struct,
                variables,
            };
            storages.push(newStorage);
            return newStorage;
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
            // Find UserDefined type
            const typeClass = otherClasses.find(({ name }) => name === result[1] || name === result[1].split('.')[1]);
            if (!typeClass) {
                throw Error(`Failed to find user defined type "${result[1]}" in attribute type "${attribute.type}"`);
            }
            if (typeClass.stereotype === umlClass_1.ClassStereotype.Struct) {
                const variables = parseVariables(typeClass, otherClasses, [], storages, []);
                const newStorage = {
                    id: storageId++,
                    name: typeClass.name,
                    type: StorageType.Struct,
                    variables,
                };
                storages.push(newStorage);
                return newStorage;
            }
        }
        return undefined;
    }
    return undefined;
};
exports.parseReferenceStorage = parseReferenceStorage;
// Calculates the storage size of an attribute in bytes
const calcStorageByteSize = (attribute, umlClass, otherClasses) => {
    if (attribute.attributeType === umlClass_1.AttributeType.Mapping ||
        attribute.attributeType === umlClass_1.AttributeType.Function) {
        return { size: 32, dynamic: true };
    }
    if (attribute.attributeType === umlClass_1.AttributeType.Array) {
        // Fixed sized arrays are read from right to left until there is a dynamic dimension
        // eg address[][3][2] is a fixed size array that uses 6 slots.
        // while address [2][] is a dynamic sized array.
        const arrayDimensions = attribute.type.match(/\[\w*]/g);
        // Remove first [ and last ] from each arrayDimensions
        const dimensionsStr = arrayDimensions.map((a) => a.slice(1, -1));
        // fixed-sized arrays are read from right to left so reverse the dimensions
        const dimensionsStrReversed = dimensionsStr.reverse();
        // read fixed-size dimensions until we get a dynamic array with no dimension
        let dimension = dimensionsStrReversed.shift();
        const fixedDimensions = [];
        while (dimension && dimension !== '') {
            const dimensionNum = parseInt(dimension);
            if (!isNaN(dimensionNum)) {
                fixedDimensions.push(dimensionNum);
            }
            else {
                // Try and size array dimension from declared constants
                const constant = umlClass.constants.find((constant) => constant.name === dimension);
                if (!constant) {
                    throw Error(`Could not size fixed sized array with dimension "${dimension}"`);
                }
                fixedDimensions.push(constant.value);
            }
            // read the next dimension for the next loop
            dimension = dimensionsStrReversed.shift();
        }
        // If the first dimension is dynamic, ie []
        if (fixedDimensions.length === 0) {
            // dynamic arrays start at the keccak256 of the slot number
            // the array length is stored in the 32 byte slot
            return { size: 32, dynamic: true };
        }
        let elementSize;
        const type = attribute.type.substring(0, attribute.type.indexOf('['));
        // If a fixed sized array
        if ((0, exports.isElementary)(type)) {
            const elementAttribute = {
                attributeType: umlClass_1.AttributeType.Elementary,
                type,
                name: 'element',
            };
            ({ size: elementSize } = (0, exports.calcStorageByteSize)(elementAttribute, umlClass, otherClasses));
        }
        else {
            const elementAttribute = {
                attributeType: umlClass_1.AttributeType.UserDefined,
                type,
                name: 'userDefined',
            };
            ({ size: elementSize } = (0, exports.calcStorageByteSize)(elementAttribute, umlClass, otherClasses));
        }
        // Anything over 16 bytes, like an address, will take a whole 32 byte slot
        if (elementSize > 16 && elementSize < 32) {
            elementSize = 32;
        }
        // If multi dimension, then the first element is 32 bytes
        if (fixedDimensions.length < arrayDimensions.length) {
            const totalDimensions = fixedDimensions.reduce((total, dimension) => total * dimension, 1);
            return {
                size: 32 * totalDimensions,
                dynamic: false,
            };
        }
        const lastItem = fixedDimensions.length - 1;
        const lastDimensionBytes = elementSize * fixedDimensions[lastItem];
        const lastDimensionSlotBytes = Math.ceil(lastDimensionBytes / 32) * 32;
        const remainingDimensions = fixedDimensions
            .slice(0, lastItem)
            .reduce((total, dimension) => total * dimension, 1);
        return {
            size: lastDimensionSlotBytes * remainingDimensions,
            dynamic: false,
        };
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
                return { size: 1, dynamic: false };
            case umlClass_1.ClassStereotype.Contract:
            case umlClass_1.ClassStereotype.Abstract:
            case umlClass_1.ClassStereotype.Interface:
            case umlClass_1.ClassStereotype.Library:
                return { size: 20, dynamic: false };
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
                    const { size: attributeSize } = (0, exports.calcStorageByteSize)(structAttribute, umlClass, otherClasses);
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
                return {
                    size: Math.ceil(structByteSize / 32) * 32,
                    dynamic: false,
                };
            default:
                return { size: 32, dynamic: false };
        }
    }
    if (attribute.attributeType === umlClass_1.AttributeType.Elementary) {
        switch (attribute.type) {
            case 'bool':
                return { size: 1, dynamic: false };
            case 'address':
                return { size: 20, dynamic: false };
            case 'string':
            case 'bytes':
            case 'uint':
            case 'int':
            case 'ufixed':
            case 'fixed':
                return { size: 32, dynamic: false };
            default:
                const result = attribute.type.match(/[u]*(int|fixed|bytes)([0-9]+)/);
                if (result === null || !result[2]) {
                    throw Error(`Failed size elementary type "${attribute.type}"`);
                }
                // If bytes
                if (result[1] === 'bytes') {
                    return { size: parseInt(result[2]), dynamic: false };
                }
                // TODO need to handle fixed types when they are supported
                // If an int
                const bitSize = parseInt(result[2]);
                return { size: bitSize / 8, dynamic: false };
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
const calcSlotKey = (variable) => {
    if (variable.dynamic) {
        return (0, utils_1.keccak256)((0, utils_1.toUtf8Bytes)(ethers_1.BigNumber.from(variable.fromSlot).toHexString()));
    }
    return ethers_1.BigNumber.from(variable.fromSlot).toHexString();
};
exports.calcSlotKey = calcSlotKey;
const shiftStorageSlots = (storage, slots) => {
    storage.variables.forEach((v) => {
        v.fromSlot += slots;
        v.toSlot += slots;
    });
};
exports.shiftStorageSlots = shiftStorageSlots;
//# sourceMappingURL=converterClasses2Storage.js.map