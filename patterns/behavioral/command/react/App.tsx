/**
 * Command 패턴 — React 구현
 *
 * React에서의 역할 매핑:
 * - Command (EditorCommand 인터페이스) → Action 타입 (execute와 undo 포함)
 * - Receiver (TextBuffer)             → useReducer 상태 (실제 텍스트 데이터)
 * - ConcreteCommand                   → insertAction(), deleteAction() 팩토리 함수
 * - Invoker (EditorHistory)           → useCommandHistory() 훅 (undo/redo 스택 관리)
 *
 * 왜 useReducer인가?
 * - TS에서 Invoker(EditorHistory)는 command.execute()를 호출해 Receiver를 변경했다.
 * - React에서 dispatch(action)이 "명령 실행"이고, reducer가 실제 상태 변경(Receiver)을 담당한다.
 * - undo/redo는 useCommandHistory 훅이 별도로 관리하는 history/redoStack으로 구현한다.
 */

import { useReducer, useState, useCallback } from 'react'

// ─────────────────────────────────────────────
// Command 타입 — execute와 undo가 쌍으로 존재
// ─────────────────────────────────────────────

interface Command {
  id: string
  description: string          // 사용자에게 보여줄 명령 설명
  execute: (text: string) => string  // 텍스트에 명령을 적용해 새 텍스트를 반환
  undo: (text: string) => string     // 명령을 취소해 이전 텍스트를 반환
}

// ─────────────────────────────────────────────
// ConcreteCommand 팩토리 함수들
// ─────────────────────────────────────────────

/**
 * insertCommand: 텍스트 삽입 명령 — InsertCommand의 React 버전.
 *
 * TS에서는 클래스로 구현됐지만 React에서는 팩토리 함수로 Command 객체를 생성한다.
 * execute/undo가 순수 함수(pure function)로 구현되어 부작용 없이 상태를 변환한다.
 */
function insertCommand(position: number, text: string): Command {
  return {
    id: `insert-${Date.now()}`,
    description: `삽입: "${text}" (위치 ${position})`,
    execute(current: string): string {
      return current.slice(0, position) + text + current.slice(position)
    },
    undo(current: string): string {
      // 삽입을 취소: 삽입된 위치에서 삽입한 길이만큼 제거
      return current.slice(0, position) + current.slice(position + text.length)
    },
  }
}

/**
 * deleteCommand: 텍스트 삭제 명령 — DeleteCommand의 React 버전.
 *
 * undo를 위해 삭제할 텍스트를 미리 캡처해야 한다.
 * execute 시점의 현재 텍스트를 클로저로 캡처한다.
 */
function deleteCommand(position: number, length: number, currentText: string): Command {
  // undo를 위해 삭제될 텍스트를 미리 저장 — TS의 deletedText 필드와 동일
  const deletedText = currentText.slice(position, position + length)

  return {
    id: `delete-${Date.now()}`,
    description: `삭제: "${deletedText}" (위치 ${position}, 길이 ${length})`,
    execute(current: string): string {
      return current.slice(0, position) + current.slice(position + length)
    },
    undo(current: string): string {
      // 저장해둔 텍스트를 원래 위치에 복원
      return current.slice(0, position) + deletedText + current.slice(position)
    },
  }
}

/**
 * replaceAllCommand: 전체 텍스트 교체 명령
 */
function replaceAllCommand(newText: string, oldText: string): Command {
  return {
    id: `replace-${Date.now()}`,
    description: `전체 교체`,
    execute(): string { return newText },
    undo(): string { return oldText },
  }
}

/**
 * uppercaseCommand: 대문자 변환 명령
 */
function uppercaseCommand(currentText: string): Command {
  const original = currentText
  return {
    id: `upper-${Date.now()}`,
    description: '대문자 변환',
    execute(text: string): string { return text.toUpperCase() },
    undo(): string { return original },
  }
}

// ─────────────────────────────────────────────
// Invoker 훅 — EditorHistory 역할
// ─────────────────────────────────────────────

/**
 * useCommandHistory: Invoker 역할을 하는 훅.
 *
 * TS의 EditorHistory가 두 스택(history, redoStack)을 관리했듯이,
 * 이 훅은 실행된 명령들의 이력을 관리하고 undo/redo를 제공한다.
 *
 * text 상태를 직접 관리하는 이유:
 * - Command는 텍스트 변환 순수 함수다.
 * - Invoker가 텍스트를 관리해야 undo 시 이전 상태로 되돌릴 수 있다.
 */
function useCommandHistory(initialText: string = '') {
  const [text, setText] = useState(initialText)
  const [history, setHistory] = useState<Command[]>([])     // 실행된 명령 스택
  const [redoStack, setRedoStack] = useState<Command[]>([]) // undo된 명령 스택

  /**
   * execute(): 명령을 실행하고 history에 추가한다.
   * TS의 EditorHistory.execute()와 동일.
   */
  const execute = useCallback((command: Command) => {
    setText(prev => command.execute(prev))
    setHistory(prev => [...prev, command])
    // 새 명령 실행 시 redo 이력은 무효화 (분기된 이력 버리기)
    setRedoStack([])
  }, [])

  /**
   * undo(): 가장 최근 명령을 취소한다.
   */
  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev
      const command = prev[prev.length - 1]
      const next = prev.slice(0, -1)
      setText(current => command.undo(current))
      setRedoStack(r => [...r, command])
      return next
    })
  }, [])

  /**
   * redo(): undo된 명령을 다시 실행한다.
   */
  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev
      const command = prev[prev.length - 1]
      const next = prev.slice(0, -1)
      setText(current => command.execute(current))
      setHistory(h => [...h, command])
      return next
    })
  }, [])

  return {
    text, execute, undo, redo,
    canUndo: history.length > 0,
    canRedo: redoStack.length > 0,
    history,
    redoStack,
  }
}

// ─────────────────────────────────────────────
// 메인 App
// ─────────────────────────────────────────────

export default function App() {
  const editor = useCommandHistory('안녕하세요! 텍스트 에디터입니다.')
  const [insertPos, setInsertPos] = useState(0)
  const [insertText, setInsertText] = useState(' React!')
  const [deletePos, setDeletePos] = useState(0)
  const [deleteLen, setDeleteLen] = useState(3)

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 750, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Command 패턴 — React</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        텍스트 편집 명령을 Command 객체로 캡슐화합니다. Undo/Redo를 history 스택으로 구현합니다.
      </p>

      {/* 텍스트 에디터 */}
      <div style={{ border: '2px solid #333', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 'bold', fontSize: 13 }}>텍스트 버퍼 (Receiver)</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={editor.undo} disabled={!editor.canUndo}
              style={{
                padding: '6px 16px', borderRadius: 4, border: 'none', cursor: editor.canUndo ? 'pointer' : 'default',
                background: editor.canUndo ? '#1976d2' : '#ddd',
                color: editor.canUndo ? 'white' : '#aaa', fontWeight: 'bold',
              }}>
              ↩ Undo ({editor.history.length})
            </button>
            <button onClick={editor.redo} disabled={!editor.canRedo}
              style={{
                padding: '6px 16px', borderRadius: 4, border: 'none', cursor: editor.canRedo ? 'pointer' : 'default',
                background: editor.canRedo ? '#388e3c' : '#ddd',
                color: editor.canRedo ? 'white' : '#aaa', fontWeight: 'bold',
              }}>
              ↪ Redo ({editor.redoStack.length})
            </button>
          </div>
        </div>
        <div style={{
          background: '#f5f5f5', padding: 12, borderRadius: 6,
          fontFamily: 'monospace', fontSize: 15, minHeight: 60, wordBreak: 'break-all',
          border: '1px solid #ddd',
        }}>
          {editor.text || <span style={{ color: '#aaa' }}>(빈 텍스트)</span>}
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
          길이: {editor.text.length}자
        </div>
      </div>

      {/* Command 실행 패널 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>

        {/* 삽입 명령 */}
        <div style={{ background: '#e3f2fd', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, color: '#1976d2', marginBottom: 8 }}>
            InsertCommand
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <div>
              <label style={{ fontSize: 11, color: '#888' }}>위치</label>
              <input type="number" value={insertPos} onChange={e => setInsertPos(Number(e.target.value))}
                min={0} max={editor.text.length}
                style={{ display: 'block', width: 50, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4 }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#888' }}>삽입할 텍스트</label>
              <input value={insertText} onChange={e => setInsertText(e.target.value)}
                style={{ display: 'block', width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
          </div>
          <button
            onClick={() => editor.execute(insertCommand(insertPos, insertText))}
            disabled={!insertText}
            style={{ width: '100%', padding: '8px', background: '#1976d2', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            삽입 실행
          </button>
        </div>

        {/* 삭제 명령 */}
        <div style={{ background: '#fce4ec', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, color: '#c62828', marginBottom: 8 }}>
            DeleteCommand
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <div>
              <label style={{ fontSize: 11, color: '#888' }}>위치</label>
              <input type="number" value={deletePos} onChange={e => setDeletePos(Number(e.target.value))}
                min={0}
                style={{ display: 'block', width: 50, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888' }}>길이</label>
              <input type="number" value={deleteLen} onChange={e => setDeleteLen(Number(e.target.value))}
                min={1}
                style={{ display: 'block', width: 50, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4 }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: 11, color: '#888' }}>삭제 미리보기</div>
              <code style={{ fontSize: 11, background: '#fff', padding: '3px 6px', borderRadius: 3, border: '1px solid #ddd' }}>
                "{editor.text.slice(deletePos, deletePos + deleteLen)}"
              </code>
            </div>
          </div>
          <button
            onClick={() => editor.execute(deleteCommand(deletePos, deleteLen, editor.text))}
            disabled={deletePos >= editor.text.length}
            style={{ width: '100%', padding: '8px', background: '#c62828', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            삭제 실행
          </button>
        </div>

        {/* 대문자 변환 */}
        <div style={{ background: '#f3e5f5', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, color: '#7b1fa2', marginBottom: 8 }}>
            UppercaseCommand
          </div>
          <button
            onClick={() => editor.execute(uppercaseCommand(editor.text))}
            style={{ width: '100%', padding: '8px', background: '#7b1fa2', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            전체 대문자 변환
          </button>
        </div>

        {/* 전체 교체 */}
        <div style={{ background: '#fff8e1', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, color: '#f57c00', marginBottom: 8 }}>
            ReplaceAllCommand
          </div>
          <button
            onClick={() => editor.execute(replaceAllCommand('새로운 텍스트가 입력됐습니다.', editor.text))}
            style={{ width: '100%', padding: '8px', background: '#f57c00', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            텍스트 전체 교체
          </button>
        </div>
      </div>

      {/* History 스택 시각화 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>
            history 스택 (Undo 가능) — {editor.history.length}개
          </div>
          {editor.history.length === 0 ? (
            <div style={{ fontSize: 11, color: '#aaa' }}>비어 있음</div>
          ) : (
            [...editor.history].reverse().map((cmd, i) => (
              <div key={cmd.id} style={{
                fontSize: 11, padding: '4px 8px', background: i === 0 ? '#e3f2fd' : '#f5f5f5',
                borderRadius: 4, marginBottom: 2, border: `1px solid ${i === 0 ? '#1976d2' : '#ddd'}`,
              }}>
                {i === 0 ? '← 최근' : ''} {cmd.description}
              </div>
            ))
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>
            redoStack (Redo 가능) — {editor.redoStack.length}개
          </div>
          {editor.redoStack.length === 0 ? (
            <div style={{ fontSize: 11, color: '#aaa' }}>비어 있음</div>
          ) : (
            [...editor.redoStack].reverse().map((cmd, i) => (
              <div key={cmd.id} style={{
                fontSize: 11, padding: '4px 8px', background: i === 0 ? '#e8f5e9' : '#f5f5f5',
                borderRadius: 4, marginBottom: 2, border: `1px solid ${i === 0 ? '#388e3c' : '#ddd'}`,
              }}>
                {i === 0 ? '← 최근' : ''} {cmd.description}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, fontSize: 13 }}>
        <strong>패턴 포인트:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li>각 편집 명령이 <code>execute/undo</code> 쌍을 가진 Command 객체로 캡슐화됨</li>
          <li><code>useCommandHistory()</code>가 Invoker — history/redoStack 두 스택으로 undo/redo 구현</li>
          <li>새 명령 실행 시 redoStack을 비운다 — 분기된 이력은 버린다</li>
          <li>DeleteCommand는 undo를 위해 삭제될 텍스트를 클로저로 캡처한다</li>
        </ul>
      </div>
    </div>
  )
}
