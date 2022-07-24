export const isAddress = (input: string): boolean => {
    return input.match(/^0x([A-Fa-f0-9]{40})$/) !== null
}
