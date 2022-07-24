import { lstatSync, writeFile } from 'fs'
import path from 'path'
import vizRenderStringSync from '@aduh95/viz.js/sync'
const { convert } = require('convert-svg-to-png')

const debug = require('debug')('sol2uml')

export type OutputFormats = 'svg' | 'png' | 'dot' | 'all'

export const writeOutputFiles = async (
    dot: string,
    outputBaseName: string,
    outputFormat: OutputFormats = 'svg',
    outputFilename?: string
): Promise<void> => {
    if (outputFormat === 'dot' || outputFormat === 'all') {
        writeDot(dot, outputFilename)

        // No need to continue if only generating a dot file
        if (outputFormat === 'dot') {
            return
        }
    }

    if (!outputFilename) {
        // If all output then extension is svg
        const outputExt = outputFormat === 'all' ? 'svg' : outputFormat

        // if outputBaseName is a folder
        try {
            const folderOrFile = lstatSync(outputBaseName)
            if (folderOrFile.isDirectory()) {
                const parsedDir = path.parse(process.cwd())
                outputBaseName = path.join(process.cwd(), parsedDir.name)
            }
        } catch (err) {} // we can ignore errors as it just means outputBaseName is not a folder

        outputFilename = outputBaseName + '.' + outputExt
    }

    const svg = convertDot2Svg(dot)

    if (outputFormat === 'svg' || outputFormat === 'all') {
        await writeSVG(svg, outputFilename, outputFormat)
    }

    if (outputFormat === 'png' || outputFormat === 'all') {
        await writePng(svg, outputFilename)
    }
}

export function convertDot2Svg(dot: string): any {
    debug(`About to convert dot to SVG`)

    try {
        return vizRenderStringSync(dot)
    } catch (err) {
        console.error(`Failed to convert dot to SVG. ${err.message}`)
        console.log(dot)
        throw new Error(`Failed to parse dot string`, { cause: err })
    }
}

export function writeSolidity(code: string, filename = 'solidity') {
    const extension = path.extname(filename)
    const outputFile = extension === '.sol' ? filename : filename + '.sol'
    debug(`About to write Solidity to file ${outputFile}`)

    writeFile(outputFile, code, (err) => {
        if (err) {
            throw new Error(`Failed to write Solidity to file ${outputFile}`, {
                cause: err,
            })
        } else {
            console.log(`Solidity written to ${outputFile}`)
        }
    })
}

export function writeDot(dot: string, filename = 'classDiagram.dot') {
    const extension = path.extname(filename)
    const outputFile = extension === '.dot' ? filename : filename + '.dot'
    debug(`About to write Dot file to ${outputFile}`)

    writeFile(outputFile, dot, (err) => {
        if (err) {
            throw new Error(`Failed to write Dot file to ${outputFile}`, {
                cause: err,
            })
        } else {
            console.log(`Dot file written to ${outputFile}`)
        }
    })
}

export function writeSVG(
    svg: any,
    svgFilename = 'classDiagram.svg',
    outputFormats: OutputFormats = 'png'
): Promise<void> {
    debug(`About to write SVN file to ${svgFilename}`)

    if (outputFormats === 'png') {
        const parsedFile = path.parse(svgFilename)
        if (!parsedFile.dir) {
            svgFilename = process.cwd() + '/' + parsedFile.name + '.svg'
        } else {
            svgFilename = parsedFile.dir + '/' + parsedFile.name + '.svg'
        }
    }

    return new Promise<void>((resolve, reject) => {
        writeFile(svgFilename, svg, (err) => {
            if (err) {
                reject(
                    new Error(`Failed to write SVG file to ${svgFilename}`, {
                        cause: err,
                    })
                )
            } else {
                console.log(`Generated svg file ${svgFilename}`)
                resolve()
            }
        })
    })
}

export async function writePng(svg: any, filename: string): Promise<void> {
    // get svg file name from png file name
    const parsedPngFile = path.parse(filename)
    const pngDir =
        parsedPngFile.dir === '' ? '.' : path.resolve(parsedPngFile.dir)
    const pngFilename = pngDir + '/' + parsedPngFile.name + '.png'

    debug(`About to write png file ${pngFilename}`)

    try {
        const png = await convert(svg, {
            outputFilePath: pngFilename,
        })

        return new Promise<void>((resolve, reject) => {
            writeFile(pngFilename, png, (err) => {
                if (err) {
                    reject(
                        new Error(
                            `Failed to write PNG file to ${pngFilename}`,
                            {
                                cause: err,
                            }
                        )
                    )
                } else {
                    console.log(`Generated png file ${pngFilename}`)
                    resolve()
                }
            })
        })
    } catch (err) {
        throw new Error(`Failed to convert PNG file ${pngFilename}`, {
            cause: err,
        })
    }

    console.log(`Generated png file ${pngFilename}`)
}
