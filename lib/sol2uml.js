#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const converterClasses2Dot_1 = require("./converterClasses2Dot");
const parserGeneral_1 = require("./parserGeneral");
const parserEtherscan_1 = require("./parserEtherscan");
const filterClasses_1 = require("./filterClasses");
const commander_1 = require("commander");
const converterClasses2Storage_1 = require("./converterClasses2Storage");
const converterStorage2Dot_1 = require("./converterStorage2Dot");
const regEx_1 = require("./utils/regEx");
const writerFiles_1 = require("./writerFiles");
const program = new commander_1.Command();
const debugControl = require('debug');
const debug = require('debug')('sol2uml');
program
    .usage(`[subcommand] <options>
The three subcommands:
* class:    Generates a UML class diagram from Solidity source code. default
* storage:  Generates a diagram of a contract's storage slots.
* flatten:  Pulls verified source files from a Blockchain explorer into one, flat, local Solidity file.

The Solidity code can be pulled from verified source code on Blockchain explorers like Etherscan or from local Solidity files.`)
    .addOption(new commander_1.Option('-sf, --subfolders <value>', 'number of subfolders that will be recursively searched for Solidity files.').default('-1', 'all'))
    .addOption(new commander_1.Option('-f, --outputFormat <value>', 'output file format.')
    .choices(['svg', 'png', 'dot', 'all'])
    .default('svg'))
    .option('-o, --outputFileName <value>', 'output file name')
    .option('-i, --ignoreFilesOrFolders <filesOrFolders>', 'comma separated list of files or folders to ignore')
    .addOption(new commander_1.Option('-n, --network <network>', 'Ethereum network')
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
    .default('mainnet'))
    .option('-k, --apiKey <key>', 'Etherscan, Polygonscan, BscScan or Arbiscan API key')
    .option('-v, --verbose', 'run with debugging statements', false);
program
    .command('class', { isDefault: true })
    .description('Generates a UML class diagram from Solidity source code.')
    .usage(`<fileFolderAddress> [options]

Generates UML diagrams from Solidity source code.

If no file, folder or address is passes as the first argument, the working folder is used.
When a folder is used, all *.sol files are found in that folder and all sub folders.
A comma separated list of files and folders can also used. For example
    sol2uml contracts,node_modules/openzeppelin-solidity

If an Ethereum address with a 0x prefix is passed, the verified source code from Etherscan will be used. For example
    sol2uml 0x79fEbF6B9F76853EDBcBc913e6aAE8232cFB9De9`)
    .argument('[fileFolderAddress]', 'file name, base folder or contract address', process.cwd())
    .option('-b, --baseContractNames <value>', 'only output contracts connected to these comma separated base contract names')
    .addOption(new commander_1.Option('-d, --depth <value>', 'depth of connected classes to the base contracts. 1 will only show directly connected contracts, interfaces, libraries, structs and enums.').default('100', 'all'))
    .option('-c, --clusterFolders', 'cluster contracts into source folders', false)
    .option('-hv, --hideVariables', 'hide variables from contracts, interfaces, structs and enums', false)
    .option('-hf, --hideFunctions', 'hide functions from contracts, interfaces and libraries', false)
    .option('-hp, --hidePrivates', 'hide private and internal attributes and operators', false)
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
        };
        const { umlClasses } = await (0, parserGeneral_1.parserUmlClasses)(fileFolderAddress, combinedOptions);
        let filteredUmlClasses = umlClasses;
        if (options.baseContractNames) {
            const baseContractNames = options.baseContractNames.split(',');
            filteredUmlClasses = (0, filterClasses_1.classesConnectedToBaseContracts)(umlClasses, baseContractNames, options.depth);
        }
        const dotString = (0, converterClasses2Dot_1.convertUmlClasses2Dot)(filteredUmlClasses, combinedOptions.clusterFolders, combinedOptions);
        await (0, writerFiles_1.writeOutputFiles)(dotString, fileFolderAddress, combinedOptions.outputFormat, combinedOptions.outputFileName);
        debug(`Finished generating UML`);
    }
    catch (err) {
        console.error(`Failed to generate UML diagram ${err}`);
    }
});
program
    .command('storage')
    .description('output a contracts storage slots')
    .argument('<fileFolderAddress>', 'file name, base folder or contract address')
    .option('-c, --contractName <value>', 'Contract name in local Solidity files. Not needed when using an address as the first argument.')
    // .option('-d, --data', 'gets the data in the storage slots')
    .action(async (fileFolderAddress, options, command) => {
    try {
        const combinedOptions = {
            ...command.parent._optionValues,
            ...options,
        };
        const { umlClasses, contractName } = await (0, parserGeneral_1.parserUmlClasses)(fileFolderAddress, combinedOptions);
        const filteredUmlClasses = (0, filterClasses_1.classesConnectedToBaseContracts)(umlClasses, [combinedOptions.contractName || contractName]);
        const storageObjects = (0, converterClasses2Storage_1.convertClasses2StorageObjects)(combinedOptions.contractName || contractName, filteredUmlClasses);
        if ((0, regEx_1.isAddress)(fileFolderAddress)) {
            // The first object is the contract
            storageObjects[0].address = fileFolderAddress;
        }
        debug(storageObjects);
        const dotString = (0, converterStorage2Dot_1.convertStorage2Dot)(storageObjects);
        await (0, writerFiles_1.writeOutputFiles)(dotString, fileFolderAddress, combinedOptions.outputFormat, combinedOptions.outputFileName);
    }
    catch (err) {
        console.error(`Failed to generate storage diagram ${err}`);
    }
});
program
    .command('flatten')
    .description('get all verified source code for a contract from the Blockchain explorer into one local file')
    .argument('<contractAddress>', 'Contract address')
    .action(async (contractAddress, options, command) => {
    debug(`About to flatten ${contractAddress}`);
    const combinedOptions = {
        ...command.parent._optionValues,
        ...options,
    };
    const etherscanParser = new parserEtherscan_1.EtherscanParser(combinedOptions.apiKey, combinedOptions.network);
    const { solidityCode, contractName } = await etherscanParser.getSolidityCode(contractAddress);
    // Write Solidity to the contract address
    const outputFilename = combinedOptions.outputFileName || contractName;
    await (0, writerFiles_1.writeSolidity)(solidityCode, outputFilename);
});
program.on('option:verbose', () => {
    debugControl.enable('sol2uml');
    debug('verbose on');
});
const main = async () => {
    await program.parseAsync(process.argv);
};
main();
//# sourceMappingURL=sol2uml.js.map