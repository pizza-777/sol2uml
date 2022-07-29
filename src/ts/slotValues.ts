import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import axios from 'axios'

const debug = require('debug')('sol2uml')

interface StorageAtResponse {
    jsonrpc: '2.0'
    id: string
    result: string
}

export const getStorageValue = async (
    url: string,
    contractAddress: string,
    slot: BigNumberish,
    blockTag: BigNumberish | 'latest' = 'latest'
) => {
    debug(`About to get storage slot ${slot} value for ${contractAddress}`)

    const values = await getStorageValues(
        url,
        contractAddress,
        [slot],
        blockTag
    )

    debug(`Got slot ${slot} value: ${values[0]}`)
    return values[0]
}

let jsonRpcId = 0
export const getStorageValues = async (
    url: string,
    contractAddress: string,
    slots: BigNumberish[],
    blockTag: BigNumberish | 'latest' = 'latest'
): Promise<string[]> => {
    try {
        debug(
            `About to get ${slots.length} storage values for ${contractAddress} at block ${blockTag}`
        )
        const block =
            blockTag === 'latest'
                ? blockTag
                : BigNumber.from(blockTag).toHexString()
        const payload = slots.map((slot) => ({
            id: (jsonRpcId++).toString(),
            jsonrpc: '2.0',
            method: 'eth_getStorageAt',
            params: [contractAddress, slot.toString(), block.toString()],
        }))
        const response = await axios.post(url, payload)
        console.log(response.data)
        if (response.data?.error?.message) {
            throw new Error(response.data.error.message)
        }
        if (response.data.length !== slots.length) {
            throw new Error(
                `Requested ${slots.length} storage slot values but only got ${response.data.length}`
            )
        }
        const responseData = response.data as StorageAtResponse[]
        const sortedResponses = responseData.sort((a, b) =>
            BigNumber.from(a.id).gt(b.id) ? 1 : -1
        )
        return sortedResponses.map((data) => data.result)
    } catch (err) {
        throw new Error(
            `Failed to get ${slots.length} storage values for ${contractAddress} from ${url}`,
            { cause: err }
        )
    }
}
