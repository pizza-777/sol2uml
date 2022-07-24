import { dirname } from 'path'
import { ClassOptions, convertClass2Dot } from './converterClass2Dot'
import {
    Association,
    ClassStereotype,
    ReferenceType,
    UmlClass,
} from './umlClass'
import { findAssociatedClass } from './associations'

const debug = require('debug')('sol2uml')

export function convertUmlClasses2Dot(
    umlClasses: UmlClass[],
    clusterFolders: boolean = false,
    classOptions: ClassOptions = {}
): string {
    let dotString: string = `
digraph UmlClassDiagram {
rankdir=BT
color=black
arrowhead=open
node [shape=record, style=filled, fillcolor=gray95]`

    // Sort UML Classes by folder of source file
    const umlClassesSortedByCodePath = sortUmlClassesByCodePath(umlClasses)

    let currentCodeFolder = ''
    for (const umlClass of umlClassesSortedByCodePath) {
        const codeFolder = dirname(umlClass.relativePath)
        if (currentCodeFolder !== codeFolder) {
            // Need to close off the last subgraph if not the first
            if (currentCodeFolder != '') {
                dotString += '\n}'
            }

            dotString += `
subgraph ${getSubGraphName(clusterFolders)} {
label="${codeFolder}"`

            currentCodeFolder = codeFolder
        }
        dotString += convertClass2Dot(umlClass, classOptions)
    }

    // Need to close off the last subgraph if not the first
    if (currentCodeFolder != '') {
        dotString += '\n}'
    }

    dotString += addAssociationsToDot(umlClasses, classOptions)

    // Need to close off the last the digraph
    dotString += '\n}'

    debug(dotString)

    return dotString
}

let subGraphCount = 0
function getSubGraphName(clusterFolders: boolean = false) {
    if (clusterFolders) {
        return ` cluster_${subGraphCount++}`
    }
    return ` graph_${subGraphCount++}`
}

function sortUmlClassesByCodePath(umlClasses: UmlClass[]): UmlClass[] {
    return umlClasses.sort((a, b) => {
        if (a.relativePath < b.relativePath) {
            return -1
        }
        if (a.relativePath > b.relativePath) {
            return 1
        }
        return 0
    })
}

export function addAssociationsToDot(
    umlClasses: UmlClass[],
    classOptions: ClassOptions = {}
): string {
    let dotString: string = ''

    // for each class
    for (const sourceUmlClass of umlClasses) {
        if (!classOptions.hideEnums) {
            // for each enum in the class
            sourceUmlClass.enums.forEach((enumId) => {
                // Draw aggregated link from contract to contract level Enum
                dotString += `\n${enumId} -> ${sourceUmlClass.id} [arrowhead=diamond, weight=2]`
            })
        }
        if (!classOptions.hideStructs) {
            // for each struct in the class
            sourceUmlClass.structs.forEach((structId) => {
                // Draw aggregated link from contract to contract level Struct
                dotString += `\n${structId} -> ${sourceUmlClass.id} [arrowhead=diamond, weight=2]`
            })
        }

        // for each association in that class
        for (const association of Object.values(sourceUmlClass.associations)) {
            const targetUmlClass = findAssociatedClass(
                association,
                sourceUmlClass,
                umlClasses
            )
            if (targetUmlClass) {
                dotString += addAssociationToDot(
                    sourceUmlClass,
                    targetUmlClass,
                    association,
                    classOptions
                )
            }
        }
    }

    return dotString
}

function addAssociationToDot(
    sourceUmlClass: UmlClass,
    targetUmlClass: UmlClass,
    association: Association,
    classOptions: ClassOptions = {}
): string {
    // do not include library or interface associations if hidden
    // Or associations to Structs or Enums if they are hidden
    if (
        (classOptions.hideLibraries &&
            (sourceUmlClass.stereotype === ClassStereotype.Library ||
                targetUmlClass.stereotype === ClassStereotype.Library)) ||
        (classOptions.hideInterfaces &&
            (targetUmlClass.stereotype === ClassStereotype.Interface ||
                sourceUmlClass.stereotype === ClassStereotype.Interface)) ||
        (classOptions.hideAbstracts &&
            (targetUmlClass.stereotype === ClassStereotype.Abstract ||
                sourceUmlClass.stereotype === ClassStereotype.Abstract)) ||
        (classOptions.hideStructs &&
            targetUmlClass.stereotype === ClassStereotype.Struct) ||
        (classOptions.hideEnums &&
            targetUmlClass.stereotype === ClassStereotype.Enum)
    ) {
        return ''
    }

    let dotString = `\n${sourceUmlClass.id} -> ${targetUmlClass.id} [`

    if (
        association.referenceType == ReferenceType.Memory ||
        (association.realization &&
            targetUmlClass.stereotype === ClassStereotype.Interface)
    ) {
        dotString += 'style=dashed, '
    }

    if (association.realization) {
        dotString += 'arrowhead=empty, arrowsize=3, '
        if (!targetUmlClass.stereotype) {
            dotString += 'weight=4, '
        } else {
            dotString += 'weight=3, '
        }
    }

    return dotString + ']'
}
