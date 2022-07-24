#! /usr/bin/env node

import { convertUmlClasses2Dot } from './converterClasses2Dot'
import { parserUmlClasses } from './parserGeneral'
import { EtherscanParser } from './parserEtherscan'
import { classesConnectedToBaseContracts } from './filterClasses'
import { Command, Option } from 'commander'
import { convertClasses2StorageObjects } from './converterClasses2Storage'
import { convertStorage2Dot } from './converterStorage2Dot'
import { isAddress } from './utils/regEx'
import { writeOutputFiles, writeSolidity } from './writerFiles'
const program = new Command()

const debugControl = require('debug')
const debug = require('debug')('sol2uml')

program
    .usage(
        `[subcommand] <options>
The three subcommands:
* class:    Generates a UML class diagram from Solidity source code. default
* storage:  Generates a diagram of a contract's storage slots.
* flatten:  Pulls verified source files from a Blockchain explorer into one, flat, local Solidity file.

The Solidity code can be pulled from verified source code on Blockchain explorers like Etherscan or from local Solidity files.`
    )
    .addOption(
        new Option(
            '-sf, --subfolders <value>',
            'number of subfolders that will be recursively searched for Solidity files.'
        ).default('-1', 'all')
    )
    .addOption(
        new Option('-f, --outputFormat <value>', 'output file format.')
            .choices(['svg', 'png', 'dot', 'all'])
            .default('svg')
    )
    .option('-o, --outputFileName <value>', 'output file name')
    .option(
        '-i, --ignoreFilesOrFolders <filesOrFolders>',
        'comma separated list of files or folders to ignore'
    )
    .addOption(
        new Option('-n, --network <network>', 'Ethereum network')
            .choices([
                'mainnet',
                'polygon',
                'bsc',
                'arbitrum',
                'ropsten',
                'kovan',
                'rinkeby',
                'goerli',
            ])
            .default('mainnet')
    )
    .option(
        '-k, --apiKey <key>',
        'Etherscan, Polygonscan, BscScan or Arbiscan API key'
    )
    .option('-v, --verbose', 'run with debugging statements', false)

program
    .command('class', { isDefault: true })
    .description('Generates a UML class diagram from Solidity source code.')
    .usage(
        `<fileFolderAddress> [options]

Generates UML diagrams from Solidity source code.

If no file, folder or address is passes as the first argument, the working folder is used.
When a folder is used, all *.sol files are found in that folder and all sub folders.
A comma separated list of files and folders can also used. For example
    sol2uml contracts,node_modules/openzeppelin-solidity

If an Ethereum address with a 0x prefix is passed, the verified source code from Etherscan will be used. For example
    sol2uml 0x79fEbF6B9F76853EDBcBc913e6aAE8232cFB9De9`
    )
    .argument(
        '[fileFolderAddress]',
        'file name, base folder or contract address',
        process.cwd()
    )
    .option(
        '-b, --baseContractNames <value>',
        'only output contracts connected to these comma separated base contract names'
    )
    .addOption(
        new Option(
            '-d, --depth <value>',
            'depth of connected classes to the base contracts. 1 will only show directly connected contracts, interfaces, libraries, structs and enums.'
        ).default('100', 'all')
    )
    .option(
        '-c, --clusterFolders',
        'cluster contracts into source folders',
        false
    )
    .option(
        '-hv, --hideVariables',
        'hide variables from contracts, interfaces, structs and enums',
        false
    )
    .option(
        '-hf, --hideFunctions',
        'hide functions from contracts, interfaces and libraries',
        false
    )
    .option(
        '-hp, --hidePrivates',
        'hide private and internal attributes and operators',
        false
    )
    .option('-he, --hideEnums', 'hide enum types', false)
    .option('-hs, --hideStructs', 'hide data structures', false)
    .option('-hl, --hideLibraries', 'hide libraries', false)
    .option('-hi, --hideInterfaces', 'hide interfaces', false)
    .option('-ha, --hideAbstracts', 'hide abstract contracts', false)
    .option('-hn, --hideFilename', 'hide relative path and file name', false)
    .action(async (fileFolderAddress, options, command) => {
        try {
            const combinedOptions = {
                ...command.parent._optionValues,
                ...options,
            }

            const { umlClasses } = await parserUmlClasses(
                fileFolderAddress,
                combinedOptions
            )

            let filteredUmlClasses = umlClasses
            if (options.baseContractNames) {
                const baseContractNames = options.baseContractNames.split(',')
                filteredUmlClasses = classesConnectedToBaseContracts(
                    umlClasses,
                    baseContractNames,
                    options.depth
                )
            }

            const dotString = convertUmlClasses2Dot(
                filteredUmlClasses,
                combinedOptions.clusterFolders,
                combinedOptions
            )

            await writeOutputFiles(
                dotString,
                fileFolderAddress,
                combinedOptions.outputFormat,
                combinedOptions.outputFileName
            )

            debug(`Finished generating UML`)
        } catch (err) {
            console.error(`Failed to generate UML diagram ${err}`)
        }
    })

program
    .command('storage')
    .description(
        "Visually display a contract's storage slots.\n\nWARNING: sol2uml does not use the Solidity compiler so may differ with solc. A known example is storage arrays declared with a constant, immutable or expression will show as only taking one slot but it could be more. Storage arrays declared with an integer work."
    )
    .argument(
        '<fileFolderAddress>',
        'file name, base folder or contract address'
    )
    .option(
        '-c, --contractName <value>',
        'Contract name in local Solidity files. Not needed when using an address as the first argument.'
    )
    // .option('-d, --data', 'gets the data in the storage slots')
    .action(async (fileFolderAddress, options, command) => {
        try {
            const combinedOptions = {
                ...command.parent._optionValues,
                ...options,
            }

            const { umlClasses, contractName } = await parserUmlClasses(
                fileFolderAddress,
                combinedOptions
            )

            const filteredUmlClasses = classesConnectedToBaseContracts(
                umlClasses,
                [combinedOptions.contractName || contractName]
            )

            const storageObjects = convertClasses2StorageObjects(
                combinedOptions.contractName || contractName,
                filteredUmlClasses
            )
            if (isAddress(fileFolderAddress)) {
                // The first object is the contract
                storageObjects[0].address = fileFolderAddress
            }
            debug(storageObjects)

            const dotString = convertStorage2Dot(storageObjects)

            await writeOutputFiles(
                dotString,
                fileFolderAddress,
                combinedOptions.outputFormat,
                combinedOptions.outputFileName
            )
        } catch (err) {
            console.error(`Failed to generate storage diagram ${err}`)
        }
    })

program
    .command('flatten')
    .description(
        'get all verified source code for a contract from the Blockchain explorer into one local file'
    )
    .argument('<contractAddress>', 'Contract address')
    .action(async (contractAddress, options, command) => {
        debug(`About to flatten ${contractAddress}`)

        const combinedOptions = {
            ...command.parent._optionValues,
            ...options,
        }

        const etherscanParser = new EtherscanParser(
            combinedOptions.apiKey,
            combinedOptions.network
        )

        const { solidityCode, contractName } =
            await etherscanParser.getSolidityCode(contractAddress)

        // Write Solidity to the contract address
        const outputFilename = combinedOptions.outputFileName || contractName
        await writeSolidity(solidityCode, outputFilename)
    })

program.on('option:verbose', () => {
    debugControl.enable('sol2uml')
    debug('verbose on')
})

const main = async () => {
    await program.parseAsync(process.argv)
}
main()
