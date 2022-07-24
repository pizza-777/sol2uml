import { Dijkstra, Edge, WeightedDiGraph } from 'js-graph-algorithms'
import { UmlClass } from './umlClass'
import { findAssociatedClass } from './associations'

export const classesConnectedToBaseContracts = (
    umlClasses: UmlClass[],
    baseContractNames: string[],
    depth?: number
): UmlClass[] => {
    let filteredUmlClasses: { [contractName: string]: UmlClass } = {}

    const graph = loadGraph(umlClasses)

    for (const baseContractName of baseContractNames) {
        filteredUmlClasses = {
            ...filteredUmlClasses,
            ...classesConnectedToBaseContract(
                umlClasses,
                baseContractName,
                graph,
                depth
            ),
        }
    }

    return Object.values(filteredUmlClasses)
}

export const classesConnectedToBaseContract = (
    umlClasses: UmlClass[],
    baseContractName: string,
    graph: WeightedDiGraph,
    depth: number = 1000
): { [contractName: string]: UmlClass } => {
    // Find the base UML Class from the base contract name
    const baseUmlClass = umlClasses.find(({ name }) => {
        return name === baseContractName
    })

    if (!baseUmlClass) {
        throw Error(
            `Failed to find base contract with name "${baseContractName}"`
        )
    }

    const dfs = new Dijkstra(graph, baseUmlClass.id)

    // Get all the UML Classes that are connected to the base contract
    const filteredUmlClasses: { [contractName: string]: UmlClass } = {}
    for (const umlClass of umlClasses) {
        if (dfs.distanceTo(umlClass.id) <= depth) {
            filteredUmlClasses[umlClass.name] = umlClass
        }
    }

    return filteredUmlClasses
}

function loadGraph(umlClasses: UmlClass[]): WeightedDiGraph {
    const graph = new WeightedDiGraph(umlClasses.length) // 6 is the number vertices in the graph

    for (const sourceUmlClass of umlClasses) {
        for (const association of Object.values(sourceUmlClass.associations)) {
            // Find the first UML Class that matches the target class name
            const targetUmlClass = findAssociatedClass(
                association,
                sourceUmlClass,
                umlClasses
            )

            if (!targetUmlClass) {
                continue
            }

            graph.addEdge(new Edge(sourceUmlClass.id, targetUmlClass.id, 1))
        }
    }

    return graph
}
