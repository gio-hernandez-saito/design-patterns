/**
 * Memento 패턴
 *
 * 목적: 객체의 내부 상태를 캡슐화해서 저장하고,
 *       나중에 그 상태로 되돌릴 수 있게 한다 (undo/redo).
 *
 * 핵심 아이디어:
 * - Originator(원본 객체)의 내부 상태를 Memento 객체에 복사해 보관한다.
 * - Memento는 Originator만 접근할 수 있는 상태를 갖고 있어서 외부에서 변경하지 못한다.
 * - Caretaker(관리자)는 Memento를 보관하지만 내부 내용은 알 수 없다 → 캡슐화 유지.
 *
 * 역할 매핑:
 * - Originator → TextEditor 클래스 (상태를 갖고 Memento를 생성/복원하는 객체)
 * - Memento    → EditorSnapshot 클래스 (특정 시점의 상태를 담는 불변 객체)
 * - Caretaker  → EditorHistory 클래스 (Memento들을 순서대로 관리하는 스택)
 */

// =============================================================================
// Memento 클래스
// =============================================================================

/**
 * 특정 시점의 에디터 상태를 담는 불변 스냅샷 — Memento.
 *
 * 왜 불변(readonly)으로 만드는가?
 * 한 번 저장된 스냅샷이 나중에 변경되면 복원 기능이 신뢰를 잃기 때문이다.
 * 스냅샷은 찍힌 순간의 상태를 그대로 보존해야 한다.
 */
export class EditorSnapshot {
  // readonly로 선언해 외부에서 변경하지 못하게 막는다.
  private readonly _content: string;
  private readonly _cursorPosition: number;
  private readonly _timestamp: Date;

  /**
   * @param content 저장할 텍스트 내용
   * @param cursorPosition 저장할 커서 위치
   */
  constructor(content: string, cursorPosition: number) {
    this._content = content;
    this._cursorPosition = cursorPosition;
    // 스냅샷이 언제 생성됐는지 기록해두면 히스토리 추적에 유용하다.
    this._timestamp = new Date();
  }

  /**
   * 저장된 텍스트 내용을 반환한다.
   * Originator(TextEditor)만 이 값을 사용해 상태를 복원한다.
   */
  public getContent(): string {
    return this._content;
  }

  /**
   * 저장된 커서 위치를 반환한다.
   */
  public getCursorPosition(): number {
    return this._cursorPosition;
  }

  /**
   * 스냅샷이 생성된 시간을 반환한다.
   */
  public getTimestamp(): Date {
    return this._timestamp;
  }
}

// =============================================================================
// Originator 클래스
// =============================================================================

/**
 * 텍스트 에디터 — Originator.
 *
 * 현재 상태(텍스트 내용, 커서 위치)를 갖고 있으며,
 * 스냅샷 생성(save)과 스냅샷으로부터 복원(restore)을 책임진다.
 *
 * Caretaker(EditorHistory)는 이 클래스가 만든 스냅샷을 보관만 하고,
 * 복원은 반드시 이 클래스의 restore()를 통해서만 이루어진다.
 */
export class TextEditor {
  // 현재 편집 중인 텍스트 내용
  private content: string;
  // 현재 커서가 위치한 인덱스
  private cursorPosition: number;

  constructor(initialContent: string = '') {
    this.content = initialContent;
    this.cursorPosition = initialContent.length;
  }

  /**
   * 텍스트 끝에 내용을 추가한다.
   */
  public type(text: string): void {
    // 커서 이전 텍스트 + 새 텍스트 + 커서 이후 텍스트 형태로 삽입한다.
    this.content =
      this.content.slice(0, this.cursorPosition) +
      text +
      this.content.slice(this.cursorPosition);
    this.cursorPosition += text.length;
  }

  /**
   * 커서 앞의 문자를 하나 삭제한다 (Backspace 동작).
   */
  public delete(): void {
    if (this.cursorPosition === 0) return;
    this.content =
      this.content.slice(0, this.cursorPosition - 1) +
      this.content.slice(this.cursorPosition);
    this.cursorPosition -= 1;
  }

  /**
   * 현재 상태를 스냅샷으로 저장해 반환한다.
   *
   * 이 메서드를 호출하는 것이 Memento 패턴의 "저장" 단계다.
   * Originator만이 자신의 내부 상태를 Memento에 올바르게 담을 수 있다.
   *
   * @returns 현재 상태를 담은 EditorSnapshot
   */
  public save(): EditorSnapshot {
    return new EditorSnapshot(this.content, this.cursorPosition);
  }

  /**
   * 스냅샷으로부터 상태를 복원한다.
   *
   * 이 메서드를 호출하는 것이 Memento 패턴의 "복원" 단계다.
   * Caretaker가 어떤 Memento를 줄지 결정하고, 실제 복원 작업은 여기서 한다.
   *
   * @param snapshot 복원할 상태가 담긴 스냅샷
   */
  public restore(snapshot: EditorSnapshot): void {
    this.content = snapshot.getContent();
    this.cursorPosition = snapshot.getCursorPosition();
  }

  /** 현재 텍스트 내용을 반환한다 */
  public getContent(): string {
    return this.content;
  }

  /** 현재 커서 위치를 반환한다 */
  public getCursorPosition(): number {
    return this.cursorPosition;
  }
}

// =============================================================================
// Caretaker 클래스
// =============================================================================

/**
 * 에디터 히스토리 관리자 — Caretaker.
 *
 * Memento(스냅샷)들을 스택으로 관리한다.
 * "무엇을 저장했는지"는 알지만 "저장된 내용이 무엇인지"는 모른다.
 * → 이것이 Memento 패턴의 캡슐화 원칙이다.
 *
 * 스택 방식을 사용하는 이유:
 * undo는 항상 "가장 최근 상태"로 돌아가야 하기 때문이다.
 * LIFO(후입선출) 구조인 스택이 이 요구사항에 완벽히 맞는다.
 */
export class EditorHistory {
  // 스냅샷들을 순서대로 저장하는 스택
  private history: EditorSnapshot[] = [];
  // 복원 후 다시 앞으로 이동할 수 있도록 redo 스택도 관리한다
  private redoStack: EditorSnapshot[] = [];
  // 히스토리를 관리할 에디터 참조
  private editor: TextEditor;

  constructor(editor: TextEditor) {
    this.editor = editor;
  }

  /**
   * 현재 에디터 상태를 히스토리에 저장한다.
   * 새 작업을 하면 redo 스택은 의미가 없어지므로 초기화한다.
   */
  public backup(): void {
    this.history.push(this.editor.save());
    // 새 작업을 했으므로 이전의 redo 히스토리는 더 이상 유효하지 않다.
    this.redoStack = [];
  }

  /**
   * 이전 상태로 되돌린다 (undo).
   * 히스토리가 없으면 아무것도 하지 않는다.
   *
   * @returns 복원에 성공하면 true, 히스토리가 없으면 false
   */
  public undo(): boolean {
    if (this.history.length === 0) {
      return false;
    }

    // 현재 상태를 redo 스택에 저장해두고
    this.redoStack.push(this.editor.save());

    // 가장 최근 스냅샷을 꺼내서 복원한다.
    const snapshot = this.history.pop()!;
    this.editor.restore(snapshot);
    return true;
  }

  /**
   * undo를 취소하고 앞으로 이동한다 (redo).
   *
   * @returns 복원에 성공하면 true, redo 스택이 없으면 false
   */
  public redo(): boolean {
    if (this.redoStack.length === 0) {
      return false;
    }

    // 현재 상태를 히스토리에 다시 넣고
    this.history.push(this.editor.save());

    // redo 스택의 최신 스냅샷으로 복원한다.
    const snapshot = this.redoStack.pop()!;
    this.editor.restore(snapshot);
    return true;
  }

  /**
   * 저장된 히스토리 개수를 반환한다.
   */
  public getHistoryCount(): number {
    return this.history.length;
  }

  /**
   * redo 가능한 스냅샷 개수를 반환한다.
   */
  public getRedoCount(): number {
    return this.redoStack.length;
  }
}
