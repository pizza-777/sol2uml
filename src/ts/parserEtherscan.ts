import axios from 'axios'
import { ASTNode } from 'tvm-solidity-parser/dist/src/ast-types'
import { parse } from 'tvm-solidity-parser'

import { convertAST2UmlClasses } from './converterAST2Classes'
import { UmlClass } from './umlClass'
import { topologicalSortClasses } from './filterClasses'
import { parseSolidityVersion } from './utils/regEx'

require('axios-debug-log')
const debug = require('debug')('sol2uml')

export const networks = <const>[
    'mainnet',
    'ropsten',
    'kovan',
    'rinkeby',
    'goerli',
    'sepolia',
    'polygon',
    'testnet.polygon',
    'arbitrum',
    'testnet.arbitrum',
    'avalanche',
    'testnet.avalanche',
    'bsc',
    'testnet.bsc',
    'crono',
    'fantom',
    'testnet.fantom',
    'moonbeam',
    'optimistic',
    'kovan-optimistic',
    'gnosisscan',
]
export type Network = typeof networks[number]

export class EtherscanParser {
    readonly url: string

    constructor(
        protected apikey: string = 'ZAD4UI2RCXCQTP38EXS3UY2MPHFU5H9KB1',
        public network: Network = 'mainnet'
    ) {
        if (!networks.includes(network)) {
            throw new Error(
                `Invalid network "${network}". Must be one of ${networks}`
            )
        } else if (network === 'mainnet') {
            this.url = 'https://api.etherscan.io/api'
        } else if (network === 'polygon') {
            this.url = 'https://api.polygonscan.com/api'
            this.apikey = 'AMHGNTV5A7XYGX2M781JB3RC1DZFVRWQEB'
        } else if (network === 'testnet.polygon') {
            this.url = 'https://api-testnet.polygonscan.com/api'
            this.apikey = 'AMHGNTV5A7XYGX2M781JB3RC1DZFVRWQEB'
        } else if (network === 'arbitrum') {
            this.url = 'https://api.arbiscan.io/api'
            this.apikey = 'ZGTK2TAGWMAB6IAC12BMK8YYPNCPIM8VDQ'
        } else if (network === 'testnet.arbitrum') {
            this.url = 'https://api-testnet.arbiscan.io/api'
            this.apikey = 'ZGTK2TAGWMAB6IAC12BMK8YYPNCPIM8VDQ'
        } else if (network === 'avalanche') {
            this.url = 'https://api.snowtrace.io/api'
            this.apikey = 'U5FAN98S5XNH5VI83TI4H35R9I4TDCKEJY'
        } else if (network === 'testnet.avalanche') {
            this.url = 'https://api-testnet.snowtrace.io/api'
            this.apikey = 'U5FAN98S5XNH5VI83TI4H35R9I4TDCKEJY'
        } else if (network === 'bsc') {
            this.url = 'https://api.bscscan.com/api'
            this.apikey = 'APYH49FXVY9UA3KTDI6F4WP3KPIC86NITN'
        } else if (network === 'testnet.bsc') {
            this.url = 'https://api-testnet.bscscan.com/api'
            this.apikey = 'APYH49FXVY9UA3KTDI6F4WP3KPIC86NITN'
        } else if (network === 'crono') {
            this.url = 'https://api.cronoscan.com/api'
            this.apikey = '76A3RG5WHTPMMR66E9SFI2EIDT6MP976W2'
        } else if (network === 'fantom') {
            this.url = 'https://api.ftmscan.com/api'
            this.apikey = '71KRX13XPZMGR3D1Q85W78G2DSZ4JPMAEX'
        } else if (network === 'testnet.fantom') {
            this.url = 'https://api-testnet.ftmscan.com/api'
            this.apikey = '71KRX13XPZMGR3D1Q85W78G2DSZ4JPMAEX'
        } else if (network === 'optimistic' || network === 'kovan-optimistic') {
            this.url = `https://api-${network}.etherscan.io/api`
            this.apikey = 'FEXS1HXVA4Y2RNTMEA8V1UTK21S4JWHH9U'
        } else if (network === 'moonbeam') {
            this.url = 'https://api-moonbeam.moonscan.io/api'
            this.apikey = '5EUFXW6TDC16VERF3D9SCWRRU6AEMTBHNJ'
        } else if (network === 'gnosisscan') {
            this.url = 'https://api.gnosisscan.io/api'
            this.apikey = '2RWGXIWK538EJ8XSP9DE2JUINSCG7UCSJB'
        } else {
            this.url = `https://api-${network}.etherscan.io/api`
        }
    }

    /**
     * Parses the verified source code files from Etherscan
     * @param contractAddress Ethereum contract address with a 0x prefix
     * @return Promise with an array of UmlClass objects
     */
    async getUmlClasses(
        contractAddress: string
    ): Promise<{ umlClasses: UmlClass[]; contractName: string }> {
        const { files, contractName } = await this.getSourceCode(
            contractAddress
        )

        let umlClasses: UmlClass[] = []

        for (const file of files) {
            debug(`Parsing source file ${file.filename}`)
            const node = await this.parseSourceCode(file.code)
            const umlClass = convertAST2UmlClasses(node, file.filename)
            umlClasses = umlClasses.concat(umlClass)
        }

        return {
            umlClasses,
            contractName,
        }
    }

    /**
     * Get Solidity code from Etherscan for a contract and merges all files
     * into one long string of Solidity code.
     * @param contractAddress Ethereum contract address with a 0x prefix
     * @return Promise string of Solidity code
     */
    async getSolidityCode(
        contractAddress: string
    ): Promise<{ solidityCode: string; contractName: string }> {
        const { files, contractName, compilerVersion } =
            await this.getSourceCode(contractAddress)

        // Parse the UmlClasses from the Solidity code in each file
        let umlClasses: UmlClass[] = []
        for (const file of files) {
            const node = await this.parseSourceCode(file.code)
            const umlClass = convertAST2UmlClasses(node, file.filename)
            umlClasses = umlClasses.concat(umlClass)
        }

        // Sort the classes so dependent code is first
        const topologicalSortedClasses = topologicalSortClasses(umlClasses)
        // Get a list of filenames the classes are in
        const sortedFilenames = topologicalSortedClasses.map(
            (umlClass) => umlClass.relativePath
        )
        // Remove duplicate filenames from the list
        const dependentFilenames = [...new Set(sortedFilenames)]

        // find any files that didn't have dependencies found
        const nonDependentFiles = files.filter(
            (f) => !dependentFilenames.includes(f.filename)
        )
        const nonDependentFilenames = nonDependentFiles.map((f) => f.filename)
        if (nonDependentFilenames.length) {
            debug(
                `Failed to find dependencies to files: ${nonDependentFilenames}`
            )
        }

        const solidityVersion = parseSolidityVersion(compilerVersion)
        let solidityCode = `pragma solidity =${solidityVersion};\n`

        // output non dependent code before the dependent files just in case sol2uml missed some dependencies
        const filenames = [...nonDependentFilenames, ...dependentFilenames]

        // For each filename
        filenames.forEach((filename) => {
            // Lookup the file that contains the Solidity code
            const file = files.find((f) => f.filename === filename)
            if (!file)
                throw Error(`Failed to find file with filename "${filename}"`)

            // comment out any pragma solidity lines as its set from the compiler version
            const removedPragmaSolidity = file.code.replace(
                /(\s)(pragma\s+solidity.*;)/gm,
                '$1/* $2 */'
            )

            // comment out any import statements
            // match whitespace before import
            // and characters after import up to ;
            // replace all in file and match across multiple lines
            const removedImports = removedPragmaSolidity.replace(
                /(\s)(import.*;)/gm,
                '$1/* $2 */'
            )
            // Rename SPDX-License-Identifier to SPDX--License-Identifier so the merged file will compile
            const removedSPDX = removedImports.replace(/SPDX-/, 'SPDX--')
            solidityCode += removedSPDX
        })
        return {
            solidityCode,
            contractName,
        }
    }

    /**
     * Parses Solidity source code into an ASTNode object
     * @param sourceCode Solidity source code
     * @return Promise with an ASTNode object from @solidity-parser/parser
     */
    async parseSourceCode(sourceCode: string): Promise<ASTNode> {
        try {
            const node = parse(sourceCode, {})

            return node
        } catch (err) {
            throw new Error(
                `Failed to parse solidity code from source code:\n${sourceCode}`,
                { cause: err }
            )
        }
    }

    /**
     * Calls Etherscan to get the verified source code for the specified contract address
     * @param contractAddress Ethereum contract address with a 0x prefix
     */
    async getSourceCode(contractAddress: string): Promise<{
        files: { code: string; filename: string }[]
        contractName: string
        compilerVersion: string
    }> {
        const description = `get verified source code for address ${contractAddress} from Etherscan API.`

        try {
            debug(
                `About to get Solidity source code for ${contractAddress} from ${this.url}`
            )
            const response: any = await axios.get(this.url, {
                params: {
                    module: 'contract',
                    action: 'getsourcecode',
                    address: contractAddress,
                    apikey: this.apikey,
                },
            })

            if (!Array.isArray(response?.data?.result)) {
                throw new Error(
                    `Failed to ${description}. No result array in HTTP data: ${JSON.stringify(
                        response?.data
                    )}`
                )
            }

            const results = response.data.result.map((result: any) => {
                if (!result.SourceCode) {
                    throw new Error(
                        `Failed to ${description}. Most likely the contract has not been verified on Etherscan.`
                    )
                }
                // if multiple Solidity source files
                if (result.SourceCode[0] === '{') {
                    try {
                        let parableResultString = result.SourceCode
                        // This looks like an Etherscan bug but we'll handle it here
                        if (result.SourceCode[1] === '{') {
                            // remove first { and last } from the SourceCode string so it can be JSON parsed
                            parableResultString = result.SourceCode.slice(1, -1)
                        }
                        const sourceCodeObject = JSON.parse(parableResultString)
                        // The getsource response from Etherscan is inconsistent so we need to handle both shapes
                        const sourceFiles = sourceCodeObject.sources
                            ? Object.entries(sourceCodeObject.sources)
                            : Object.entries(sourceCodeObject)
                        return sourceFiles.map(
                            ([filename, code]: [
                                string,
                                { content: string }
                            ]) => ({
                                code: code.content,
                                filename,
                            })
                        )
                    } catch (err) {
                        throw new Error(
                            `Failed to parse Solidity source code from Etherscan's SourceCode. ${result.SourceCode}`,
                            { cause: err }
                        )
                    }
                }
                // if multiple Solidity source files with no Etherscan bug in the SourceCode field
                if (result?.SourceCode?.sources) {
                    const sourceFiles = Object.values(result.SourceCode.sources)
                    return sourceFiles.map(
                        ([filename, code]: [string, { content: string }]) => ({
                            code: code.content,
                            filename,
                        })
                    )
                }
                // Solidity source code was not uploaded into multiple files so is just in the SourceCode field
                return {
                    code: result.SourceCode,
                    filename: contractAddress,
                }
            })
            return {
                files: results.flat(1),
                contractName: response.data.result[0].ContractName,
                compilerVersion: response.data.result[0].CompilerVersion,
            }
        } catch (err) {
            if (err.message) {
                throw err
            }
            if (!err.response) {
                throw new Error(`Failed to ${description}. No HTTP response.`)
            }
            throw new Error(
                `Failed to ${description}. HTTP status code ${err.response?.status}, status text: ${err.response?.statusText}`,
                { cause: err }
            )
        }
    }
}
