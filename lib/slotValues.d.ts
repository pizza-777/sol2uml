import { BigNumberish } from '@ethersproject/bignumber';
/**
 * Get storage slot values from JSON-RPC API provider.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
 * @param slots array of slot numbers to retrieve values for.
 * @param blockTag block number or `latest`
 */
export declare const getStorageValues: (url: string, contractAddress: string, slots: BigNumberish[], blockTag?: BigNumberish | 'latest') => Promise<string[]>;
/**
 * Get storage slot values from JSON-RPC API provider.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
 * @param slot slot number to retrieve the value for.
 * @param blockTag block number or `latest`
 */
export declare const getStorageValue: (url: string, contractAddress: string, slot: BigNumberish, blockTag?: BigNumberish | 'latest') => Promise<string>;
