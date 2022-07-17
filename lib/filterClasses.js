"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classesConnectedToBaseContract = exports.classesConnectedToBaseContracts = void 0;
const js_graph_algorithms_1 = require("js-graph-algorithms");
const classesConnectedToBaseContracts = (umlClasses, baseContractNames, depth) => {
    let filteredUmlClasses = {};
    const graph = loadGraph(umlClasses);
    for (const baseContractName of baseContractNames) {
        filteredUmlClasses = {
            ...filteredUmlClasses,
            ...(0, exports.classesConnectedToBaseContract)(umlClasses, baseContractName, graph, depth),
        };
    }
    return Object.values(filteredUmlClasses);
};
exports.classesConnectedToBaseContracts = classesConnectedToBaseContracts;
const classesConnectedToBaseContract = (umlClasses, baseContractName, graph, depth = 1000) => {
    // Find the base UML Class from the base contract name
    const baseUmlClass = umlClasses.find(({ name }) => {
        return name === baseContractName;
    });
    if (!baseUmlClass) {
        throw Error(`Failed to find base contract with name "${baseContractName}"`);
    }
    const dfs = new js_graph_algorithms_1.Dijkstra(graph, baseUmlClass.id);
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
function loadGraph(umlClasses) {
    const graph = new js_graph_algorithms_1.WeightedDiGraph(umlClasses.length); // 6 is the number vertices in the graph
    for (const sourceUmlClass of umlClasses) {
        for (const association of Object.values(sourceUmlClass.associations)) {
            // Find the first UML Class that matches the target class name
            const targetUmlClass = umlClasses.find((targetUmlClass) => {
                return (targetUmlClass.name === association.targetUmlClassName &&
                    (sourceUmlClass.importedPaths.includes(targetUmlClass.absolutePath) ||
                        sourceUmlClass.absolutePath ===
                            targetUmlClass.absolutePath));
            });
            if (!targetUmlClass) {
                continue;
            }
            graph.addEdge(new js_graph_algorithms_1.Edge(sourceUmlClass.id, targetUmlClass.id, 1));
        }
    }
    return graph;
}
//# sourceMappingURL=filterClasses.js.map