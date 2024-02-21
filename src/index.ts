import { ObjectOrFacadeS, Schema, SchemaDefinition, transformToArray } from "typizator"
import JSONBig from "json-bigint"
import { Table } from "console-table-printer"
import { ColumnOptionsRaw } from "console-table-printer/dist/src/models/external-table";

declare global {
    namespace jest {
        interface Matchers<R> {
            toContainTable<T extends SchemaDefinition>
                (schema: ObjectOrFacadeS<T>, expected: string, title?: string): CustomMatcherResult
        }
    }
}

export const extendExpectWithToContainTable = () =>
    expect.extend({
        toContainTable<T extends SchemaDefinition>(received: Object[], schema: ObjectOrFacadeS<T>, expected: string, title?: string) {
            const expectedArray = transformToArray(expected)
            if (expectedArray.length == 0) {
                return { pass: false, message: () => "Cannot compare to an empty table" }
            }

            const wrongColumns = [] as string[]
            const columnDefinitions = [] as ColumnOptionsRaw[]
            const schemas = new Map<string, Schema>();
            Object.keys(expectedArray[0]).forEach(key => {
                const columnSchema = schema.metadata.fields.get(key)
                if (columnSchema) {
                    schemas.set(key, columnSchema)
                    columnDefinitions.push({ name: key, alignment: "left" })
                }
                else {
                    wrongColumns.push(key)
                    columnDefinitions.push({ name: key, alignment: "left", color: "red" })
                }
            })
            const resultTable = new Table({
                title,
                columns: columnDefinitions
            })
            if (wrongColumns.length > 0) {
                expectedArray.forEach(row => resultTable.addRow(row))
                resultTable.printTable()
                return { pass: false, message: () => `Columns absent in the checked type: ${wrongColumns.join(",")}` }
            }
            let missingLine = {}
            const pass = expectedArray.every((expectedLine) => {
                const rowContent = {} as any
                const expectedMap = Array.from(Object.keys(expectedLine).reduce((accumulator: Map<string, any>, key: string) => {
                    const expectedCell = (expectedLine as any)[key]
                    rowContent[key] = expectedCell
                    const columnMetadata = schemas.get(key)!
                    return accumulator.set(key,
                        expectedCell === "*" ? "*" : columnMetadata.unbox(expectedCell))
                }, new Map<string, any>()))
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
            const currentRows = resultTable.table.rows.length
            expectedArray.forEach((row, idx) => {
                if (idx >= currentRows) resultTable.addRow(row)
            })
            resultTable.printTable()
            return {
                pass,
                message: () => `Received ${JSONBig.stringify(received)} doesn't contain ${JSONBig.stringify(missingLine)}`
            }
        }
    });