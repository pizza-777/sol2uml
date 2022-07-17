import { WeightedDiGraph } from 'js-graph-algorithms';
import { UmlClass } from './umlClass';
export declare const classesConnectedToBaseContracts: (umlClasses: UmlClass[], baseContractNames: string[], depth?: number) => UmlClass[];
export declare const classesConnectedToBaseContract: (umlClasses: UmlClass[], baseContractName: string, graph: WeightedDiGraph, depth?: number) => {
    [contractName: string]: UmlClass;
};
