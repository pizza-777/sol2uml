export type OutputFormats = 'svg' | 'png' | 'dot' | 'all';
/**
 * Writes output files to the file system based on the provided input and options.
 * @param dot The input string in DOT format.
 * @param contractName The name of the contract.
 * @param outputFormat The format of the output file. choices: svg, png, dot or all. default: png
 * @param outputFilename optional filename of the output file.
 */
export declare const writeOutputFiles: (dot: string, contractName: string, outputFormat?: OutputFormats, outputFilename?: string) => Promise<void>;
export declare function convertDot2Svg(dot: string): any;
export declare function writeSolidity(code: string, filename?: string): void;
export declare function writeDot(dot: string, filename: string): void;
/**
 * Writes an SVG file to the file system.
 * @param svg The SVG input to be written to the file system.
 * @param svgFilename The desired file name for the SVG file. default: classDiagram.svg
 * @param outputFormats The format of the output file. choices: svg, png, dot or all. default: png
 * @throws Error - If there is an error writing the SVG file.
 */
export declare function writeSVG(svg: any, svgFilename?: string, outputFormats?: OutputFormats): Promise<void>;
/**
 * Asynchronously writes a PNG file to the file system from an SVG input.
 * @param svg - The SVG input to be converted to a PNG file.
 * @param filename - The desired file name for the PNG file.
 * @throws Error - If there is an error converting or writing the PNG file.
 */
export declare function writePng(svg: any, filename: string): Promise<void>;
