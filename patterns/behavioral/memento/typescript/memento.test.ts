/**
 * Memento 패턴 테스트
 *
 * 테스트 목표:
 * 1. 상태 저장 후 복원이 올바르게 동작하는지 확인
 * 2. 여러 스냅샷을 통해 여러 단계의 undo가 가능한지 확인
 * 3. undo 후 redo가 가능한지 확인
 * 4. 캡슐화 유지: EditorHistory가 스냅샷 내용을 모르는지 확인
 * 5. 히스토리가 없을 때 undo/redo가 안전하게 처리되는지 확인
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TextEditor, EditorHistory, EditorSnapshot } from './memento';

describe('Memento 패턴 — 텍스트 에디터', () => {
  let editor: TextEditor;
  let history: EditorHistory;

  beforeEach(() => {
    editor = new TextEditor();
    history = new EditorHistory(editor);
  });

  // -------------------------------------------------------------------------
  // 기본 저장 & 복원 테스트
  // -------------------------------------------------------------------------

  it('텍스트 입력 후 저장하고 복원할 수 있다', () => {
    history.backup(); // 빈 상태 저장
    editor.type('안녕하세요');

    expect(editor.getContent()).toBe('안녕하세요');

    history.undo(); // 빈 상태로 복원

    expect(editor.getContent()).toBe('');
  });

  it('여러 단계의 undo가 올바르게 동작한다', () => {
    // 단계별로 저장하면서 타이핑한다.
    history.backup();         // 상태: ''
    editor.type('Hello');
    history.backup();         // 상태: 'Hello'
    editor.type(' World');
    history.backup();         // 상태: 'Hello World'
    editor.type('!');

    expect(editor.getContent()).toBe('Hello World!');

    history.undo(); // 'Hello World'로 복원
    expect(editor.getContent()).toBe('Hello World');

    history.undo(); // 'Hello'로 복원
    expect(editor.getContent()).toBe('Hello');

    history.undo(); // ''로 복원
    expect(editor.getContent()).toBe('');
  });

  it('delete() 동작도 저장 및 복원된다', () => {
    editor.type('Hello');
    history.backup(); // 'Hello' 저장
    editor.delete();  // 'Hell'
    editor.delete();  // 'Hel'

    expect(editor.getContent()).toBe('Hel');

    history.undo(); // 'Hello'로 복원
    expect(editor.getContent()).toBe('Hello');
  });

  // -------------------------------------------------------------------------
  // redo 테스트
  // -------------------------------------------------------------------------

  it('undo 후 redo하면 앞으로 이동한다', () => {
    history.backup();     // ''
    editor.type('안녕');
    history.backup();     // '안녕'
    editor.type('하세요');

    history.undo(); // '안녕'으로
    expect(editor.getContent()).toBe('안녕');

    history.redo(); // '안녕하세요'로
    expect(editor.getContent()).toBe('안녕하세요');
  });

  it('새 작업을 backup()으로 등록하면 redo 스택이 초기화된다', () => {
    history.backup();     // ''
    editor.type('A');
    history.backup();     // 'A'
    editor.type('B');

    history.undo(); // 'A'로 복원, redo 스택에 'AB'가 쌓임
    expect(history.getRedoCount()).toBe(1);

    // 새 작업을 시작하면서 backup()을 호출한다 → redo 스택이 초기화된다.
    editor.type('C'); // 에디터 내용 변경
    history.backup(); // 새 상태('AC')를 저장 — 이 시점에 redo 스택 초기화

    const redoResult = history.redo();
    // redo 스택이 비어있으므로 false를 반환해야 한다.
    expect(redoResult).toBe(false);
    expect(editor.getContent()).toBe('AC');
  });

  // -------------------------------------------------------------------------
  // 히스토리가 없을 때 테스트
  // -------------------------------------------------------------------------

  it('히스토리가 없을 때 undo는 false를 반환한다', () => {
    const result = history.undo();

    expect(result).toBe(false);
    expect(editor.getContent()).toBe('');
  });

  it('redo 스택이 없을 때 redo는 false를 반환한다', () => {
    const result = history.redo();

    expect(result).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 히스토리 카운트 테스트
  // -------------------------------------------------------------------------

  it('backup() 호출 횟수만큼 히스토리가 쌓인다', () => {
    expect(history.getHistoryCount()).toBe(0);

    history.backup();
    expect(history.getHistoryCount()).toBe(1);

    history.backup();
    expect(history.getHistoryCount()).toBe(2);
  });

  it('undo 후 redo 카운트가 증가한다', () => {
    history.backup();
    editor.type('A');
    history.backup();
    editor.type('B');

    expect(history.getRedoCount()).toBe(0);

    history.undo();
    expect(history.getRedoCount()).toBe(1);

    history.undo();
    expect(history.getRedoCount()).toBe(2);
  });

  // -------------------------------------------------------------------------
  // 캡슐화 유지 테스트
  // -------------------------------------------------------------------------

  it('EditorSnapshot이 불변 데이터를 올바르게 반환한다', () => {
    editor.type('캡슐화 테스트');
    const snapshot = editor.save();

    // Snapshot은 저장된 값을 올바르게 반환해야 한다.
    expect(snapshot.getContent()).toBe('캡슐화 테스트');
    expect(snapshot.getCursorPosition()).toBe('캡슐화 테스트'.length);
    // 타임스탬프가 Date 객체인지 확인한다.
    expect(snapshot.getTimestamp()).toBeInstanceOf(Date);
  });

  it('커서 위치도 함께 저장되고 복원된다', () => {
    editor.type('Hello');

    expect(editor.getCursorPosition()).toBe(5);

    history.backup();
    editor.type(' World');

    expect(editor.getCursorPosition()).toBe(11);

    history.undo();

    // 커서 위치도 'Hello' 입력 후 상태로 복원되어야 한다.
    expect(editor.getCursorPosition()).toBe(5);
    expect(editor.getContent()).toBe('Hello');
  });

  it('EditorSnapshot 클래스는 직접 생성할 수 있다 (Originator가 독점하지 않음)', () => {
    // TypeScript에서는 접근 제어가 컴파일 타임에만 적용되므로
    // 이 테스트는 Snapshot 자체의 동작을 검증한다.
    const snapshot = new EditorSnapshot('테스트 내용', 7);
    expect(snapshot.getContent()).toBe('테스트 내용');
    expect(snapshot.getCursorPosition()).toBe(7);
  });
});
