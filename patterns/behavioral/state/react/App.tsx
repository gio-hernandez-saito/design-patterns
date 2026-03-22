/**
 * State 패턴 — React 구현
 *
 * React에서의 역할 매핑:
 * - State (VendingMachineState 인터페이스) → MachineState 타입 (상태 이름 + 허용 액션)
 * - ConcreteState                          → 각 상태 객체 (idle, coinInserted, itemSelected, dispensing)
 * - Context (VendingMachine)               → useReducer 기반 상태 머신 훅
 *
 * 왜 useReducer 기반 상태 머신인가?
 * - TS에서 각 ConcreteState가 context.setState()를 호출해 전이했다.
 * - React에서 dispatch(action)이 상태 전이를 트리거하고,
 *   reducer가 현재 상태와 액션에 따라 다음 상태를 결정한다.
 * - 이것이 React에서 State 패턴의 가장 자연스러운 표현이다.
 */

import { useReducer, useState, useEffect } from 'react'

// ─────────────────────────────────────────────
// 상태 머신 타입 정의
// ─────────────────────────────────────────────

type StateName = '대기 중' | '동전 투입됨' | '상품 선택됨' | '배출 중'

type ActionType =
  | { type: 'INSERT_COIN'; amount: number }
  | { type: 'SELECT_ITEM'; item: string }
  | { type: 'DISPENSE' }
  | { type: 'CANCEL' }

interface MachineState {
  stateName: StateName
  insertedAmount: number
  selectedItem: string
  log: string[]
}

// ─────────────────────────────────────────────
// 상태 전이 테이블 — 각 상태에서 어떤 전이가 가능한지 정의
// ─────────────────────────────────────────────

/**
 * 각 상태에서 어떤 액션이 허용되는지 정의한다.
 * TS의 ConcreteState에서 각 메서드가 상태를 체크했듯이,
 * 이 테이블이 상태별 허용 액션을 선언적으로 정의한다.
 */
const ALLOWED_ACTIONS: Record<StateName, ActionType['type'][]> = {
  '대기 중':       ['INSERT_COIN'],
  '동전 투입됨':   ['INSERT_COIN', 'SELECT_ITEM', 'CANCEL'],
  '상품 선택됨':   ['DISPENSE', 'CANCEL'],
  '배출 중':       [],
}

// ─────────────────────────────────────────────
// Reducer — 상태 전이 로직 (TS의 각 ConcreteState 메서드에 해당)
// ─────────────────────────────────────────────

/**
 * machineReducer: 상태 머신의 핵심 로직.
 *
 * 각 case가 TS의 ConcreteState 메서드에 해당한다:
 * - IdleState.insertCoin() → '대기 중' + INSERT_COIN
 * - CoinInsertedState.selectItem() → '동전 투입됨' + SELECT_ITEM
 * 등
 *
 * 현재 상태에서 허용되지 않는 액션은 오류 로그를 남기고 상태를 변경하지 않는다.
 */
function machineReducer(state: MachineState, action: ActionType): MachineState {
  const addLog = (msg: string) => [...state.log.slice(-6), msg]

  // 현재 상태에서 이 액션이 허용되는지 먼저 확인한다
  if (!ALLOWED_ACTIONS[state.stateName].includes(action.type)) {
    // 허용되지 않는 액션 — 상태 변경 없이 오류 로그만 추가
    const errorMessages: Record<string, string> = {
      INSERT_COIN: '먼저 동전을 투입해주세요.',
      SELECT_ITEM: '동전을 먼저 투입해주세요.',
      DISPENSE: '상품을 먼저 선택해주세요.',
      CANCEL: `${state.stateName} 상태에서는 취소할 수 없습니다.`,
    }
    return { ...state, log: addLog(`⚠️ 오류: ${errorMessages[action.type] ?? '허용되지 않는 동작'}`) }
  }

  // 허용된 액션 — 상태 전이 수행
  switch (state.stateName) {

    // ── 대기 중 상태 ──────────────────────────
    case '대기 중':
      if (action.type === 'INSERT_COIN') {
        return {
          ...state,
          stateName: '동전 투입됨',          // 상태 전이: 대기 중 → 동전 투입됨
          insertedAmount: action.amount,
          log: addLog(`💰 ${action.amount}원 투입됨. 총 ${action.amount}원`),
        }
      }
      break

    // ── 동전 투입됨 상태 ─────────────────────
    case '동전 투입됨':
      if (action.type === 'INSERT_COIN') {
        const total = state.insertedAmount + action.amount
        return {
          ...state,
          insertedAmount: total,
          log: addLog(`💰 추가 ${action.amount}원 투입됨. 총 ${total}원`),
          // 상태 유지 (동전 투입됨 → 동전 투입됨)
        }
      }
      if (action.type === 'SELECT_ITEM') {
        return {
          ...state,
          stateName: '상품 선택됨',           // 상태 전이: 동전 투입됨 → 상품 선택됨
          selectedItem: action.item,
          log: addLog(`🛒 "${action.item}" 선택됨`),
        }
      }
      if (action.type === 'CANCEL') {
        return {
          ...state,
          stateName: '대기 중',               // 상태 전이: 동전 투입됨 → 대기 중
          insertedAmount: 0,
          log: addLog(`↩️ ${state.insertedAmount}원 반환됨. 취소 완료.`),
        }
      }
      break

    // ── 상품 선택됨 상태 ─────────────────────
    case '상품 선택됨':
      if (action.type === 'DISPENSE') {
        return {
          ...state,
          stateName: '배출 중',               // 상태 전이: 상품 선택됨 → 배출 중
          log: addLog(`⚙️ "${state.selectedItem}" 배출 중...`),
        }
      }
      if (action.type === 'CANCEL') {
        return {
          ...state,
          stateName: '대기 중',
          insertedAmount: 0,
          selectedItem: '',
          log: addLog(`↩️ ${state.insertedAmount}원 반환됨. 선택 취소.`),
        }
      }
      break

    // ── 배출 중 상태 ─────────────────────────
    // ALLOWED_ACTIONS에서 이미 모든 액션을 차단하므로 여기 도달하지 않는다
    // 자동 완료는 useEffect로 처리 (아래 컴포넌트에서)
  }

  return state
}

const INITIAL_STATE: MachineState = {
  stateName: '대기 중',
  insertedAmount: 0,
  selectedItem: '',
  log: ['자판기가 준비됐습니다. 동전을 투입해주세요.'],
}

// ─────────────────────────────────────────────
// 상태 머신 훅
// ─────────────────────────────────────────────

function useVendingMachine() {
  const [state, dispatch] = useReducer(machineReducer, INITIAL_STATE)
  return { state, dispatch }
}

// ─────────────────────────────────────────────
// 상태 전이 다이어그램 컴포넌트
// ─────────────────────────────────────────────

const STATE_CONFIG: Record<StateName, { color: string; emoji: string }> = {
  '대기 중':       { color: '#bdbdbd', emoji: '😴' },
  '동전 투입됨':   { color: '#ff9800', emoji: '💰' },
  '상품 선택됨':   { color: '#1976d2', emoji: '🛒' },
  '배출 중':       { color: '#4caf50', emoji: '⚙️' },
}

function StateDiagram({ current }: { current: StateName }) {
  const states: StateName[] = ['대기 중', '동전 투입됨', '상품 선택됨', '배출 중']
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
      {states.map((s, i) => {
        const cfg = STATE_CONFIG[s]
        const isCurrent = s === current
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 12, textAlign: 'center',
              border: `3px solid ${cfg.color}`,
              background: isCurrent ? cfg.color : 'white',
              color: isCurrent ? 'white' : cfg.color,
              fontWeight: isCurrent ? 'bold' : 'normal',
              minWidth: 80,
              boxShadow: isCurrent ? `0 0 12px ${cfg.color}80` : 'none',
              transition: 'all 0.2s',
            }}>
              <div>{cfg.emoji}</div>
              <div>{s}</div>
            </div>
            {i < states.length - 1 && (
              <div style={{ width: 24, textAlign: 'center', color: '#ccc', fontSize: 16 }}>→</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 App
// ─────────────────────────────────────────────

const ITEMS = ['콜라 (1000원)', '사이다 (900원)', '커피 (700원)']
const COINS = [100, 500, 1000]

export default function App() {
  const { state, dispatch } = useVendingMachine()

  // 배출 중 상태에서 자동으로 완료 처리 (1.5초 후)
  // TS의 DispensingState.dispense() 자동 호출에 해당.
  // useEffect를 쓰는 이유: 렌더 중 side effect(setTimeout)를 실행하면 안 된다.
  useEffect(() => {
    if (state.stateName !== '배출 중') return
    const timer = setTimeout(() => {
      dispatch({ type: 'DISPENSE' }) // 배출 완료 트리거
    }, 1500)
    return () => clearTimeout(timer) // 클린업: 컴포넌트 언마운트 또는 상태 변경 시 타이머 취소
  }, [state.stateName, dispatch])

  const allowed = ALLOWED_ACTIONS[state.stateName]

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 750, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>State 패턴 — React</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        useReducer 기반 상태 머신으로 자판기를 구현합니다.<br />
        현재 상태에 따라 허용되는 동작이 달라집니다.
      </p>

      {/* 상태 전이 다이어그램 */}
      <StateDiagram current={state.stateName} />

      <div style={{ display: 'flex', gap: 20 }}>
        {/* 자판기 컨트롤 */}
        <div style={{ flex: 1 }}>
          {/* 동전 투입 */}
          <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>동전 투입</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {COINS.map(coin => (
                <button key={coin}
                  onClick={() => dispatch({ type: 'INSERT_COIN', amount: coin })}
                  disabled={!allowed.includes('INSERT_COIN')}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: allowed.includes('INSERT_COIN') ? '#ff9800' : '#ddd',
                    color: allowed.includes('INSERT_COIN') ? 'white' : '#aaa',
                    fontWeight: 'bold',
                  }}>
                  {coin}원
                </button>
              ))}
            </div>
            {state.insertedAmount > 0 && (
              <div style={{ marginTop: 8, fontSize: 13, textAlign: 'center', color: '#ff9800', fontWeight: 'bold' }}>
                투입 금액: {state.insertedAmount}원
              </div>
            )}
          </div>

          {/* 상품 선택 */}
          <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>상품 선택</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ITEMS.map(item => (
                <button key={item}
                  onClick={() => dispatch({ type: 'SELECT_ITEM', item })}
                  disabled={!allowed.includes('SELECT_ITEM')}
                  style={{
                    padding: '10px 16px', textAlign: 'left', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: allowed.includes('SELECT_ITEM')
                      ? (state.selectedItem === item ? '#1976d2' : '#e3f2fd')
                      : '#ddd',
                    color: allowed.includes('SELECT_ITEM')
                      ? (state.selectedItem === item ? 'white' : '#1976d2')
                      : '#aaa',
                  }}>
                  🥤 {item}
                </button>
              ))}
            </div>
          </div>

          {/* 배출 & 취소 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => dispatch({ type: 'DISPENSE' })}
              disabled={!allowed.includes('DISPENSE')}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: allowed.includes('DISPENSE') ? '#4caf50' : '#ddd',
                color: allowed.includes('DISPENSE') ? 'white' : '#aaa',
                fontWeight: 'bold', fontSize: 14,
              }}>
              {state.stateName === '배출 중' ? '⚙️ 배출 중...' : '✓ 구매 확인'}
            </button>
            <button
              onClick={() => dispatch({ type: 'CANCEL' })}
              disabled={!allowed.includes('CANCEL')}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: allowed.includes('CANCEL') ? '#f44336' : '#ddd',
                color: allowed.includes('CANCEL') ? 'white' : '#aaa',
                fontWeight: 'bold', fontSize: 14,
              }}>
              ✕ 취소
            </button>
          </div>
        </div>

        {/* 상태 & 로그 */}
        <div style={{ width: 220 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>현재 상태</div>
          <div style={{
            padding: 16, borderRadius: 8, textAlign: 'center', marginBottom: 12,
            background: STATE_CONFIG[state.stateName].color,
            color: 'white', fontSize: 16, fontWeight: 'bold',
          }}>
            {STATE_CONFIG[state.stateName].emoji} {state.stateName}
          </div>

          <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 6 }}>허용 동작</div>
          <div style={{ marginBottom: 12 }}>
            {(['INSERT_COIN', 'SELECT_ITEM', 'DISPENSE', 'CANCEL'] as ActionType['type'][]).map(a => (
              <div key={a} style={{ fontSize: 12, padding: '3px 0', color: allowed.includes(a) ? '#4caf50' : '#ccc' }}>
                {allowed.includes(a) ? '✓' : '✗'} {a}
              </div>
            ))}
          </div>

          <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 6 }}>이벤트 로그</div>
          <div style={{ background: '#1a1a1a', padding: 8, borderRadius: 6, fontFamily: 'monospace', fontSize: 11, color: '#a5d6a7' }}>
            {state.log.map((l, i) => <div key={i} style={{ marginBottom: 2 }}>{l}</div>)}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, fontSize: 13, marginTop: 16 }}>
        <strong>패턴 포인트:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li><code>useReducer</code>가 Context — 현재 상태에 따라 다음 상태를 결정하는 전이 로직</li>
          <li>각 <code>case</code>가 ConcreteState — 해당 상태에서의 액션 처리 로직</li>
          <li><code>ALLOWED_ACTIONS</code>가 상태별 허용 동작을 선언적으로 정의한다</li>
          <li>허용되지 않는 액션은 상태 변경 없이 오류 로그만 남긴다</li>
        </ul>
      </div>
    </div>
  )
}
