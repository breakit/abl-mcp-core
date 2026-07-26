import { describe, it, expect } from 'vitest'
import { generateDocComment, generateClassDoc, generateMethodDoc } from './doc-comment.js'

describe('generateDocComment', () => {
  it('generates basic comment block', () => {
    const result = generateDocComment({ type: 'method', name: 'GetData' })
    expect(result).toContain('/**')
    expect(result).toContain('*/')
    expect(result).toContain('Purpose: GetData')
  })

  it('includes description when provided', () => {
    const result = generateDocComment({ type: 'method', name: 'GetData', description: 'Retrieve data' })
    expect(result).toContain('Purpose: Retrieve data')
  })

  it('includes parameters', () => {
    const result = generateDocComment({
      type: 'method',
      name: 'GetData',
      params: [
        { name: 'request', dataType: 'IGetDataRequest', description: 'The request' },
        { name: 'order', dataType: 'INTEGER', description: 'Sort order' },
      ],
    })
    expect(result).toContain('@param request - The request')
    expect(result).toContain('@param order - Sort order')
  })

  it('uses dataType as description when no param description', () => {
    const result = generateDocComment({
      type: 'method',
      name: 'Update',
      params: [{ name: 'id', dataType: 'INTEGER' }],
    })
    expect(result).toContain('@param id - INTEGER')
  })

  it('includes return info', () => {
    const result = generateDocComment({ type: 'method', name: 'GetData', returnType: 'HANDLE', returnDesc: 'Dataset handle' })
    expect(result).toContain('@return Dataset handle')
  })

  it('includes author', () => {
    const result = generateDocComment({ type: 'class', name: 'Customer', author: 'dev' })
    expect(result).toContain('@author dev')
  })

  it('includes notes', () => {
    const result = generateDocComment({ type: 'procedure', name: 'Run', notes: ['Note 1', 'Note 2'] })
    expect(result).toContain('@note Note 1')
    expect(result).toContain('@note Note 2')
  })

  it('handles empty options gracefully', () => {
    const result = generateDocComment({ type: 'function', name: 'MyFunc' })
    expect(result.split('\n')).toHaveLength(4) // /**, Purpose, *, */
  })
})

describe('generateClassDoc', () => {
  it('generates class doc with default description', () => {
    const result = generateClassDoc('Customer')
    expect(result).toContain('Purpose: Customer — Business Entity class')
  })

  it('generates class doc with custom description', () => {
    const result = generateClassDoc('Customer', 'Customer management')
    expect(result).toContain('Purpose: Customer management')
  })
})

describe('generateMethodDoc', () => {
  it('generates method doc with default description', () => {
    const result = generateMethodDoc('GetData')
    expect(result).toContain('Purpose: GetData method')
  })

  it('generates method doc with params and return', () => {
    const result = generateMethodDoc('Create', 'Create a record', [{ name: 'data', dataType: 'CHARACTER' }], 'LOGICAL')
    expect(result).toContain('Purpose: Create a record')
    expect(result).toContain('@param data - CHARACTER')
    expect(result).toContain('@return LOGICAL')
  })
})
