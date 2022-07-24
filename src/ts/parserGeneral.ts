import { EtherscanParser } from './parserEtherscan'
import { parseUmlClassesFromFiles } from './parserFiles'
import { UmlClass } from './umlClass'
import { isAddress } from './utils/regEx'

const debug = require('debug')('sol2uml')

export const parserUmlClasses = async (
    fileFolderAddress: string,
    options: any
): Promise<{ umlClasses: UmlClass[]; contractName?: string }> => {
    let result: { umlClasses: UmlClass[]; contractName?: string } = {
        umlClasses: [],
    }
    if (isAddress(fileFolderAddress)) {
        debug(
            `argument ${fileFolderAddress} is an Ethereum address so checking Etherscan for the verified source code`
        )

        const etherscanApiKey =
            options.etherscanApiKey || 'ZAD4UI2RCXCQTP38EXS3UY2MPHFU5H9KB1'
        const etherscanParser = new EtherscanParser(
            etherscanApiKey,
            options.network
        )

        result = await etherscanParser.getUmlClasses(fileFolderAddress)
    } else {
        const subfolders = parseInt(options.subfolders)
        if (isNaN(subfolders)) {
            console.error(
                `subfolders option must be an integer. Not ${options.subfolders}`
            )
            process.exit(1)
        }

        const filesFolders: string[] = fileFolderAddress.split(',')
        let ignoreFilesFolders = options.ignoreFilesOrFolders
            ? options.ignoreFilesOrFolders.split(',')
            : []
        result.umlClasses = await parseUmlClassesFromFiles(
            filesFolders,
            ignoreFilesFolders,
            subfolders
        )
    }
    return result
}
