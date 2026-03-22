<script setup lang="ts">
/**
 * Command 패턴 — Vue 구현
 *
 * Vue에서의 역할 매핑:
 *   useTextEditor() (composable) → Invoker + Receiver 통합: 명령 실행/undo/redo 관리
 *   Command 인터페이스           → { execute, undo, description } 객체 타입
 *   InsertCommand / DeleteCommand → reactive 히스토리 배열에 저장되는 Command 객체
 *   ref(content)                 → Receiver: 실제 텍스트 상태 (TextBuffer 역할)
 *   history / redoStack (ref)    → 두 개의 스택으로 undo/redo 구현
 *
 * 왜 이렇게 구현하는가?
 *   TypeScript 버전의 EditorHistory(Invoker)와 TextBuffer(Receiver)를
 *   Vue에서는 useTextEditor() composable 하나로 통합한다.
 *   reactive 히스토리 배열과 ref(content)가 즉시 화면에 반영되어
 *   undo/redo 동작을 시각적으로 확인할 수 있다.
 */

import { ref, computed } from 'vue'

// ─── Command 타입 ─────────────────────────────────────────────────────────────
interface EditorCommand {
  execute(): void
  undo(): void
  description: string  // UI에 표시할 설명
}

// ─── useTextEditor: Invoker + Receiver 통합 composable ───────────────────────
/**
 * 텍스트 에디터 composable.
 *
 * content가 Receiver(TextBuffer) 역할, history/redoStack이 Invoker 역할을 한다.
 * Vue에서 두 클래스를 하나의 composable로 자연스럽게 통합할 수 있다.
 */
function useTextEditor(initialContent = '') {
  // Receiver: 실제 텍스트 상태 (TypeScript 버전의 TextBuffer.content)
  const content = ref(initialContent)

  // Invoker: 실행된 명령 스택 (undo용)
  const history = ref<EditorCommand[]>([])
  // Invoker: undo된 명령 스택 (redo용)
  const redoStack = ref<EditorCommand[]>([])

  /** 명령을 생성하고 실행한다 */
  function execute(command: EditorCommand) {
    command.execute()
    history.value.push(command)
    // 새 명령 실행 시 redo 이력은 무효화한다
    // (분기된 이력은 버린다 — TypeScript 버전과 동일 로직)
    redoStack.value = []
  }

  /** 텍스트 삽입 명령 생성 + 실행 */
  function insert(position: number, text: string) {
    // 명령 객체를 직접 생성한다 (TypeScript 버전의 InsertCommand와 동일)
    const command: EditorCommand = {
      description: `삽입: "${text}" @ ${position}`,
      execute() { content.value = content.value.slice(0, position) + text + content.value.slice(position) },
      // undo: 삽입된 위치에서 삽입한 길이만큼 삭제
      undo() { content.value = content.value.slice(0, position) + content.value.slice(position + text.length) },
    }
    execute(command)
  }

  /** 텍스트 삭제 명령 생성 + 실행 */
  function deleteText(position: number, length: number) {
    // undo를 위해 삭제될 텍스트를 미리 캡처한다
    // TypeScript 버전의 DeleteCommand.deletedText와 동일
    const deletedText = content.value.slice(position, position + length)
    const command: EditorCommand = {
      description: `삭제: "${deletedText}" @ ${position}`,
      execute() { content.value = content.value.slice(0, position) + content.value.slice(position + length) },
      // undo: 삭제된 텍스트를 원래 위치에 복원
      undo() { content.value = content.value.slice(0, position) + deletedText + content.value.slice(position) },
    }
    execute(command)
  }

  function undo() {
    const command = history.value.pop()
    if (!command) return
    command.undo()
    redoStack.value.push(command)
  }

  function redo() {
    const command = redoStack.value.pop()
    if (!command) return
    command.execute()
    history.value.push(command)
  }

  const canUndo = computed(() => history.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  return { content, history, redoStack, insert, deleteText, undo, redo, canUndo, canRedo }
}

// ─── 인스턴스화 ───────────────────────────────────────────────────────────────
const editor = useTextEditor('안녕하세요! Vue Command 패턴 데모입니다.')

// ─── 삽입 UI 상태 ─────────────────────────────────────────────────────────────
const insertPos = ref(0)
const insertText = ref('(삽입된 텍스트)')

// ─── 삭제 UI 상태 ─────────────────────────────────────────────────────────────
const deletePos = ref(0)
const deleteLen = ref(5)

function doInsert() {
  const pos = Math.max(0, Math.min(insertPos.value, editor.content.value.length))
  editor.insert(pos, insertText.value)
}

function doDelete() {
  const pos = Math.max(0, Math.min(deletePos.value, editor.content.value.length))
  const len = Math.min(deleteLen.value, editor.content.value.length - pos)
  if (len > 0) editor.deleteText(pos, len)
}

// 텍스트에서 특정 위치를 하이라이트하기 위한 변환
function highlightContent(text: string) {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
</script>

<template>
  <div style="font-family: sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem;">
    <h1 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">Command 패턴</h1>
    <p style="color: #555;">
      각 편집 동작이 <code>execute/undo</code> 쌍을 가진 Command 객체로 캡슐화된다.
      <code>history</code>와 <code>redoStack</code> 두 개의 스택으로 undo/redo를 구현한다.
    </p>

    <!-- 에디터 -->
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
      <h3 style="margin-top: 0;">텍스트 에디터 (Receiver: TextBuffer)</h3>
      <div style="background: #f5f5f5; border-radius: 4px; padding: 1rem; font-family: monospace; font-size: 0.9rem; word-break: break-all; min-height: 60px; border: 1px solid #ddd; margin-bottom: 1rem;">
        {{ editor.content.value || '(빈 텍스트)' }}
      </div>
      <div style="font-size: 0.8rem; color: #888;">길이: {{ editor.content.value.length }}자</div>
    </div>

    <!-- 명령 실행 컨트롤 -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
      <!-- 삽입 명령 -->
      <div style="border: 1px solid #bee3f8; border-radius: 8px; padding: 1rem; background: #ebf8ff;">
        <h4 style="margin-top: 0; color: #2b6cb0;">InsertCommand</h4>
        <div style="margin-bottom: 0.5rem;">
          <label style="font-size: 0.8rem; font-weight: bold;">삽입 위치</label>
          <input type="number" v-model="insertPos" min="0" :max="editor.content.value.length"
            style="width: 100%; box-sizing: border-box; padding: 5px; border: 1px solid #bee3f8; border-radius: 4px; margin-top: 2px;" />
        </div>
        <div style="margin-bottom: 0.75rem;">
          <label style="font-size: 0.8rem; font-weight: bold;">삽입할 텍스트</label>
          <input v-model="insertText"
            style="width: 100%; box-sizing: border-box; padding: 5px; border: 1px solid #bee3f8; border-radius: 4px; margin-top: 2px;" />
        </div>
        <button @click="doInsert"
          style="width: 100%; padding: 7px; background: #2b6cb0; color: white; border: none; border-radius: 4px; cursor: pointer;">
          execute(InsertCommand)
        </button>
      </div>

      <!-- 삭제 명령 -->
      <div style="border: 1px solid #fc8181; border-radius: 8px; padding: 1rem; background: #fff5f5;">
        <h4 style="margin-top: 0; color: #c53030;">DeleteCommand</h4>
        <div style="margin-bottom: 0.5rem;">
          <label style="font-size: 0.8rem; font-weight: bold;">삭제 시작 위치</label>
          <input type="number" v-model="deletePos" min="0" :max="editor.content.value.length"
            style="width: 100%; box-sizing: border-box; padding: 5px; border: 1px solid #fc8181; border-radius: 4px; margin-top: 2px;" />
        </div>
        <div style="margin-bottom: 0.75rem;">
          <label style="font-size: 0.8rem; font-weight: bold;">삭제 길이</label>
          <input type="number" v-model="deleteLen" min="1"
            style="width: 100%; box-sizing: border-box; padding: 5px; border: 1px solid #fc8181; border-radius: 4px; margin-top: 2px;" />
          <div style="font-size: 0.75rem; color: #888; margin-top: 2px;">
            미리보기: "{{ editor.content.value.slice(deletePos, deletePos + deleteLen) }}"
          </div>
        </div>
        <button @click="doDelete"
          style="width: 100%; padding: 7px; background: #c53030; color: white; border: none; border-radius: 4px; cursor: pointer;">
          execute(DeleteCommand)
        </button>
      </div>
    </div>

    <!-- Undo / Redo (Invoker) -->
    <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
      <button @click="editor.undo()" :disabled="!editor.canUndo.value"
        :style="{
          flex: 1, padding: '10px', cursor: editor.canUndo.value ? 'pointer' : 'not-allowed',
          borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem',
          background: editor.canUndo.value ? '#fffbeb' : '#f5f5f5',
          color: editor.canUndo.value ? '#744210' : '#aaa',
        }">
        ↩ Undo ({{ editor.history.value.length }}개 남음)
      </button>
      <button @click="editor.redo()" :disabled="!editor.canRedo.value"
        :style="{
          flex: 1, padding: '10px', cursor: editor.canRedo.value ? 'pointer' : 'not-allowed',
          borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem',
          background: editor.canRedo.value ? '#f0fff4' : '#f5f5f5',
          color: editor.canRedo.value ? '#276749' : '#aaa',
        }">
        ↪ Redo ({{ editor.redoStack.value.length }}개 남음)
      </button>
    </div>

    <!-- 명령 히스토리 시각화 -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
      <div>
        <h4 style="margin-top: 0;">History 스택 (undo용)</h4>
        <div v-if="!editor.history.value.length" style="color: #888; font-size: 0.85rem; font-style: italic;">비어있음</div>
        <div v-for="(cmd, i) in [...editor.history.value].reverse()" :key="i"
          :style="{
            padding: '5px 8px', borderRadius: '4px', marginBottom: '4px',
            background: i === 0 ? '#fffbeb' : '#f5f5f5',
            border: i === 0 ? '1px solid #f6e05e' : '1px solid #eee',
            fontSize: '0.8rem', fontFamily: 'monospace',
          }">
          {{ i === 0 ? '▶ ' : '' }}{{ cmd.description }}
        </div>
      </div>
      <div>
        <h4 style="margin-top: 0;">Redo 스택 (redo용)</h4>
        <div v-if="!editor.redoStack.value.length" style="color: #888; font-size: 0.85rem; font-style: italic;">비어있음</div>
        <div v-for="(cmd, i) in [...editor.redoStack.value].reverse()" :key="i"
          style="padding: 5px 8px; border-radius: 4px; margin-bottom: 4px; background: #f0fff4; border: 1px solid #9ae6b4; font-size: 0.8rem; font-family: monospace;">
          {{ cmd.description }}
        </div>
      </div>
    </div>
  </div>
</template>
