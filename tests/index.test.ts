import { bigintS, dateS, intS, objectS, stringS, tabularInput } from "typizator"
import { extendExpectWithToContainTable } from "../src"

describe("Checking the Typizator test utilities", () => {
    extendExpectWithToContainTable()

    const tabS = objectS({
        id: bigintS,
        name: stringS,
        someDay: dateS.optional,
        d1: intS.optional,
        d2: stringS.optional
    }).notNull

    test("Should work with toContainTable", () => {
        expect(tabularInput(tabS, `
            name           id
            "good will"    42
            any            0
            `, { d1: 1, d2: "q" }
        )).toContainTable(tabS, `
            name           id  d1  d2
            "good will"     42  1   q
             any            0   1   q
            `
        )
        expect(tabularInput(tabS, `
            name           id
            "good will"    42
            any            0
            `, { d1: 1, d2: "q" }
        )).toContainTable(tabS, `
            name           id  d1  d2
            "good will"     42  1   q
            `
        )
    })

    test.failing("Should fail on wrong data", () => {
        expect(tabularInput(tabS, `
            name           id
            "good will"    42
            any            0
            `, { d1: 1, d2: "q" }
        )).toContainTable(tabS, `
            name           id  d1  d2
            "good will"     42  1   q
             any            0   5   q
             any            0   1   q
            `, "Failing test"
        )
    })

    test("Should always pass on empty test table", () => {
        expect(tabularInput(tabS, `
            name           id
            "good will"    42
            any            0
            `, { d1: 1, d2: "q" }
        )).toContainTable(tabS, `
            name           id  d1  d2
            `
        )
    })

    test("Should work with toContainTable and accept wildcards", () => {
        expect(tabularInput(tabS, `
            name           id   someDay
            "good will"    42   "2014-02-19"
            any            0    "2024-02-19"
            `, { d1: 1, d2: "q" }
        )).toContainTable(tabS, `
            name           id  d1   someDay
            "good will"     42  *   "2014-02-19"
             any            *   1   *
            `
        )
    })
})