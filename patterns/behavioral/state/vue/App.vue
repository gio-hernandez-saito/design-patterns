<script setup lang="ts">
/**
 * State 패턴 — Vue 구현
 *
 * Vue에서의 역할 매핑:
 *   currentState (ref)       → Context: 현재 상태를 가리키는 포인터
 *   StateHandler 인터페이스  → State 인터페이스: 각 상태에서 가능한 동작 정의
 *   states 객체              → ConcreteState 맵: 각 상태별 동작 구현
 *   reactive(machine)        → VendingMachine Context: 자판기 내부 데이터
 *   computed(availableActions) → 현재 상태에서 활성화된 버튼만 표시
 *
 * 왜 이렇게 구현하는가?
 *   TypeScript 버전의 상태별 클래스(IdleState, CoinInsertedState 등) 대신
 *   Vue에서는 상태 이름을 key로 하는 객체 맵으로 ConcreteState를 표현한다.
 *   currentState ref를 교체하면 Vue의 반응형 시스템이 UI를 자동으로 업데이트한다.
 *   computed로 현재 상태에서 가능한 동작만 버튼으로 표시해 상태 머신을 직관적으로 시각화한다.
 */

import { ref, reactive, computed } from 'vue'

// ─── 상태 타입 ────────────────────────────────────────────────────────────────
type StateName = 'idle' | 'coinInserted' | 'itemSelected' | 'dispensing'

// ─── Context: 자판기 내부 데이터 ──────────────────────────────────────────────
const machine = reactive({
  insertedAmount: 0,
  selectedItem: '',
  log: [] as string[],
})

// 현재 상태 — ref 교체가 "상태 전이"다
const currentState = ref<StateName>('idle')

function addLog(msg: string) {
  machine.log.unshift(`[${currentStateName.value}] ${msg}`)
}

function transitionTo(next: StateName) {
  const prev = currentState.value
  currentState.value = next
  machine.log.unshift(`↪ 상태 전이: ${stateLabels[prev]} → ${stateLabels[next]}`)
}

// ─── ConcreteState 맵 ─────────────────────────────────────────────────────────
// TypeScript 버전의 IdleState/CoinInsertedState/ItemSelectedState/DispensingState를
// 객체 맵으로 표현한다. 각 상태의 메서드가 machine 데이터와 상태 전이를 담당한다.

const stateLabels: Record<StateName, string> = {
  idle: '대기 중',
  coinInserted: '동전 투입됨',
  itemSelected: '상품 선택됨',
  dispensing: '배출 중',
}

const stateColors: Record<StateName, string> = {
  idle: '#718096',
  coinInserted: '#d69e2e',
  itemSelected: '#2b6cb0',
  dispensing: '#276749',
}

// 상품 목록
const items = ['콜라 (1000원)', '사이다 (900원)', '물 (500원)', '커피 (1500원)']
const selectedItemName = ref(items[0])
const coinAmount = ref(1000)

const states = {
  idle: {
    insertCoin(amount: number) {
      machine.insertedAmount += amount
      addLog(`${amount}원 투입됨. 총 ${machine.insertedAmount}원`)
      transitionTo('coinInserted')
    },
    selectItem() { addLog('오류: 먼저 동전을 투입해주세요.') },
    dispense() { addLog('오류: 동전을 먼저 투입해주세요.') },
    cancel() { addLog('취소할 내용이 없습니다.') },
  },
  coinInserted: {
    insertCoin(amount: number) {
      machine.insertedAmount += amount
      addLog(`추가 ${amount}원 투입됨. 총 ${machine.insertedAmount}원`)
    },
    selectItem(item: string) {
      machine.selectedItem = item
      addLog(`"${item}" 선택됨`)
      transitionTo('itemSelected')
    },
    dispense() { addLog('오류: 상품을 먼저 선택해주세요.') },
    cancel() {
      addLog(`${machine.insertedAmount}원 반환됨. 취소 완료.`)
      machine.insertedAmount = 0
      transitionTo('idle')
    },
  },
  itemSelected: {
    insertCoin() { addLog('오류: 이미 상품이 선택됐습니다.') },
    selectItem() { addLog('오류: 이미 상품이 선택됐습니다.') },
    dispense() {
      addLog(`"${machine.selectedItem}" 배출 중...`)
      transitionTo('dispensing')
      // 배출 상태에서 즉시 dispense() 호출
      setTimeout(() => states.dispensing.dispense(), 800)
    },
    cancel() {
      addLog(`${machine.insertedAmount}원 반환됨. 선택 취소.`)
      machine.insertedAmount = 0
      machine.selectedItem = ''
      transitionTo('idle')
    },
  },
  dispensing: {
    insertCoin() { addLog('오류: 배출 중입니다. 잠시 기다려주세요.') },
    selectItem() { addLog('오류: 배출 중입니다.') },
    dispense() {
      addLog(`"${machine.selectedItem}" 배출 완료!`)
      machine.insertedAmount = 0
      machine.selectedItem = ''
      transitionTo('idle')
    },
    cancel() { addLog('오류: 배출 중에는 취소할 수 없습니다.') },
  },
}

// 현재 상태 이름 (표시용)
const currentStateName = computed(() => stateLabels[currentState.value])

// 현재 상태에서 활성화된 버튼 계산
// 상태에 따라 가능한 동작이 다르다 (State 패턴의 핵심)
const canInsertCoin = computed(() => ['idle', 'coinInserted'].includes(currentState.value))
const canSelectItem = computed(() => currentState.value === 'coinInserted')
const canDispense = computed(() => currentState.value === 'itemSelected')
const canCancel = computed(() => ['coinInserted', 'itemSelected'].includes(currentState.value))

// 현재 상태 객체를 반환 (타입 안전 접근)
function getState() {
  return states[currentState.value]
}
</script>

<template>
  <div style="font-family: sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem;">
    <h1 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">State 패턴</h1>
    <p style="color: #555;">
      <code>currentState ref</code>가 현재 상태를 가리킨다. ref를 교체하면 상태가 전이된다.
      각 상태에서 가능한 동작(버튼 활성화)이 달라진다.
      동전 투입 → 상품 선택 → 배출 흐름을 단계별로 확인하세요.
    </p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
      <!-- 자판기 컨트롤 -->
      <div>
        <!-- 현재 상태 표시 -->
        <div :style="{
          padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center',
          background: stateColors[currentState], color: 'white',
        }">
          <div style="font-size: 0.85rem; opacity: 0.8;">현재 상태</div>
          <div style="font-size: 1.3rem; font-weight: bold;">{{ currentStateName }}</div>
          <div v-if="machine.insertedAmount > 0" style="font-size: 0.9rem; margin-top: 4px;">
            투입 금액: {{ machine.insertedAmount }}원
          </div>
          <div v-if="machine.selectedItem" style="font-size: 0.9rem; margin-top: 4px;">
            선택: {{ machine.selectedItem }}
          </div>
        </div>

        <!-- 상태 전이도 -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; font-size: 0.75rem; color: #888;">
          <span v-for="(label, state) in stateLabels" :key="state"
            :style="{
              padding: '3px 6px', borderRadius: '4px',
              background: currentState === state ? stateColors[state as StateName] : '#f5f5f5',
              color: currentState === state ? 'white' : '#888',
              fontWeight: currentState === state ? 'bold' : 'normal',
            }">
            {{ label }}
          </span>
        </div>

        <!-- 동전 투입 -->
        <div style="margin-bottom: 0.75rem;">
          <div style="font-size: 0.85rem; font-weight: bold; margin-bottom: 4px;">동전 투입</div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button v-for="amount in [500, 1000, 2000]" :key="amount"
              @click="getState().insertCoin(amount)"
              :disabled="!canInsertCoin"
              :style="{
                padding: '6px 12px', cursor: canInsertCoin ? 'pointer' : 'not-allowed',
                borderRadius: '4px', border: '1px solid #ccc',
                background: canInsertCoin ? '#fffbeb' : '#f5f5f5',
                color: canInsertCoin ? '#744210' : '#aaa',
              }">
              {{ amount }}원
            </button>
          </div>
        </div>

        <!-- 상품 선택 -->
        <div style="margin-bottom: 0.75rem;">
          <div style="font-size: 0.85rem; font-weight: bold; margin-bottom: 4px;">상품 선택</div>
          <select v-model="selectedItemName" :disabled="!canSelectItem"
            style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 6px;">
            <option v-for="item in items" :key="item" :value="item">{{ item }}</option>
          </select>
          <button @click="getState().selectItem(selectedItemName)" :disabled="!canSelectItem"
            :style="{
              width: '100%', padding: '7px', cursor: canSelectItem ? 'pointer' : 'not-allowed',
              borderRadius: '4px', border: '1px solid',
              borderColor: canSelectItem ? '#bee3f8' : '#e2e8f0',
              background: canSelectItem ? '#ebf8ff' : '#f5f5f5',
              color: canSelectItem ? '#2b6cb0' : '#aaa',
            }">
            상품 선택
          </button>
        </div>

        <!-- 배출 / 취소 -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
          <button @click="getState().dispense()" :disabled="!canDispense"
            :style="{
              padding: '8px', cursor: canDispense ? 'pointer' : 'not-allowed',
              borderRadius: '4px', border: '1px solid',
              borderColor: canDispense ? '#9ae6b4' : '#e2e8f0',
              background: canDispense ? '#f0fff4' : '#f5f5f5',
              color: canDispense ? '#276749' : '#aaa',
            }">
            배출
          </button>
          <button @click="getState().cancel()" :disabled="!canCancel"
            :style="{
              padding: '8px', cursor: canCancel ? 'pointer' : 'not-allowed',
              borderRadius: '4px', border: '1px solid',
              borderColor: canCancel ? '#fc8181' : '#e2e8f0',
              background: canCancel ? '#fff5f5' : '#f5f5f5',
              color: canCancel ? '#c53030' : '#aaa',
            }">
            취소
          </button>
        </div>
      </div>

      <!-- 이벤트 로그 -->
      <div>
        <h3 style="margin-top: 0;">이벤트 로그</h3>
        <div style="height: 380px; overflow-y: auto; border: 1px solid #ddd; border-radius: 6px; padding: 0.75rem; background: #f9f9f9;">
          <div v-if="!machine.log.length" style="color: #888; font-size: 0.85rem; font-style: italic;">
            동전을 투입해 시작하세요.
          </div>
          <div v-for="(entry, i) in machine.log" :key="i"
            :style="{
              fontSize: '0.8rem', fontFamily: 'monospace', padding: '3px 0',
              borderBottom: '1px solid #eee',
              color: entry.startsWith('↪') ? '#2b6cb0' : '#333',
              fontWeight: entry.startsWith('↪') ? 'bold' : 'normal',
            }">
            {{ entry }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
