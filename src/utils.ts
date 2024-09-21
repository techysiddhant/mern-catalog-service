/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapToObject(map: Map<string, any>) {
    const obj = {};
    for (const [key, value] of map) {
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/ban-ts-comment
        obj[key] = value instanceof Map ? mapToObject(value) : value;
    }
    return obj;
}
