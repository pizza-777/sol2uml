import { BigNumberish } from '@ethersproject/bignumber';
export declare const getStorageValue: (url: string, contractAddress: string, slot: BigNumberish, blockTag?: BigNumberish | 'latest') => Promise<string>;
export declare const getStorageValues: (url: string, contractAddress: string, slots: BigNumberish[], blockTag?: BigNumberish | 'latest') => Promise<string[]>;
