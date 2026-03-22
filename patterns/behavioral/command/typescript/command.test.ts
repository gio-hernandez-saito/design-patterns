import { describe, it, expect, beforeEach } from 'vitest'
import {
  TextBuffer,
  InsertCommand,
  DeleteCommand,
  EditorHistory,
} from './command.js'

describe('Command 패턴 - 텍스트 에디터', () => {
  let buffer: TextBuffer
  let history: EditorHistory

  beforeEach(() => {
    buffer = new TextBuffer()
    history = new EditorHistory()
  })

  describe('기본 명령 실행', () => {
    it('InsertCommand가 텍스트를 올바른 위치에 삽입한다', () => {
      history.execute(new InsertCommand(buffer, 0, 'Hello'))
      expect(buffer.getContent()).toBe('Hello')

      history.execute(new InsertCommand(buffer, 5, ' World'))
      expect(buffer.getContent()).toBe('Hello World')
    })

    it('DeleteCommand가 텍스트를 올바르게 삭제한다', () => {
      history.execute(new InsertCommand(buffer, 0, 'Hello World'))
      history.execute(new DeleteCommand(buffer, 5, 6)) // " World" 삭제
      expect(buffer.getContent()).toBe('Hello')
    })

    it('명령 실행 후 이력 크기가 증가한다', () => {
      expect(history.getHistorySize()).toBe(0)
      history.execute(new InsertCommand(buffer, 0, 'Hi'))
      expect(history.getHistorySize()).toBe(1)
      history.execute(new InsertCommand(buffer, 2, '!'))
      expect(history.getHistorySize()).toBe(2)
    })
  })

  describe('취소(undo)', () => {
    it('InsertCommand를 undo하면 삽입된 텍스트가 제거된다', () => {
      history.execute(new InsertCommand(buffer, 0, 'Hello'))
      history.undo()
      expect(buffer.getContent()).toBe('')
    })

    it('DeleteCommand를 undo하면 삭제된 텍스트가 복원된다', () => {
      history.execute(new InsertCommand(buffer, 0, 'Hello World'))
      history.execute(new DeleteCommand(buffer, 5, 6))
      history.undo()
      expect(buffer.getContent()).toBe('Hello World')
    })

    it('여러 명령을 역순으로 취소한다', () => {
      history.execute(new InsertCommand(buffer, 0, 'Hello'))
      history.execute(new InsertCommand(buffer, 5, ' World'))
      expect(buffer.getContent()).toBe('Hello World')

      history.undo()
      expect(buffer.getContent()).toBe('Hello')

      history.undo()
      expect(buffer.getContent()).toBe('')
    })

    it('undo할 명령이 없으면 false를 반환한다', () => {
      expect(history.undo()).toBe(false)
    })

    it('undo 후 이력 크기가 감소한다', () => {
      history.execute(new InsertCommand(buffer, 0, 'A'))
      history.execute(new InsertCommand(buffer, 1, 'B'))
      history.undo()
      expect(history.getHistorySize()).toBe(1)
    })
  })

  describe('재실행(redo)', () => {
    it('undo 후 redo하면 명령이 재실행된다', () => {
      history.execute(new InsertCommand(buffer, 0, 'Hello'))
      history.undo()
      expect(buffer.getContent()).toBe('')

      history.redo()
      expect(buffer.getContent()).toBe('Hello')
    })

    it('여러 번 undo 후 redo로 순서대로 복원된다', () => {
      history.execute(new InsertCommand(buffer, 0, 'A'))
      history.execute(new InsertCommand(buffer, 1, 'B'))
      history.execute(new InsertCommand(buffer, 2, 'C'))

      history.undo() // C 취소
      history.undo() // B 취소
      expect(buffer.getContent()).toBe('A')

      history.redo() // B 재실행
      expect(buffer.getContent()).toBe('AB')

      history.redo() // C 재실행
      expect(buffer.getContent()).toBe('ABC')
    })

    it('redo할 명령이 없으면 false를 반환한다', () => {
      expect(history.redo()).toBe(false)
    })

    it('새 명령 실행 시 redo 이력이 초기화된다', () => {
      history.execute(new InsertCommand(buffer, 0, 'A'))
      history.undo()
      expect(history.getRedoSize()).toBe(1)

      // 새 명령을 실행하면 redo 스택이 비워진다
      history.execute(new InsertCommand(buffer, 0, 'B'))
      expect(history.getRedoSize()).toBe(0)
      expect(history.redo()).toBe(false)
    })
  })

  describe('명령 히스토리', () => {
    it('복잡한 편집 시나리오를 정확하게 처리한다', () => {
      // "Hello World" 작성 후 "World"를 "TypeScript"로 교체
      history.execute(new InsertCommand(buffer, 0, 'Hello World'))
      history.execute(new DeleteCommand(buffer, 6, 5)) // "World" 삭제
      history.execute(new InsertCommand(buffer, 6, 'TypeScript'))
      expect(buffer.getContent()).toBe('Hello TypeScript')

      // 전체 undo
      history.undo()
      expect(buffer.getContent()).toBe('Hello ')
      history.undo()
      expect(buffer.getContent()).toBe('Hello World')
      history.undo()
      expect(buffer.getContent()).toBe('')
    })
  })
})
