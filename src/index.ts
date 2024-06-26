import { ObjectOrFacadeS, Schema, SchemaDefinition, transformToArray } from "typizator"
import JSONBig from "json-bigint"
import { Table } from "console-table-printer"
import { ColumnOptionsRaw } from "console-table-printer/dist/src/models/external-table";

declare global {
    namespace jest {
        interface Matchers<R> {
            /**
             * Used to check whether the received data (that is an array of objects) contains all the lines of the given table
             * A star `*` matches any value of a record's field.
             * The special `@ulid` value matches an ULID identifier
             * null and undefined match the corresponding values, "null" and "undefined" match corresponding strings
             * 
             * Extra records in the received data are ignored
             * 
             * The table can contain a subset of the received data's fields but fails if an unknown field is listed
             * 
             * Always fails if the given table is empty
             * 
             * Prints the resulting table coloured in green for passed values and in red for failed ones
             * @param schema Runtime type schema of the table's record type. See {@link https://www.npmjs.com/package/typizator | typizator} library for the definition
             * @param expected Tab- or space-separated table expected. See the `tabularInput` methor from {@link https://www.npmjs.com/package/typizator | typizator} for more info
             * @param title Optional table's title to print in the on-screen output
             */
            toContainTable<T extends SchemaDefinition>
                (schema: ObjectOrFacadeS<T>, expected: string, title?: string): CustomMatcherResult
            /**
             * Used to check whether the received string seems to be an ULID
             */
            toBeUlidish(): CustomMatcherResult
        }
    }
}

const isBigInt = (value: string) => {
    try {
        BigInt(value)
        return true
    }
    catch (e) { return false }
}

/**
 * Adds to JEST `expect` a matcher allowing to test whether a tabular data received contains a given data
 */
export const extendExpectWithToContainTable = () =>
    expect.extend({
        toContainTable<T extends SchemaDefinition>(received: Object[], schema: ObjectOrFacadeS<T>, expected: string, title?: string) {
            if (!Array.isArray(received)) return {
                pass: false,
                message: () => `Received object ${received} is not an array`
            }
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
                        expectedCell === "*" ?
                            "*" :
                            typeof expectedCell === "string" &&
                                (expectedCell.startsWith(">") || expectedCell.startsWith("<") || expectedCell.startsWith("~")) ?
                                expectedCell :
                                columnMetadata.unbox(expectedCell))
                }, new Map<string, any>()))
                let maxFailureIndex = -1
                let lastFailure = { key: "", value: "" }
                const hasAnyMatch = received.some((receivedLine) =>
                    expectedMap.every(([key, value], idx) => {
                        const success = ("*" === value ||
                            (
                                (typeof value) === "string" && (typeof (receivedLine as any)[key]) === "bigint" &&
                                (
                                    (value.startsWith("<=") && isBigInt(value.substring(2)) && BigInt(value.substring(2)).valueOf() >= ((receivedLine as any)[key] as bigint)) ||
                                    (value.startsWith(">=") && isBigInt(value.substring(2)) && BigInt(value.substring(2)).valueOf() <= ((receivedLine as any)[key] as bigint)) ||
                                    (value.startsWith("<") && isBigInt(value.substring(1)) && BigInt(value.substring(1)).valueOf() > ((receivedLine as any)[key] as bigint)) ||
                                    (value.startsWith(">") && isBigInt(value.substring(1)) && BigInt(value.substring(1)).valueOf() < ((receivedLine as any)[key] as bigint))
                                )
                            ) ||
                            (
                                (typeof value) === "string" && (typeof (receivedLine as any)[key]) === "number" &&
                                (
                                    (value.startsWith("<=") && !Number.isNaN(value.substring(2)) && Number(value.substring(2)).valueOf() >= ((receivedLine as any)[key] as bigint)) ||
                                    (value.startsWith(">=") && !Number.isNaN(value.substring(2)) && Number(value.substring(2)).valueOf() <= ((receivedLine as any)[key] as bigint)) ||
                                    (value.startsWith("<") && !Number.isNaN(value.substring(1)) && Number(value.substring(1)).valueOf() > ((receivedLine as any)[key] as bigint)) ||
                                    (value.startsWith(">") && !Number.isNaN(value.substring(1)) && Number(value.substring(1)).valueOf() < ((receivedLine as any)[key] as bigint))
                                )
                            ) ||
                            (
                                (typeof value) === "string" && (((receivedLine as any)[key]) instanceof Date) &&
                                (
                                    (value.startsWith("<=") && !isNaN(Date.parse(value.substring(2))) && new Date(value.substring(2)).getTime() >= ((receivedLine as any)[key] as Date).getTime()) ||
                                    (value.startsWith(">=") && !isNaN(Date.parse(value.substring(2))) && new Date(value.substring(2)).getTime() <= ((receivedLine as any)[key] as Date).getTime()) ||
                                    (value.startsWith("<") && !isNaN(Date.parse(value.substring(1))) && new Date(value.substring(1)).getTime() > ((receivedLine as any)[key] as Date).getTime()) ||
                                    (value.startsWith(">") && !isNaN(Date.parse(value.substring(1))) && new Date(value.substring(1)).getTime() < ((receivedLine as any)[key] as Date).getTime())
                                )
                            ) ||
                            (
                                (typeof value) === "string" &&
                                value.startsWith("~") &&
                                Number(value.substring(1)) === Math.round(Number((receivedLine as any)[key]))
                            ) ||
                            ("@ulid" === value && isUlidish((receivedLine as any)[key])) ||
                            ("@blankString" === value && ((receivedLine as any)[key])?.toString().trim() === "") ||
                            ("@sha256" === value && ((receivedLine as any)[key])?.match(/\b[A-Fa-f0-9]{64}\b/)) ||
                            (value?.getTime && (receivedLine as any)[key]?.getTime() === value.getTime()) ||
                            (receivedLine as any)[key] === value)
                        if (!success && idx > maxFailureIndex) {
                            lastFailure = { key, value: (receivedLine as any)[key] }
                            maxFailureIndex = idx
                        }
                        return success
                    })
                )
                if (!hasAnyMatch) {
                    missingLine = expectedLine
                    rowContent[lastFailure.key] = `--> ${rowContent[lastFailure.key]?.toString().trim() ?? "EMPTY"} !== ${lastFailure.value?.toString().trim() ?? "EMPTY"} <--`
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
                message: () => `Received ${JSONBig.stringify(received, null, 3)} doesn't contain ${JSONBig.stringify(missingLine, null, 3)}`
            }
        }
    })

const isUlidish = (received: string) => received.match(/[0-7][0-9A-HJKMNP-TV-Z]{25}/) !== null

/**
 * Adds to JEST `expect` a matcher checking whether the string received looks like an ULID
 */
export const extendExpectWithToBeUlidish = () =>
    expect.extend({
        toBeUlidish(received: string) {
            return {
                pass: isUlidish(received),
                message: () => `Received ${received} result doesn't match the ULID pattern`
            }
        }
    })