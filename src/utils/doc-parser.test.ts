import { describe, it, expect } from 'vitest'
import { parseAblDoc } from './doc-parser.js'

describe('parseAblDoc', () => {
  it('parses class doc', () => {
    const src = `/** Purpose: Customer business entity
 * @author dev
 */
class com.app.Customer:`
    const entries = parseAblDoc(src, 'customer.cls')
    expect(entries).toHaveLength(1)
    const e = entries[0]
    expect(e.name).toBe('Customer')
    expect(e.type).toBe('class')
    expect(e.file).toBe('customer.cls')
  })

  it('parses method doc with params', () => {
    const src = `/**
 * Purpose: Retrieve data from database
 * @param request - The get data request object
 * @param order - Sort order
 * @return Dataset handle
 */
  method public handle GetData(input request as IGetDataRequest):`
    const entries = parseAblDoc(src, 'be.cls')
    expect(entries).toHaveLength(1)
    const e = entries[0]
    expect(e.name).toBe('GetData')
    expect(e.type).toBe('method')
    expect(e.params).toHaveLength(2)
    expect(e.params[0].name).toBe('request')
    expect(e.params[0].description).toBe('The get data request object')
    expect(e.params[1].name).toBe('order')
    expect(e.returnDesc).toBe('Dataset handle')
  })

  it('parses procedure doc', () => {
    const src = `/** Purpose: main entry point */
procedure Main:
    run Init.`
    const entries = parseAblDoc(src, 'main.p')
    expect(entries).toHaveLength(1)
    expect(entries[0].name).toBe('Main')
    expect(entries[0].type).toBe('procedure')
  })

  it('parses function doc', () => {
    const src = `/** Purpose: calculate total
 * @param price - unit price
 * @return total
 */
function CalcTotal returns decimal (input i-price-de as decimal):`
    const entries = parseAblDoc(src, 'calc.p')
    expect(entries).toHaveLength(1)
    const e = entries[0]
    expect(e.name).toBe('CalcTotal')
    expect(e.type).toBe('function')
    expect(e.params).toHaveLength(1)
  })

  it('returns empty for source without ABLDoc', () => {
    const entries = parseAblDoc('define variable x as integer.\n', 'test.p')
    expect(entries).toHaveLength(0)
  })

  it('parses multiple doc blocks', () => {
    const src = `/** First function */
function First():
end.
/** Second function */
function Second():
end.`
    const entries = parseAblDoc(src, 'test.p')
    expect(entries).toHaveLength(2)
    expect(entries[0].name).toBe('First')
    expect(entries[1].name).toBe('Second')
  })

  it('handles modifier in method declaration', () => {
    const src = `/** Test method */
  method public static void TestMethod():`
    const entries = parseAblDoc(src, 'test.cls')
    expect(entries).toHaveLength(1)
    expect(entries[0].name).toBe('TestMethod')
    expect(entries[0].modifier).toBe('public')
  })

  it('does not create entries for doc without matching declaration', () => {
    const src = '/** orphaned comment */\n'
    const entries = parseAblDoc(src, 'test.p')
    expect(entries).toHaveLength(0)
  })
})
