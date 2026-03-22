// ============================================================
// Command 패턴 - 텍스트 에디터 예시
//
// 역할 매핑:
//   Command         → EditorCommand (인터페이스)
//   ConcreteCommand → InsertCommand, DeleteCommand
//   Receiver        → TextBuffer (실제 작업을 수행하는 객체)
//   Invoker         → EditorHistory (명령을 실행하고 undo/redo 관리)
//
// 왜 이 패턴을 쓰는가?
//   요청(명령)을 객체로 캡슐화하면 실행 이력을 저장할 수 있고,
//   그 이력을 역방향으로 탐색해 undo/redo 기능을 구현할 수 있다.
//   명령을 내리는 쪽(Invoker)과 실제로 처리하는 쪽(Receiver)이 분리된다.
// ============================================================

// ── Command 인터페이스 ───────────────────────────────────────

/**
 * Command: 실행 가능한 작업의 계약
 * execute와 undo를 쌍으로 정의해야 취소 기능이 가능하다.
 */
export interface EditorCommand {
  execute(): void
  undo(): void
}

// ── Receiver ─────────────────────────────────────────────────

/**
 * Receiver: 실제 텍스트 편집 로직을 담은 버퍼
 * Command 객체들이 이 클래스의 메서드를 호출해 실제 작업을 수행한다.
 */
export class TextBuffer {
  // 현재 텍스트 내용
  private content: string = ''

  /** 지정한 위치에 텍스트를 삽입한다 */
  insert(position: number, text: string): void {
    // 문자열을 position 위치에서 자른 뒤 text를 끼워 넣는다
    this.content =
      this.content.slice(0, position) + text + this.content.slice(position)
  }

  /** 지정한 위치에서 length만큼 텍스트를 삭제한다 */
  delete(position: number, length: number): void {
    this.content =
      this.content.slice(0, position) + this.content.slice(position + length)
  }

  /** 현재 버퍼의 전체 내용을 반환한다 */
  getContent(): string {
    return this.content
  }

  /** 버퍼 길이를 반환한다 */
  getLength(): number {
    return this.content.length
  }
}

// ── ConcreteCommand 구현체들 ─────────────────────────────────

/**
 * ConcreteCommand: 텍스트 삽입 명령
 * execute는 삽입, undo는 삽입한 만큼 삭제한다.
 * 이처럼 execute와 undo가 서로 역방향 연산이어야 한다.
 */
export class InsertCommand implements EditorCommand {
  constructor(
    private readonly buffer: TextBuffer,
    private readonly position: number,
    private readonly text: string,
  ) {}

  execute(): void {
    this.buffer.insert(this.position, this.text)
  }

  undo(): void {
    // 삽입을 취소하려면 삽입된 위치에서 삽입한 길이만큼 삭제한다
    this.buffer.delete(this.position, this.text.length)
  }
}

/**
 * ConcreteCommand: 텍스트 삭제 명령
 * execute는 삭제, undo는 삭제한 텍스트를 원래 위치에 복원한다.
 * undo를 위해 삭제된 텍스트를 반드시 기억해야 한다.
 */
export class DeleteCommand implements EditorCommand {
  // undo 시 복원하기 위해 삭제된 원본 텍스트를 보관한다
  private deletedText: string = ''

  constructor(
    private readonly buffer: TextBuffer,
    private readonly position: number,
    private readonly length: number,
  ) {}

  execute(): void {
    // 삭제 전에 원본 텍스트를 저장해 두어야 undo가 가능하다
    this.deletedText = this.buffer
      .getContent()
      .slice(this.position, this.position + this.length)
    this.buffer.delete(this.position, this.length)
  }

  undo(): void {
    // 저장해 둔 원본 텍스트를 원래 위치에 다시 삽입한다
    this.buffer.insert(this.position, this.deletedText)
  }
}

// ── Invoker ──────────────────────────────────────────────────

/**
 * Invoker: 명령 실행 이력을 관리하고 undo/redo를 제공한다.
 *
 * 두 개의 스택(history, redoStack)으로 undo/redo를 구현하는 이유:
 *   - history: 실행된 명령을 순서대로 쌓는다 (undo 용)
 *   - redoStack: undo된 명령을 쌓는다 (redo 용)
 *   - 새 명령을 실행하면 redoStack을 비운다 (분기된 이력은 버린다)
 */
export class EditorHistory {
  // 실행된 명령들의 이력 스택
  private history: EditorCommand[] = []
  // undo된 명령들의 스택 (redo용)
  private redoStack: EditorCommand[] = []

  /** 명령을 실행하고 이력에 추가한다 */
  execute(command: EditorCommand): void {
    command.execute()
    this.history.push(command)
    // 새 명령 실행 시 redo 이력은 무효화된다
    // (새 분기가 생겼으므로 이전 redo 경로는 버린다)
    this.redoStack = []
  }

  /** 가장 최근 명령을 취소한다 */
  undo(): boolean {
    const command = this.history.pop()
    if (!command) return false // 취소할 명령이 없음

    command.undo()
    // undo된 명령은 redo 스택으로 이동
    this.redoStack.push(command)
    return true
  }

  /** undo된 명령을 다시 실행한다 */
  redo(): boolean {
    const command = this.redoStack.pop()
    if (!command) return false // 재실행할 명령이 없음

    command.execute()
    // redo된 명령은 다시 history 스택으로 이동
    this.history.push(command)
    return true
  }

  /** 현재 이력에 쌓인 명령 수를 반환한다 (테스트 검증용) */
  getHistorySize(): number {
    return this.history.length
  }

  /** redo 가능한 명령 수를 반환한다 (테스트 검증용) */
  getRedoSize(): number {
    return this.redoStack.length
  }
}
