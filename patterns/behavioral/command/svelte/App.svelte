<script lang="ts">
  // ─────────────────────────────────────────────────────────────────────────────
  // Command 패턴 — Svelte 5 runes 구현
  //
  // 역할 매핑:
  //   CommandRecord 타입          → Command 인터페이스 (execute + undo)
  //   historyStack ($state)       → Invoker (EditorHistory) — 실행 이력 스택
  //   redoStack ($state)          → redo용 스택
  //   content ($state)            → Receiver (TextBuffer) 상태
  //   executeCommand()            → Invoker.execute()
  //   undo() / redo()             → Invoker.undo() / redo()
  //
  // 핵심 아이디어:
  //   TypeScript에서는 EditorHistory 클래스가 Command 객체를 스택에 쌓았지만,
  //   Svelte에서는 각 명령을 {execute, undo} 함수 쌍을 담은 객체로 저장한다.
  //   $state 배열이 Invoker의 history/redoStack 역할을 한다.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Receiver: 텍스트 버퍼 ($state) ───────────────────────────────────────
  let content = $state('')

  // ── Command 타입: execute + undo 쌍 ──────────────────────────────────────
  interface CommandRecord {
    label: string
    execute: () => void
    undo: () => void
  }

  // ── Invoker: 이력 스택 ($state) ──────────────────────────────────────────
  // TypeScript의 EditorHistory 클래스의 history/redoStack 필드에 해당
  let historyStack = $state<CommandRecord[]>([])
  let redoStack = $state<CommandRecord[]>([])

  // ── Invoker.execute(): 명령 실행 및 이력 저장 ────────────────────────────
  function executeCommand(cmd: CommandRecord) {
    cmd.execute()
    historyStack = [...historyStack, cmd]
    // 새 명령 실행 시 redo 이력 무효화 (분기된 이력 제거)
    redoStack = []
  }

  // ── Invoker.undo(): 마지막 명령 취소 ─────────────────────────────────────
  function undo() {
    if (historyStack.length === 0) return
    const cmd = historyStack[historyStack.length - 1]
    cmd.undo()
    historyStack = historyStack.slice(0, -1)
    redoStack = [...redoStack, cmd]
  }

  // ── Invoker.redo(): 취소된 명령 재실행 ───────────────────────────────────
  function redo() {
    if (redoStack.length === 0) return
    const cmd = redoStack[redoStack.length - 1]
    cmd.execute()
    redoStack = redoStack.slice(0, -1)
    historyStack = [...historyStack, cmd]
  }

  // ── $derived: 상태 계산 ───────────────────────────────────────────────────
  let canUndo = $derived(historyStack.length > 0)
  let canRedo = $derived(redoStack.length > 0)

  // ── ConcreteCommand 팩토리 함수들 ─────────────────────────────────────────

  // 삽입 명령 생성 (InsertCommand)
  function createInsertCommand(position: number, text: string): CommandRecord {
    return {
      label: `삽입 "${text}" @${position}`,
      execute() {
        // TextBuffer.insert(): position에 text 삽입
        content = content.slice(0, position) + text + content.slice(position)
      },
      undo() {
        // 삽입 취소: 삽입한 만큼 삭제
        content = content.slice(0, position) + content.slice(position + text.length)
      },
    }
  }

  // 삭제 명령 생성 (DeleteCommand)
  function createDeleteCommand(position: number, length: number): CommandRecord {
    // undo를 위해 삭제될 텍스트를 명령 생성 시점에 캡처한다
    const deletedText = content.slice(position, position + length)
    return {
      label: `삭제 "${deletedText}" @${position}`,
      execute() {
        content = content.slice(0, position) + content.slice(position + length)
      },
      undo() {
        // 저장해 둔 원본 텍스트를 원래 위치에 복원
        content = content.slice(0, position) + deletedText + content.slice(position)
      },
    }
  }

  // 전체 교체 명령 (Replace)
  function createReplaceCommand(from: string, to: string): CommandRecord {
    const prev = content
    return {
      label: `교체 "${from}" → "${to}"`,
      execute() {
        content = prev.replaceAll(from, to)
      },
      undo() {
        content = prev
      },
    }
  }

  // ── 데모 UI 상태 ─────────────────────────────────────────────────────────
  let insertText = $state('안녕하세요')
  let insertPos = $state(0)
  let deleteLen = $state(3)
  let replaceFrom = $state('')
  let replaceTo = $state('')

  function doInsert() {
    if (!insertText) return
    const pos = Math.min(insertPos, content.length)
    executeCommand(createInsertCommand(pos, insertText))
  }

  function doDelete() {
    if (content.length === 0) return
    const pos = Math.min(insertPos, content.length - 1)
    const len = Math.min(deleteLen, content.length - pos)
    if (len <= 0) return
    executeCommand(createDeleteCommand(pos, len))
  }

  function doReplace() {
    if (!replaceFrom) return
    executeCommand(createReplaceCommand(replaceFrom, replaceTo))
  }

  // 빠른 데모 액션
  function loadDemo() {
    content = ''
    historyStack = []
    redoStack = []
    executeCommand(createInsertCommand(0, 'Hello, World!'))
    executeCommand(createInsertCommand(13, ' Svelte 5'))
    executeCommand(createReplaceCommand('Hello', '안녕하세요'))
  }
</script>

<main>
  <h1>Command 패턴</h1>
  <p class="desc">
    각 편집 동작을 <code>&#123;execute, undo&#125;</code> 쌍으로 캡슐화한다.
    <code>$state</code> 스택이 Invoker 역할을 하며 undo/redo를 지원한다.
  </p>

  <div class="layout">
    <!-- 텍스트 에디터 (Receiver) -->
    <section class="card">
      <h2>텍스트 에디터 (Receiver)</h2>
      <textarea
        class="editor"
        bind:value={content}
        rows="5"
        placeholder="직접 타이핑하거나 아래 명령을 실행하세요..."
      ></textarea>

      <!-- Undo/Redo 버튼 -->
      <div class="undo-redo">
        <button class="btn-undo" onclick={undo} disabled={!canUndo}>
          ↩ Undo ({historyStack.length})
        </button>
        <button class="btn-redo" onclick={redo} disabled={!canRedo}>
          Redo ({redoStack.length}) ↪
        </button>
        <button class="btn-demo" onclick={loadDemo}>데모 실행</button>
      </div>

      <!-- 커맨드 실행 폼 -->
      <div class="cmd-forms">
        <div class="cmd-form">
          <h3>삽입 명령</h3>
          <div class="form-row">
            <label>위치: <input type="number" bind:value={insertPos} min="0" style="width:60px" /></label>
            <label>텍스트: <input bind:value={insertText} placeholder="삽입할 텍스트" /></label>
            <button class="btn-cmd" onclick={doInsert}>삽입</button>
          </div>
        </div>
        <div class="cmd-form">
          <h3>삭제 명령</h3>
          <div class="form-row">
            <label>위치: <input type="number" bind:value={insertPos} min="0" style="width:60px" /></label>
            <label>길이: <input type="number" bind:value={deleteLen} min="1" style="width:60px" /></label>
            <button class="btn-cmd btn-delete" onclick={doDelete}>삭제</button>
          </div>
        </div>
        <div class="cmd-form">
          <h3>교체 명령</h3>
          <div class="form-row">
            <label>찾기: <input bind:value={replaceFrom} placeholder="원본 텍스트" /></label>
            <label>바꾸기: <input bind:value={replaceTo} placeholder="새 텍스트" /></label>
            <button class="btn-cmd btn-replace" onclick={doReplace}>교체</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Invoker: 이력 스택 시각화 -->
    <section class="card">
      <h2>Invoker — 명령 이력 스택</h2>

      <div class="stacks">
        <div class="stack-col">
          <div class="stack-title">실행 이력 (history)</div>
          {#if historyStack.length === 0}
            <div class="stack-empty">비어있음</div>
          {:else}
            {#each [...historyStack].reverse() as cmd, i}
              <div class="stack-item" class:top={i === 0}>
                {#if i === 0}<span class="top-badge">TOP</span>{/if}
                <span class="cmd-label">{cmd.label}</span>
              </div>
            {/each}
          {/if}
        </div>
        <div class="stack-col">
          <div class="stack-title">Redo 스택</div>
          {#if redoStack.length === 0}
            <div class="stack-empty">비어있음</div>
          {:else}
            {#each [...redoStack].reverse() as cmd, i}
              <div class="stack-item redo" class:top={i === 0}>
                {#if i === 0}<span class="top-badge">TOP</span>{/if}
                <span class="cmd-label">{cmd.label}</span>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <div class="cmd-explain">
        <h3>Command 패턴 흐름</h3>
        <div class="flow">
          <div class="flow-step">UI<br/><span>Invoker</span></div>
          <div class="flow-arrow">→</div>
          <div class="flow-step">execute()<br/><span>Command</span></div>
          <div class="flow-arrow">→</div>
          <div class="flow-step">content<br/><span>Receiver</span></div>
        </div>
        <div class="flow">
          <div class="flow-step">undo 버튼<br/><span>Invoker</span></div>
          <div class="flow-arrow">→</div>
          <div class="flow-step">undo()<br/><span>Command</span></div>
          <div class="flow-arrow">→</div>
          <div class="flow-step">content 복원<br/><span>Receiver</span></div>
        </div>
      </div>
    </section>
  </div>

  <div class="explanation">
    <h3>TypeScript vs Svelte 구현 차이</h3>
    <ul>
      <li><strong>TS:</strong> <code>EditorHistory</code> 클래스가 <code>EditorCommand[]</code> 스택 관리</li>
      <li><strong>Svelte:</strong> <code>$state</code> 배열이 이력 스택 역할, 명령은 <code>&#123;execute, undo&#125;</code> 객체 리터럴</li>
      <li><strong>Receiver:</strong> <code>TextBuffer</code> 클래스 → <code>$state content</code> 문자열로 단순화</li>
    </ul>
  </div>
</main>

<style>
  main { font-family: sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
  h1 { color: #0891b2; margin-bottom: 0.25rem; }
  .desc { color: #64748b; margin-bottom: 1.5rem; }
  .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; }
  h2 { font-size: 1rem; margin-top: 0; color: #374151; }
  h3 { font-size: 0.85rem; color: #374151; margin: 0.75rem 0 0.4rem; }
  .editor {
    width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid #cbd5e1;
    border-radius: 8px; font-size: 0.9rem; font-family: monospace; resize: vertical;
  }
  .undo-redo { display: flex; gap: 0.5rem; margin: 0.75rem 0; }
  .btn-undo { background: #3b82f6; color: white; border: none; padding: 0.45rem 0.9rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
  .btn-undo:disabled { background: #94a3b8; cursor: not-allowed; }
  .btn-redo { background: #8b5cf6; color: white; border: none; padding: 0.45rem 0.9rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
  .btn-redo:disabled { background: #94a3b8; cursor: not-allowed; }
  .btn-demo { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 0.45rem 0.9rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; margin-left: auto; }
  .cmd-forms { display: flex; flex-direction: column; gap: 0.5rem; }
  .cmd-form { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.6rem 0.75rem; }
  .form-row { display: flex; gap: 0.5rem; align-items: flex-end; flex-wrap: wrap; }
  label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.82rem; color: #374151; }
  input { padding: 0.35rem 0.5rem; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 0.85rem; }
  .btn-cmd { background: #0891b2; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.82rem; align-self: flex-end; }
  .btn-delete { background: #ef4444; }
  .btn-replace { background: #f59e0b; }
  .stacks { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; }
  .stack-col { }
  .stack-title { font-size: 0.82rem; font-weight: 600; color: #374151; margin-bottom: 0.4rem; }
  .stack-empty { font-size: 0.78rem; color: #94a3b8; background: #f8fafc; border: 1px dashed #e2e8f0; border-radius: 6px; padding: 0.5rem; text-align: center; }
  .stack-item {
    background: white; border: 1px solid #e2e8f0; border-radius: 6px;
    padding: 0.4rem 0.6rem; margin-bottom: 0.3rem; font-size: 0.78rem; position: relative;
  }
  .stack-item.top { border-color: #0891b2; background: #e0f2fe; }
  .stack-item.redo { border-color: #e2e8f0; }
  .stack-item.redo.top { border-color: #8b5cf6; background: #ede9fe; }
  .top-badge { font-size: 0.68rem; background: #0891b2; color: white; padding: 0.05rem 0.3rem; border-radius: 3px; margin-right: 0.3rem; }
  .stack-item.redo.top .top-badge { background: #8b5cf6; }
  .cmd-label { word-break: break-all; }
  .cmd-explain { margin-top: 0.5rem; }
  .flow { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem; }
  .flow-step {
    flex: 1; text-align: center; background: white; border: 1px solid #e2e8f0;
    border-radius: 6px; padding: 0.4rem; font-size: 0.78rem; font-weight: 600;
  }
  .flow-step span { display: block; font-size: 0.68rem; color: #94a3b8; font-weight: 400; margin-top: 0.15rem; }
  .flow-arrow { color: #94a3b8; font-size: 1rem; }
  code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.8rem; }
  .explanation { margin-top: 2rem; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.9rem; }
  .explanation ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
  .explanation li { margin-bottom: 0.4rem; }
</style>
