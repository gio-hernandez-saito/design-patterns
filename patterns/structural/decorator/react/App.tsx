/**
 * Decorator 패턴 — React 구현
 *
 * React에서의 역할 매핑:
 * - Component (Beverage 인터페이스)       → BeverageProps 타입 (공통 인터페이스)
 * - ConcreteComponent (Espresso 등)       → EspressoBase, DripBase 컴포넌트
 * - Decorator (CondimentDecorator)        → withCondiment() HOC 또는 래퍼 컴포넌트
 * - ConcreteDecorator (Milk, Syrup 등)   → 각 토핑을 추가하는 래퍼 컴포넌트
 *
 * 왜 HOC/래퍼 컴포넌트인가?
 * - TS에서 데코레이터는 Beverage를 감싸(wrap)며 getDescription/getCost에 자신의 내용을 추가했다.
 * - React에서 HOC는 컴포넌트를 감싸며 props나 렌더 결과에 내용을 추가한다.
 * - 토핑을 동적으로 추가/제거하는 것이 상태(state)로 관리된다.
 */

import { useState } from 'react'

// ─────────────────────────────────────────────
// Component 인터페이스 — 모든 음료/데코레이터가 공유
// ─────────────────────────────────────────────

interface BeverageInfo {
  description: string  // 누적되는 설명 (체이닝)
  cost: number         // 누적되는 가격
}

// ─────────────────────────────────────────────
// ConcreteComponent — 기본 음료 데이터
// ─────────────────────────────────────────────

const BASE_BEVERAGES: Record<string, BeverageInfo> = {
  espresso:  { description: '에스프레소', cost: 1500 },
  drip:      { description: '드립 커피',  cost: 1200 },
  decaf:     { description: '디카페인',   cost: 1700 },
}

// ─────────────────────────────────────────────
// ConcreteDecorator 데이터 — 각 토핑의 정보
// ─────────────────────────────────────────────

interface Condiment {
  key: string
  label: string
  emoji: string
  addDescription: string  // 설명에 추가될 텍스트
  addCost: number
  color: string
}

const CONDIMENTS: Condiment[] = [
  { key: 'milk',    label: '우유',       emoji: '🥛', addDescription: '+ 우유',     addCost: 300, color: '#e3f2fd' },
  { key: 'syrup',   label: '바닐라 시럽', emoji: '🍯', addDescription: '+ 바닐라 시럽', addCost: 500, color: '#fff8e1' },
  { key: 'whip',    label: '휘핑크림',   emoji: '🍦', addDescription: '+ 휘핑크림', addCost: 600, color: '#fce4ec' },
  { key: 'shot',    label: '샷 추가',    emoji: '☕', addDescription: '+ 샷 1개',   addCost: 400, color: '#efebe9' },
  { key: 'soymilk', label: '두유',       emoji: '🌱', addDescription: '+ 두유',     addCost: 500, color: '#e8f5e9' },
]

// ─────────────────────────────────────────────
// 데코레이터 적용 함수 — TS의 래핑 체인에 해당
// ─────────────────────────────────────────────

/**
 * applyCondiments: 기본 음료에 선택된 토핑들을 순서대로 적용한다.
 *
 * TS에서는:
 *   new WhipCream(new Milk(new Espresso()))
 * React에서는:
 *   이 함수가 선택된 condiment 목록을 순서대로 reduce하여 최종 BeverageInfo를 만든다.
 *
 * 핵심: 각 단계에서 description과 cost가 누적된다 — 데코레이터 체이닝과 동일.
 */
function applyCondiments(base: BeverageInfo, selectedKeys: string[]): BeverageInfo {
  return CONDIMENTS
    .filter(c => selectedKeys.includes(c.key))
    .reduce<BeverageInfo>((beverage, condiment) => ({
      // 각 데코레이터가 이전 description에 자신의 내용을 추가한다
      description: beverage.description + ' ' + condiment.addDescription,
      // 각 데코레이터가 이전 cost에 자신의 비용을 더한다
      cost: beverage.cost + condiment.addCost,
    }), base)
}

// ─────────────────────────────────────────────
// BeverageDisplay — 현재 음료 정보 표시 컴포넌트
// ─────────────────────────────────────────────

/**
 * BeverageDisplay: 현재 데코레이터가 적용된 음료를 표시한다.
 * TS의 beverage.getDescription() + beverage.getCost()를 렌더하는 컴포넌트.
 */
function BeverageDisplay({ info }: { info: BeverageInfo }) {
  return (
    <div style={{ background: '#fff3e0', border: '2px solid #ff9800', borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
        <strong>구성:</strong> {info.description}
      </div>
      <div style={{ fontSize: 28, fontWeight: 'bold', color: '#e65100' }}>
        {info.cost.toLocaleString()}원
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 데코레이터 시각화 — 래핑 체인을 보여준다
// ─────────────────────────────────────────────

/**
 * DecoratorChain: 데코레이터가 중첩되는 구조를 시각화한다.
 * TS에서 new Whip(new Milk(new Espresso()))처럼 중첩되는 것을 표현.
 */
function DecoratorChain({ baseName, selectedKeys }: { baseName: string; selectedKeys: string[] }) {
  const applied = CONDIMENTS.filter(c => selectedKeys.includes(c.key))

  return (
    <div style={{ fontSize: 12, fontFamily: 'monospace', background: '#f5f5f5', padding: 12, borderRadius: 6, marginBottom: 16 }}>
      <div style={{ color: '#888', marginBottom: 4 }}>데코레이터 체인 (바깥 → 안쪽):</div>
      <div>
        {applied.map(c => `${c.emoji}${c.label}(`).join('')}
        <span style={{ background: '#ffe082', padding: '2px 6px', borderRadius: 3 }}>{baseName}</span>
        {applied.map(() => ')').join('')}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 App
// ─────────────────────────────────────────────

export default function App() {
  const [baseKey, setBaseKey] = useState<string>('espresso')
  const [selectedCondiments, setSelectedCondiments] = useState<string[]>([])
  const [orders, setOrders] = useState<Array<{ id: number; info: BeverageInfo }>>([])

  const base = BASE_BEVERAGES[baseKey]
  // 데코레이터 체인 적용 — 매 렌더마다 최신 상태를 반영한다
  const current = applyCondiments(base, selectedCondiments)

  const toggleCondiment = (key: string) => {
    setSelectedCondiments(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleOrder = () => {
    setOrders(prev => [...prev, { id: Date.now(), info: current }])
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 750, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Decorator 패턴 — React</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        토핑(데코레이터)을 동적으로 추가/제거해 음료를 구성합니다.<br />
        각 토핑이 이전 음료를 감싸며 설명과 가격을 누적합니다.
      </p>

      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ flex: 1 }}>
          {/* 기본 음료 선택 — ConcreteComponent */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>기본 음료 (ConcreteComponent)</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(BASE_BEVERAGES).map(([key, info]) => (
                <button key={key} onClick={() => { setBaseKey(key); setSelectedCondiments([]) }}
                  style={{
                    padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
                    background: baseKey === key ? '#795548' : '#ddd',
                    color: baseKey === key ? 'white' : '#333',
                    fontWeight: baseKey === key ? 'bold' : 'normal',
                  }}>
                  {info.description} ({info.cost.toLocaleString()}원)
                </button>
              ))}
            </div>
          </div>

          {/* 토핑 선택 — ConcreteDecorator */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>토핑 선택 (ConcreteDecorator — 중첩 가능)</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CONDIMENTS.map(c => {
                const active = selectedCondiments.includes(c.key)
                return (
                  <button key={c.key} onClick={() => toggleCondiment(c.key)}
                    style={{
                      padding: '8px 14px', borderRadius: 20, border: '2px solid',
                      borderColor: active ? '#ff9800' : '#ddd',
                      background: active ? c.color : 'white',
                      cursor: 'pointer', fontSize: 13,
                      fontWeight: active ? 'bold' : 'normal',
                    }}>
                    {c.emoji} {c.label} (+{c.addCost}원)
                  </button>
                )
              })}
            </div>
          </div>

          {/* 데코레이터 체인 시각화 */}
          {selectedCondiments.length > 0 && (
            <DecoratorChain baseName={base.description} selectedKeys={selectedCondiments} />
          )}

          {/* 현재 음료 정보 */}
          <BeverageDisplay info={current} />

          <button onClick={handleOrder}
            style={{ width: '100%', padding: '12px', background: '#ff9800', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 15 }}>
            주문하기
          </button>
        </div>

        {/* 주문 내역 */}
        <div style={{ width: 220 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>주문 내역</div>
          {orders.length === 0 ? (
            <div style={{ fontSize: 12, color: '#aaa' }}>아직 주문이 없습니다</div>
          ) : (
            orders.map(o => (
              <div key={o.id} style={{ background: '#f5f5f5', borderRadius: 6, padding: 10, marginBottom: 8, fontSize: 12 }}>
                <div style={{ color: '#555', marginBottom: 4 }}>{o.info.description}</div>
                <div style={{ fontWeight: 'bold', color: '#e65100' }}>{o.info.cost.toLocaleString()}원</div>
              </div>
            ))
          )}
          {orders.length > 0 && (
            <div style={{ borderTop: '1px solid #ddd', paddingTop: 8, fontWeight: 'bold', fontSize: 13 }}>
              합계: {orders.reduce((s, o) => s + o.info.cost, 0).toLocaleString()}원
            </div>
          )}
        </div>
      </div>

      <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, fontSize: 13, marginTop: 16 }}>
        <strong>패턴 포인트:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li><code>applyCondiments()</code>가 데코레이터 체인 — 선택된 토핑을 순서대로 reduce해 적용</li>
          <li>각 토핑이 이전 description/cost에 자신의 내용을 더한다 — TS의 <code>this.beverage.getCost() + 300</code>과 동일</li>
          <li>런타임에 토핑을 추가/제거할 수 있다 — 동적 데코레이팅</li>
          <li>기본 음료나 새 토핑 추가 시 기존 코드 변경 불필요</li>
        </ul>
      </div>
    </div>
  )
}
