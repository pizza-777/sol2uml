import { Association, UmlClass } from './umlClass'

// Find the UML class linked to the association
export const findAssociatedClass = (
    association: Association,
    sourceUmlClass: UmlClass,
    umlClasses: UmlClass[]
) => {
    return umlClasses.find((targetUmlClass) => {
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
}
