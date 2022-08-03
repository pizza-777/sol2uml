"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.topologicalSortClasses = exports.classesConnectedToBaseContract = exports.classesConnectedToBaseContracts = void 0;
const js_graph_algorithms_1 = require("js-graph-algorithms");
const associations_1 = require("./associations");
const classesConnectedToBaseContracts = (umlClasses, baseContractNames, depth) => {
    let filteredUmlClasses = {};
    const weightedDirectedGraph = loadWeightedDirectedGraph(umlClasses);
    for (const baseContractName of baseContractNames) {
        filteredUmlClasses = {
            ...filteredUmlClasses,
            ...(0, exports.classesConnectedToBaseContract)(umlClasses, baseContractName, weightedDirectedGraph, depth),
        };
    }
    return Object.values(filteredUmlClasses);
};
exports.classesConnectedToBaseContracts = classesConnectedToBaseContracts;
const classesConnectedToBaseContract = (umlClasses, baseContractName, weightedDirectedGraph, depth = 1000) => {
    // Find the base UML Class from the base contract name
    const baseUmlClass = umlClasses.find(({ name }) => {
        return name === baseContractName;
    });
    if (!baseUmlClass) {
        throw Error(`Failed to find base contract with name "${baseContractName}"`);
    }
    const dfs = new js_graph_algorithms_1.Dijkstra(weightedDirectedGraph, baseUmlClass.id);
    // Get all the UML Classes that are connected to the base contract
    const filteredUmlClasses = {};
    for (const umlClass of umlClasses) {
        if (dfs.distanceTo(umlClass.id) <= depth) {
            filteredUmlClasses[umlClass.name] = umlClass;
        }
    }
    return filteredUmlClasses;
};
exports.classesConnectedToBaseContract = classesConnectedToBaseContract;
function loadWeightedDirectedGraph(umlClasses) {
    const weightedDirectedGraph = new js_graph_algorithms_1.WeightedDiGraph(umlClasses.length); // the number vertices in the graph
    for (const sourceUmlClass of umlClasses) {
        for (const association of Object.values(sourceUmlClass.associations)) {
            // Find the first UML Class that matches the target class name
            const targetUmlClass = (0, associations_1.findAssociatedClass)(association, sourceUmlClass, umlClasses);
            if (!targetUmlClass) {
                continue;
            }
            weightedDirectedGraph.addEdge(new js_graph_algorithms_1.Edge(sourceUmlClass.id, targetUmlClass.id, 1));
        }
    }
    return weightedDirectedGraph;
}
const topologicalSortClasses = (umlClasses) => {
    const directedAcyclicGraph = loadDirectedAcyclicGraph(umlClasses);
    const topologicalSort = new js_graph_algorithms_1.TopologicalSort(directedAcyclicGraph);
    // Topological sort the class ids
    const sortedUmlClassIds = topologicalSort.order().reverse();
    const sortedUmlClasses = sortedUmlClassIds.map((umlClassId) => 
    // Lookup the UmlClass for each class id
    umlClasses.find((umlClass) => umlClass.id === umlClassId));
    return sortedUmlClasses;
};
exports.topologicalSortClasses = topologicalSortClasses;
const loadDirectedAcyclicGraph = (umlClasses) => {
    const directedAcyclicGraph = new js_graph_algorithms_1.DiGraph(umlClasses.length); // the number vertices in the graph
    for (const sourceUmlClass of umlClasses) {
        for (const association of Object.values(sourceUmlClass.associations)) {
            // Find the first UML Class that matches the target class name
            const targetUmlClass = (0, associations_1.findAssociatedClass)(association, sourceUmlClass, umlClasses);
            if (!targetUmlClass) {
                continue;
            }
            directedAcyclicGraph.addEdge(sourceUmlClass.id, targetUmlClass.id);
        }
    }
    return directedAcyclicGraph;
};
//# sourceMappingURL=filterClasses.js.map