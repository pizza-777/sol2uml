import { Association, UmlClass } from './umlClass'

// Find the UML class linked to the association
export const findAssociatedClass = (
    association: Association,
    sourceUmlClass: UmlClass,
    umlClasses: UmlClass[]
): UmlClass | undefined => {
    let umlClass = umlClasses.find((targetUmlClass) => {
        return (
            // class is in the same source file
            (association.targetUmlClassName === targetUmlClass.name &&
                sourceUmlClass.absolutePath === targetUmlClass.absolutePath) ||
            // imported classes with no explicit import names
            (association.targetUmlClassName === targetUmlClass.name &&
                sourceUmlClass.imports.find(
                    (i) =>
                        i.absolutePath === targetUmlClass.absolutePath &&
                        i.classNames.length === 0
                )) ||
            // imported classes with explicit import names or import aliases
            sourceUmlClass.imports.find(
                (i) =>
                    i.absolutePath === targetUmlClass.absolutePath &&
                    i.classNames.find(
                        (importedClass) =>
                            // no import alias
                            (association.targetUmlClassName ===
                                importedClass.className &&
                                importedClass.className ===
                                    targetUmlClass.name &&
                                importedClass.alias == undefined) ||
                            // import alias
                            (association.targetUmlClassName ===
                                importedClass.alias &&
                                importedClass.className === targetUmlClass.name)
                    )
            )
        )
    })
    if (umlClass) return umlClass

    // Could not find so now need to recursively look at imports of imports
    return findImplicitImport(association, sourceUmlClass, umlClasses)
}

const findImplicitImport = (
    association: Association,
    sourceUmlClass: UmlClass,
    umlClasses: UmlClass[]
): UmlClass | undefined => {
    // Get all implicit imports. That is, imports that do not explicitly import contracts or interfaces.
    const implicitImports = sourceUmlClass.imports.filter(
        (i) => i.classNames.length === 0
    )
    // For each implicit import
    for (const importDetail of implicitImports) {
        // Find a class with the same absolute path as the import so we can get the new imports
        const newSourceUmlClass = umlClasses.find(
            (c) => c.absolutePath === importDetail.absolutePath
        )
        if (!newSourceUmlClass) {
            // Could not find a class in the import file so just move onto the next loop
            continue
        }
        // TODO need to handle imports that use aliases as the association will not be found
        const umlClass = findAssociatedClass(
            association,
            newSourceUmlClass,
            umlClasses
        )
        if (umlClass) return umlClass
    }
    return undefined
}
