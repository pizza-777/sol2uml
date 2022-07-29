import { Attribute, AttributeType, ClassStereotype, UmlClass } from './umlClass'
import { findAssociatedClass } from './associations'
import { getStorageValues } from './slotValues'

export enum StorageType {
    Contract,
    Struct,
}

export interface Variable {
    id: number
    fromSlot: number
    toSlot: number
    byteSize: number
    byteOffset: number
    type: string
    variable: string
    contractName?: string
    values: string[]
    structStorageId?: number
    enumId?: number
}

export interface Storage {
    id: number
    name: string
    address?: string
    type: StorageType
    variables: Variable[]
}

let storageId = 1
let variableId = 1

/**
 *
 * @param url
 * @param contractAddress Contract address to get the storage slot values from
 * @param storage is mutated with the storage values
 */
export const addStorageValues = async (
    url: string,
    contractAddress: string,
    storage: Storage,
    blockTag: string
) => {
    const slots = storage.variables.map((s) => s.fromSlot)

    const values = await getStorageValues(url, contractAddress, slots, blockTag)
    storage.variables.forEach((storage, i) => {
        storage.values = [values[i]]
    })
}

export const convertClasses2Storages = (
    contractName: string,
    umlClasses: UmlClass[]
): Storage[] => {
    // Find the base UML Class from the base contract name
    const umlClass = umlClasses.find(({ name }) => {
        return name === contractName
    })
    if (!umlClass) {
        throw Error(`Failed to find contract with name "${contractName}"`)
    }

    const storages: Storage[] = []
    const variables = parseVariables(umlClass, umlClasses, [], storages, [])

    storages.unshift({
        id: storageId++,
        name: contractName,
        type: StorageType.Contract,
        variables: variables,
    })

    return storages
}

/**
 * Recursively parses the storage variables for a given contract.
 * @param umlClass contract or file level struct
 * @param umlClasses other contracts, structs and enums that may be a type of a storage variable.
 * @param variables mutable array of storage slots that is appended to
 * @param storages mutable array of storages that is appended with structs
 */
const parseVariables = (
    umlClass: UmlClass,
    umlClasses: UmlClass[],
    variables: Variable[],
    storages: Storage[],
    inheritedContracts: string[]
): Variable[] => {
    // Add storage slots from inherited contracts first.
    // Get immediate parent contracts that the class inherits from
    const parentContracts = umlClass.getParentContracts()
    // Filter out any already inherited contracts
    const newInheritedContracts = parentContracts.filter(
        (parentContract) =>
            !inheritedContracts.includes(parentContract.targetUmlClassName)
    )
    // Mutate inheritedContracts to include the new inherited contracts
    inheritedContracts.push(
        ...newInheritedContracts.map((c) => c.targetUmlClassName)
    )
    // Recursively parse each new inherited contract
    newInheritedContracts.forEach((parent) => {
        const parentClass = findAssociatedClass(parent, umlClass, umlClasses)
        if (!parentClass)
            throw Error(
                `Failed to find parent contract ${parent.targetUmlClassName} of ${umlClass.absolutePath}`
            )
        // recursively parse inherited contract
        parseVariables(
            parentClass,
            umlClasses,
            variables,
            storages,
            inheritedContracts
        )
    })

    // Parse storage for each attribute
    umlClass.attributes.forEach((attribute) => {
        // Ignore any attributes that are constants or immutable
        if (attribute.compiled) return

        const byteSize = calcStorageByteSize(attribute, umlClass, umlClasses)

        // find any dependent structs
        const linkedStruct = parseStructStorage(attribute, umlClasses, storages)
        const structStorageId = linkedStruct?.id

        // Get the toSlot of the last storage item
        let lastToSlot = 0
        let nextOffset = 0
        if (variables.length > 0) {
            const lastStorage = variables[variables.length - 1]
            lastToSlot = lastStorage.toSlot
            nextOffset = lastStorage.byteOffset + lastStorage.byteSize
        }
        if (nextOffset + byteSize > 32) {
            const nextFromSlot = variables.length > 0 ? lastToSlot + 1 : 0
            variables.push({
                id: variableId++,
                fromSlot: nextFromSlot,
                toSlot: nextFromSlot + Math.floor((byteSize - 1) / 32),
                byteSize,
                byteOffset: 0,
                type: attribute.type,
                variable: attribute.name,
                contractName: umlClass.name,
                structStorageId,
                values: [],
            })
        } else {
            variables.push({
                id: variableId++,
                fromSlot: lastToSlot,
                toSlot: lastToSlot,
                byteSize,
                byteOffset: nextOffset,
                type: attribute.type,
                variable: attribute.name,
                contractName: umlClass.name,
                structStorageId,
                values: [],
            })
        }
    })

    return variables
}

export const parseStructStorage = (
    attribute: Attribute,
    otherClasses: UmlClass[],
    storages: Storage[]
): Storage | undefined => {
    if (attribute.attributeType === AttributeType.UserDefined) {
        // Have we already created the storage?
        const existingStorage = storages.find(
            (dep) => dep.name === attribute.type
        )
        if (existingStorage) {
            return existingStorage
        }
        // Is the user defined type linked to another Contract, Struct or Enum?
        const dependentClass = otherClasses.find(({ name }) => {
            return (
                name === attribute.type || name === attribute.type.split('.')[1]
            )
        })
        if (!dependentClass) {
            throw Error(`Failed to find user defined type "${attribute.type}"`)
        }

        if (dependentClass.stereotype === ClassStereotype.Struct) {
            const variables = parseVariables(
                dependentClass,
                otherClasses,
                [],
                storages,
                []
            )
            const newStorage = {
                id: storageId++,
                name: attribute.type,
                type: StorageType.Struct,
                variables,
            }
            storages.push(newStorage)

            return newStorage
        }
        return undefined
    }
    if (
        attribute.attributeType === AttributeType.Mapping ||
        attribute.attributeType === AttributeType.Array
    ) {
        // get the UserDefined type from the mapping or array
        // note the mapping could be an array of Structs
        // Could also be a mapping of a mapping
        const result =
            attribute.attributeType === AttributeType.Mapping
                ? attribute.type.match(/=\\>((?!mapping)\w*)[\\[]/)
                : attribute.type.match(/(\w+)\[/)
        if (result !== null && result[1] && !isElementary(result[1])) {
            // Have we already created the storage?
            const existingStorage = storages.find(
                ({ name }) =>
                    name === result[1] || name === result[1].split('.')[1]
            )
            if (existingStorage) {
                return existingStorage
            }

            // Find UserDefined type
            const typeClass = otherClasses.find(
                ({ name }) =>
                    name === result[1] || name === result[1].split('.')[1]
            )
            if (!typeClass) {
                throw Error(
                    `Failed to find user defined type "${result[1]}" in attribute type "${attribute.type}"`
                )
            }
            if (typeClass.stereotype === ClassStereotype.Struct) {
                const variables = parseVariables(
                    typeClass,
                    otherClasses,
                    [],
                    storages,
                    []
                )
                const newStorage = {
                    id: storageId++,
                    name: typeClass.name,
                    type: StorageType.Struct,
                    variables,
                }
                storages.push(newStorage)

                return newStorage
            }
        }
        return undefined
    }
    return undefined
}

// Calculates the storage size of an attribute in bytes
export const calcStorageByteSize = (
    attribute: Attribute,
    umlClass: UmlClass,
    otherClasses: UmlClass[]
): number => {
    if (
        attribute.attributeType === AttributeType.Mapping ||
        attribute.attributeType === AttributeType.Function
    ) {
        return 32
    }
    if (attribute.attributeType === AttributeType.Array) {
        // All array dimensions must be fixed. eg [2][3][8].
        const result = attribute.type.match(/(\w+)(\[([\w][\w]*)\])+$/)

        // The above will not match any dynamic array dimensions, eg [],
        // as there needs to be one or more [0-9]+ in the square brackets
        if (result === null) {
            // Any dynamic array dimension means the whole array is dynamic
            // so only takes 32 bytes (1 slot)
            return 32
        }

        // All array dimensions are fixes so we now need to multiply all the dimensions
        // to get a total number of array elements
        const arrayDimensions = attribute.type.match(/\[\w+/g)
        const dimensionsStr = arrayDimensions.map((d) => d.slice(1))
        const dimensions: number[] = dimensionsStr.map((dimension) => {
            const dimensionNum = parseInt(dimension)
            if (!isNaN(dimensionNum)) return dimensionNum

            // Try and size array dimension from declared constants
            const constant = umlClass.constants.find(
                (constant) => constant.name === dimension
            )
            if (constant) {
                return constant.value
            }
            throw Error(
                `Could not size fixed sized array with dimension "${dimension}"`
            )
        })

        let elementSize: number
        // If a fixed sized array
        if (isElementary(result[1])) {
            const elementAttribute: Attribute = {
                attributeType: AttributeType.Elementary,
                type: result[1],
                name: 'element',
            }
            elementSize = calcStorageByteSize(
                elementAttribute,
                umlClass,
                otherClasses
            )
        } else {
            const elementAttribute: Attribute = {
                attributeType: AttributeType.UserDefined,
                type: result[1],
                name: 'userDefined',
            }
            elementSize = calcStorageByteSize(
                elementAttribute,
                umlClass,
                otherClasses
            )
        }
        // Anything over 16 bytes, like an address, will take a whole 32 byte slot
        if (elementSize > 16 && elementSize < 32) {
            elementSize = 32
        }
        const firstDimensionBytes = elementSize * dimensions[0]
        const firstDimensionSlotBytes = Math.ceil(firstDimensionBytes / 32) * 32
        const remainingElements = dimensions
            .slice(1)
            .reduce((total, dimension) => total * dimension, 1)
        return firstDimensionSlotBytes * remainingElements
    }
    // If a Struct or Enum
    if (attribute.attributeType === AttributeType.UserDefined) {
        // Is the user defined type linked to another Contract, Struct or Enum?
        const attributeClass = otherClasses.find(({ name }) => {
            return (
                name === attribute.type || name === attribute.type.split('.')[1]
            )
        })
        if (!attributeClass) {
            throw Error(
                `Failed to find user defined struct or enum "${attribute.type}"`
            )
        }

        switch (attributeClass.stereotype) {
            case ClassStereotype.Enum:
                return 1
            case ClassStereotype.Contract:
            case ClassStereotype.Abstract:
            case ClassStereotype.Interface:
            case ClassStereotype.Library:
                return 20
            case ClassStereotype.Struct:
                let structByteSize = 0
                attributeClass.attributes.forEach((structAttribute) => {
                    // If next attribute is an array, then we need to start in a new slot
                    if (structAttribute.attributeType === AttributeType.Array) {
                        structByteSize = Math.ceil(structByteSize / 32) * 32
                    }
                    // If next attribute is an struct, then we need to start in a new slot
                    else if (
                        structAttribute.attributeType ===
                        AttributeType.UserDefined
                    ) {
                        // UserDefined types can be a struct or enum, so we need to check if it's a struct
                        const userDefinedClass = otherClasses.find(
                            ({ name }) => {
                                return (
                                    name === structAttribute.type ||
                                    name === structAttribute.type.split('.')[1]
                                )
                            }
                        )
                        if (!userDefinedClass) {
                            throw Error(
                                `Failed to find user defined type "${structAttribute.type}" in struct ${attributeClass.name}`
                            )
                        }
                        // If a struct
                        if (
                            userDefinedClass.stereotype ===
                            ClassStereotype.Struct
                        ) {
                            structByteSize = Math.ceil(structByteSize / 32) * 32
                        }
                    }
                    const attributeSize = calcStorageByteSize(
                        structAttribute,
                        umlClass,
                        otherClasses
                    )
                    // check if attribute will fit into the remaining slot
                    const endCurrentSlot = Math.ceil(structByteSize / 32) * 32
                    const spaceLeftInSlot = endCurrentSlot - structByteSize
                    if (attributeSize <= spaceLeftInSlot) {
                        structByteSize += attributeSize
                    } else {
                        structByteSize = endCurrentSlot + attributeSize
                    }
                })
                // structs take whole 32 byte slots so round up to the nearest 32 sized slots
                return Math.ceil(structByteSize / 32) * 32
            default:
                return 32
        }
    }

    if (attribute.attributeType === AttributeType.Elementary) {
        switch (attribute.type) {
            case 'bool':
                return 1
            case 'address':
                return 20
            case 'string':
            case 'bytes':
            case 'uint':
            case 'int':
            case 'ufixed':
            case 'fixed':
                return 32
            default:
                const result = attribute.type.match(
                    /[u]*(int|fixed|bytes)([0-9]+)/
                )
                if (result === null || !result[2]) {
                    throw Error(
                        `Failed size elementary type "${attribute.type}"`
                    )
                }
                // If bytes
                if (result[1] === 'bytes') {
                    return parseInt(result[2])
                }
                // TODO need to handle fixed types when they are supported

                // If an int
                const bitSize = parseInt(result[2])
                return bitSize / 8
        }
    }
    throw new Error(
        `Failed to calc bytes size of attribute with name "${attribute.name}" and type ${attribute.type}`
    )
}

export const isElementary = (type: string): boolean => {
    switch (type) {
        case 'bool':
        case 'address':
        case 'string':
        case 'bytes':
        case 'uint':
        case 'int':
        case 'ufixed':
        case 'fixed':
            return true
        default:
            const result = type.match(/[u]*(int|fixed|bytes)([0-9]+)/)
            return result !== null
    }
}
