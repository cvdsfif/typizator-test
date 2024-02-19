import { ObjectOrFacadeS, transformToArray } from "typizator"
import JSONBig from "json-bigint"
import { Table } from "console-table-printer";

declare global {
    namespace jest {
        interface Matchers<R> {
            toContainTable<T extends ObjectOrFacadeS<any>>
                (schema: T, expected: string, title?: string): CustomMatcherResult;
        }
    }
}

export const extendExpectWithToContainTable = () =>
    expect.extend({
        toContainTable<T extends ObjectOrFacadeS<any>>(received: Object[], schema: T, expected: string, title?: string) {
            const expectedArray = transformToArray(expected)
            if (expectedArray.length == 0) {
                console.warn("Checking against an empty table always pass")
                return { pass: true, message: () => "" }
            }
            const resultTable = new Table({
                title,
                columns: Object.keys(expectedArray[0]).map(key => ({ name: key, alignment: "left" }))
            })
            let missingLine = {}
            const pass = expectedArray.every((expectedLine) => {
                const rowContent = {} as any
                const expectedMap = Array.from(Object.keys(expectedLine).reduce((accumulator: Map<string, any>, key: string) => {
                    const expectedCell = (expectedLine as any)[key]
                    rowContent[key] = expectedCell
                    return accumulator.set(key,
                        expectedCell === "*" ? "*" : schema.metadata.fields.get(key)?.unbox(expectedCell))
                }, new Map<string, any>))
                let lastFailure = { key: "", value: "" }
                const hasAnyMatch = received.some((receivedLine) =>
                    expectedMap.every(([key, value]) => {
                        const success = ("*" === value ||
                            (value.getTime && (receivedLine as any)[key]?.getTime() === value.getTime()) ||
                            (receivedLine as any)[key] === value)
                        if (!success) lastFailure = { key, value: (receivedLine as any)[key] }
                        return success
                    })
                )
                if (!hasAnyMatch) {
                    missingLine = expectedLine
                    rowContent[lastFailure.key] = `--> ${rowContent[lastFailure.key]} !== ${lastFailure.value} <--`
                    resultTable.addRow(rowContent, { color: "red" })
                } else resultTable.addRow(rowContent, { color: "green" })
                return hasAnyMatch
            })
            resultTable.printTable()
            return {
                pass,
                message: () => `Received ${JSONBig.stringify(received)} doesn't contain ${JSONBig.stringify(missingLine)}`
            }
        }
    });