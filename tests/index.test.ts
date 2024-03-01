import { bigintS, dateS, intS, objectS, stringS, tabularInput } from "typizator"
import { extendExpectWithToBeUlidish, extendExpectWithToContainTable } from "../src"

describe("Checking the Typizator test utilities", () => {
    extendExpectWithToContainTable()
    extendExpectWithToBeUlidish()

    const tabS = objectS({
        idem: intS.optional,
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

    test.failing("Should fail on empty test table", () => {
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

    test.failing("Should fail on unknown columns", () => {
        expect(tabularInput(tabS, `
            name           id   someDay
            "good will"    42   "2014-02-19"
            any            0    "2024-02-19"
            `, { d1: 1, d2: "q" }
        )).toContainTable(tabS, `
            name           id  d1   someDay         unknown
            "good will"     42  *   "2014-02-19"    *
             any            *   1   *               *
            `
        )
    })

    test.failing("Should correctly inform on a wrong cell in the middle of the table", () => {
        expect(tabularInput(tabS, `
            idem    name           id   someDay
            0       "good will"    50   "2014-02-19"
            0       "good will!"   41   "2014-02-19"
            0       any            0    "2024-02-19"
            `, { d1: 1, d2: "q" }
        )).toContainTable(tabS, `
            idem    name           id  d1   someDay
            0       "good will"     50  *   "2014-02-19"
            0       "good will!"    42  *   "2014-02-19"
            0       any             *   1   *
            `
        )
    })

    test("Should correctly work with null and undefined", () => {
        expect(tabularInput(tabS, `
            name           id   someDay
            "good will"    42   undefined
            any            null "2024-02-19"
            `, { d1: 1, d2: "q" }
        )).toContainTable(tabS, `
            name           id   d1   someDay
            "good will"    42   *   undefined
             any           null 1   *
            `
        )
    })

    test("Should correctly match ULIDs", () => {
        expect(tabularInput(tabS, `
            name                            id
            01HQWXKJFX9MC7SHB9ZCSRC0C9      42
            `, { d1: 1, d2: "q" }
        )).toContainTable(tabS, `
            name            id
            @ulid           42   
            `
        )
    })

    test.failing("Should fail ULIDs mismatches", () => {
        expect(tabularInput(tabS, `
            name                            id
            01HQWXKJFX9MC7SHB9ZCSRC0C       42
            `, { d1: 1, d2: "q" }
        )).toContainTable(tabS, `
            name            id
            @ulid           42   
            `
        )
    })

    test("Should match ULIDs", () => {
        expect("01HQWXKJFX9MC7SHB9ZCSRC0C9").toBeUlidish()
        expect("01HQWXKJFX9MC7SHB9ZCSRC0").not.toBeUlidish()
    })

    test.failing("Should fail on wrong ULIDs", () => {
        expect("01HQWXKJFX9MC7SHB9ZCSRC0").toBeUlidish()
    })
})