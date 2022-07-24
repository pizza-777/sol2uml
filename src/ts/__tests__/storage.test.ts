import {
    Attribute,
    AttributeType,
    ClassStereotype,
    UmlClass,
} from '../umlClass'
import { calcStorageByteSize, isElementary } from '../converterClasses2Storage'

describe('storage parser', () => {
    describe('calc storage bytes size of', () => {
        const defaultClassProperties = {
            name: 'test',
            absolutePath: '/',
            relativePath: '.',
        }
        test.each`
            type         | expected
            ${'address'} | ${20}
            ${'bool'}    | ${1}
            ${'int'}     | ${32}
            ${'uint'}    | ${32}
            ${'int256'}  | ${32}
            ${'uint256'} | ${32}
            ${'uint8'}   | ${1}
            ${'int8'}    | ${1}
            ${'uint32'}  | ${4}
            ${'int32'}   | ${4}
            ${'bytes'}   | ${32}
            ${'bytes32'} | ${32}
            ${'bytes1'}  | ${1}
            ${'bytes31'} | ${31}
            ${'string'}  | ${32}
        `('elementary type $type', ({ type, expected }) => {
            const umlCLass = new UmlClass(defaultClassProperties)
            const attribute: Attribute = {
                attributeType: AttributeType.Elementary,
                type,
                name: 'varName',
            }
            expect(calcStorageByteSize(attribute, umlCLass, [])).toEqual(
                expected
            )
        })
        test.each`
            type                 | expected
            ${'uint8[33][2][2]'} | ${256}
            ${'address[]'}       | ${32}
            ${'address[1]'}      | ${32}
            ${'address[2]'}      | ${64}
            ${'address[4]'}      | ${128}
            ${'address[][2]'}    | ${32}
            ${'address[2][2]'}   | ${128}
            ${'address[32]'}     | ${1024}
            ${'bytes32[]'}       | ${32}
            ${'bytes1[1]'}       | ${32}
            ${'bytes1[2]'}       | ${32}
            ${'bytes1[32]'}      | ${32}
            ${'bytes16[2]'}      | ${32}
            ${'bytes17[2]'}      | ${64}
            ${'bytes30[2]'}      | ${64}
            ${'bytes30[6][2]'}   | ${384}
            ${'bytes30[2][6]'}   | ${384}
            ${'bytes128[4]'}     | ${512}
            ${'bytes32[1]'}      | ${32}
            ${'bytes32[2]'}      | ${64}
            ${'bool[2][3]'}      | ${96}
            ${'bool[3][2]'}      | ${64}
            ${'bool[2][]'}       | ${32}
            ${'bool[33][2]'}     | ${128}
            ${'bool[33][2][2]'}  | ${256}
            ${'bool[][64][64]'}  | ${32}
            ${'bool[64][][64]'}  | ${32}
            ${'bool[64][64][]'}  | ${32}
        `('array type $type', ({ type, expected }) => {
            const umlCLass = new UmlClass(defaultClassProperties)
            const attribute: Attribute = {
                attributeType: AttributeType.Array,
                type,
                name: 'arrayName',
            }
            expect(calcStorageByteSize(attribute, umlCLass, [])).toEqual(
                expected
            )
        })
        describe('structs', () => {
            const otherClasses: UmlClass[] = [
                new UmlClass({
                    ...defaultClassProperties,
                    stereotype: ClassStereotype.Struct,
                    name: 'ContractLevelStruct0',
                    attributes: [
                        {
                            name: 'param1',
                            type: 'uint256',
                            attributeType: AttributeType.Elementary,
                        },
                        {
                            name: 'param2',
                            type: 'bool',
                            attributeType: AttributeType.Elementary,
                        },
                    ],
                }),
                new UmlClass({
                    ...defaultClassProperties,
                    stereotype: ClassStereotype.Struct,
                    name: 'ContractLevelStruct1',
                    attributes: [
                        {
                            name: 'param1',
                            type: 'uint256',
                            attributeType: AttributeType.Elementary,
                        },
                        {
                            name: 'param2',
                            type: 'address',
                            attributeType: AttributeType.Elementary,
                        },
                        {
                            name: 'param3',
                            type: 'uint8',
                            attributeType: AttributeType.Elementary,
                        },
                        {
                            name: 'param4',
                            type: 'bytes1',
                            attributeType: AttributeType.Elementary,
                        },
                    ],
                }),
                new UmlClass({
                    ...defaultClassProperties,
                    stereotype: ClassStereotype.Struct,
                    name: 'ContractLevelStruct2',
                    attributes: [
                        {
                            name: 'param1',
                            type: 'ContractLevelStruct0',
                            attributeType: AttributeType.UserDefined,
                        },
                        {
                            name: 'param2',
                            type: 'ContractLevelStruct1[2]',
                            attributeType: AttributeType.Array,
                        },
                    ],
                }),
                new UmlClass({
                    ...defaultClassProperties,
                    stereotype: ClassStereotype.Enum,
                    name: 'enum0',
                    attributes: [
                        {
                            name: 'start',
                            attributeType: AttributeType.UserDefined,
                        },
                        {
                            name: 'stop',
                            attributeType: AttributeType.UserDefined,
                        },
                    ],
                }),
                new UmlClass({
                    ...defaultClassProperties,
                    stereotype: ClassStereotype.Enum,
                    name: 'enum1',
                    attributes: [
                        {
                            name: 'red',
                            attributeType: AttributeType.UserDefined,
                        },
                        {
                            name: 'orange',
                            attributeType: AttributeType.UserDefined,
                        },
                        {
                            name: 'green',
                            attributeType: AttributeType.UserDefined,
                        },
                    ],
                }),
                new UmlClass({
                    ...defaultClassProperties,
                    stereotype: ClassStereotype.Interface,
                    name: 'IERC20',
                }),
            ]
            test.each`
                types                                                     | expected
                ${['address', 'address', 'address']}                      | ${96}
                ${['address', 'bytes12', 'bytes12', 'address']}           | ${64}
                ${['IERC20']}                                             | ${32}
                ${['IERC20', 'IERC20', 'IERC20']}                         | ${96}
                ${['IERC20[3]']}                                          | ${96}
                ${['IERC20', 'bytes12', 'bytes12', 'IERC20']}             | ${64}
                ${['bytes31', 'bytes2', 'bytes31']}                       | ${96}
                ${['uint256', 'bytes32']}                                 | ${64}
                ${['bool', 'uint8']}                                      | ${32}
                ${['bool[12]', 'uint8[12]']}                              | ${64}
                ${['bytes30', 'bytes30', 'bytes30']}                      | ${96}
                ${['uint256[]', 'bytes32[2]']}                            | ${96}
                ${['uint256[2]', 'bytes32[2]']}                           | ${128}
                ${['bool', 'bool[2]', 'bool']}                            | ${96}
                ${['bool', 'bool[33]', 'bool']}                           | ${128}
                ${['uint16', 'bytes30[2]', 'uint16']}                     | ${128}
                ${['ContractLevelStruct0']}                               | ${64}
                ${['ContractLevelStruct1']}                               | ${64}
                ${['ContractLevelStruct2']}                               | ${192}
                ${['ContractLevelStruct2[2]', 'address']}                 | ${416}
                ${['ContractLevelStruct0', 'ContractLevelStruct1']}       | ${128}
                ${['ContractLevelStruct0[]', 'address']}                  | ${64}
                ${['ContractLevelStruct1[2]', 'address']}                 | ${160}
                ${['ContractLevelStruct1[2]', 'ContractLevelStruct0[3]']} | ${320}
                ${['ContractLevelStruct2[]', 'address']}                  | ${64}
                ${['address', 'ContractLevelStruct2[]']}                  | ${64}
                ${['bool', 'ContractLevelStruct0', 'bool']}               | ${128}
                ${['enum0']}                                              | ${32}
                ${['enum0', 'enum1']}                                     | ${32}
                ${['enum0', 'enum1', 'bytes30']}                          | ${32}
                ${['enum0', 'enum1', 'bytes31']}                          | ${64}
                ${['enum0', 'enum1', 'bytes30[2]']}                       | ${96}
                ${['bool', 'enum0', 'bool']}                              | ${32}
            `('struct with types $types', ({ types, expected }) => {
                const testAttributes: Attribute[] = []
                types.forEach((type: string, i: number) => {
                    const attributeType =
                        type.slice(-1) === ']'
                            ? AttributeType.Array
                            : isElementary(type)
                            ? AttributeType.Elementary
                            : AttributeType.UserDefined
                    testAttributes.push({
                        name: `test ${i}`,
                        type,
                        attributeType,
                    })
                })
                const testStruct = new UmlClass({
                    ...defaultClassProperties,
                    name: 'ContractLevelStruct',
                    stereotype: ClassStereotype.Struct,
                    attributes: testAttributes,
                })
                const umlCLass = new UmlClass({
                    ...defaultClassProperties,
                })
                const attribute: Attribute = {
                    attributeType: AttributeType.UserDefined,
                    type: 'ContractLevelStruct',
                    name: 'structName',
                }
                expect(
                    calcStorageByteSize(attribute, umlCLass, [
                        ...otherClasses,
                        testStruct,
                    ])
                ).toEqual(expected)
            })
        })
    })
})
