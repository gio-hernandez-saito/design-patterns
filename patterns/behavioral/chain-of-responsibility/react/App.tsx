/**
 * Chain of Responsibility 패턴 — React 구현
 *
 * React에서의 역할 매핑:
 * - Handler (SupportHandler 추상 클래스) → ValidationHandler 타입 (handle 함수 + next 참조)
 * - ConcreteHandler                      → 각 검증 핸들러 함수들
 * - Chain                                → 핸들러들을 연결한 배열/함수 체인
 *
 * 왜 폼 검증 체인인가?
 * - TS에서 각 핸들러가 티켓을 처리하거나 다음으로 넘겼듯이,
 *   React에서는 각 검증 핸들러가 폼 값을 검증하거나 다음 핸들러로 넘긴다.
 * - 요청(폼 값)이 체인을 따라 흐르며 각 핸들러가 자신의 조건을 검사한다.
 * - 미들웨어 패턴 시각화도 포함한다.
 */

import { useState, useCallback } from 'react'

// ─────────────────────────────────────────────
// Handler 타입 정의
// ─────────────────────────────────────────────

interface ValidationRequest {
  field: string
  value: string
}

interface ValidationResult {
  passed: boolean
  handlerName: string
  message: string
}

/**
 * ValidationHandler: 각 핸들러 함수의 타입.
 * handle()이 null을 반환하면 "통과(pass-through)", 오류 메시지를 반환하면 "처리(handle)"
 */
interface ValidationHandler {
  name: string
  description: string
  handle: (req: ValidationRequest) => string | null  // null = 통과, string = 오류
  color: string
}

// ─────────────────────────────────────────────
// ConcreteHandler 구현들 — 각 검증 핸들러
// ─────────────────────────────────────────────

/**
 * 필수 입력 검증 핸들러
 * 가장 먼저 처리한다 — 값이 없으면 즉시 오류 반환, 이후 핸들러에게 전달하지 않는다.
 */
const requiredHandler: ValidationHandler = {
  name: '필수값 검증',
  description: '빈 값인지 확인',
  color: '#f44336',
  handle({ value }) {
    if (!value.trim()) return '필수 입력 항목입니다.'
    return null // 통과 → 다음 핸들러로
  },
}

/**
 * 최소 길이 검증 핸들러
 */
const minLengthHandler: ValidationHandler = {
  name: '최소 길이 검증',
  description: '4자 이상인지 확인',
  color: '#ff9800',
  handle({ value }) {
    if (value.length < 4) return '4자 이상 입력해야 합니다.'
    return null
  },
}

/**
 * 특수문자 포함 검증 핸들러
 */
const specialCharHandler: ValidationHandler = {
  name: '특수문자 검증',
  description: '특수문자 포함 여부 확인',
  color: '#9c27b0',
  handle({ value }) {
    if (!/[!@#$%^&*]/.test(value)) return '특수문자(!@#$%^&*)를 포함해야 합니다.'
    return null
  },
}

/**
 * 숫자 포함 검증 핸들러
 */
const numberHandler: ValidationHandler = {
  name: '숫자 포함 검증',
  description: '숫자 포함 여부 확인',
  color: '#1976d2',
  handle({ value }) {
    if (!/\d/.test(value)) return '숫자를 포함해야 합니다.'
    return null
  },
}

/**
 * 대문자 포함 검증 핸들러
 */
const uppercaseHandler: ValidationHandler = {
  name: '대문자 검증',
  description: '대문자 포함 여부 확인',
  color: '#388e3c',
  handle({ value }) {
    if (!/[A-Z]/.test(value)) return '대문자를 포함해야 합니다.'
    return null
  },
}

const ALL_HANDLERS = [requiredHandler, minLengthHandler, specialCharHandler, numberHandler, uppercaseHandler]

// ─────────────────────────────────────────────
// 체인 실행 함수 — Handler.handle() 체인
// ─────────────────────────────────────────────

/**
 * runChain: 선택된 핸들러들을 순서대로 실행한다.
 *
 * TS에서 general.setNext(tech).setNext(manager) 후 general.handle(ticket) 처럼
 * 체인이 흐르는 것을 이 함수가 구현한다.
 * 각 핸들러가 null을 반환하면 다음으로, 오류를 반환하면 체인이 멈춘다.
 */
function runChain(
  handlers: ValidationHandler[],
  request: ValidationRequest
): ValidationResult[] {
  const results: ValidationResult[] = []

  for (const handler of handlers) {
    const error = handler.handle(request)
    if (error !== null) {
      // 이 핸들러가 요청을 처리했다 — 오류 발견, 체인 중단
      results.push({ passed: false, handlerName: handler.name, message: error })
      return results // 체인의 나머지 핸들러는 호출하지 않는다
    } else {
      // 통과 — 다음 핸들러로 위임
      results.push({ passed: true, handlerName: handler.name, message: '통과' })
    }
  }

  return results
}

// ─────────────────────────────────────────────
// 핸들러 체인 시각화 컴포넌트
// ─────────────────────────────────────────────

function ChainVisualizer({ handlers, results }: {
  handlers: ValidationHandler[]
  results: ValidationResult[]
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0, marginBottom: 16 }}>
      {handlers.map((h, i) => {
        const result = results[i]
        const status = !result ? 'pending' : result.passed ? 'passed' : 'failed'
        return (
          <div key={h.name} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 'bold',
              border: `2px solid ${h.color}`,
              background: status === 'passed' ? h.color : status === 'failed' ? '#ffcdd2' : '#f5f5f5',
              color: status === 'passed' ? 'white' : status === 'failed' ? '#b71c1c' : '#888',
              minWidth: 80, textAlign: 'center',
            }}>
              {status === 'passed' ? '✓' : status === 'failed' ? '✗' : '○'} {h.name}
            </div>
            {i < handlers.length - 1 && (
              <div style={{
                width: 24, height: 2,
                background: results[i]?.passed ? '#4caf50' : results[i] ? '#f44336' : '#ddd',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// 고객 지원 티켓 체인 데모 (원본 TS 예제 재현)
// ─────────────────────────────────────────────

type SupportLevel = 'general' | 'technical' | 'management'

interface SupportTicket {
  id: number
  title: string
  level: SupportLevel
}

interface SupportChainHandler {
  name: string
  canHandle: (level: SupportLevel) => boolean
  color: string
}

const supportHandlers: SupportChainHandler[] = [
  { name: '일반 상담', canHandle: l => l === 'general', color: '#4caf50' },
  { name: '기술 지원', canHandle: l => l === 'general' || l === 'technical', color: '#1976d2' },
  { name: '매니저', canHandle: () => true, color: '#9c27b0' },
]

function runSupportChain(ticket: SupportTicket): { handlerName: string; escalated: boolean }[] {
  const trace: { handlerName: string; escalated: boolean }[] = []
  for (const handler of supportHandlers) {
    if (handler.canHandle(ticket.level)) {
      trace.push({ handlerName: handler.name, escalated: false })
      return trace
    }
    trace.push({ handlerName: handler.name, escalated: true })
  }
  return trace
}

// ─────────────────────────────────────────────
// 메인 App
// ─────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState<'validation' | 'support'>('validation')

  // 폼 검증 탭 상태
  const [password, setPassword] = useState('')
  const [activeHandlers, setActiveHandlers] = useState<ValidationHandler[]>(ALL_HANDLERS)
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])

  const validate = useCallback(() => {
    const results = runChain(activeHandlers, { field: 'password', value: password })
    setValidationResults(results)
  }, [activeHandlers, password])

  const toggleHandler = useCallback((handler: ValidationHandler) => {
    setActiveHandlers(prev =>
      prev.includes(handler) ? prev.filter(h => h !== handler) : [...prev, handler]
    )
    setValidationResults([])
  }, [])

  // 고객 지원 탭 상태
  const [tickets] = useState<SupportTicket[]>([
    { id: 1, title: '로그인 방법 문의', level: 'general' },
    { id: 2, title: 'API 연동 오류', level: 'technical' },
    { id: 3, title: '서비스 계약 협의', level: 'management' },
  ])

  const allPassed = validationResults.length === activeHandlers.length && validationResults.every(r => r.passed)

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 750, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Chain of Responsibility 패턴 — React</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        요청이 체인을 따라 흐르며 각 핸들러가 자신의 조건을 검사합니다.<br />
        처리 가능한 핸들러가 나오면 체인이 중단됩니다.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['validation', 'support'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tab === t ? '#333' : '#eee',
              color: tab === t ? 'white' : '#333',
            }}>
            {t === 'validation' ? '폼 검증 체인' : '고객 지원 에스컬레이션'}
          </button>
        ))}
      </div>

      {tab === 'validation' ? (
        <div>
          {/* 핸들러 선택 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>체인에 포함할 핸들러 선택</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ALL_HANDLERS.map(h => (
                <button key={h.name} onClick={() => toggleHandler(h)}
                  style={{
                    padding: '6px 12px', borderRadius: 20, border: `2px solid ${h.color}`, cursor: 'pointer', fontSize: 12,
                    background: activeHandlers.includes(h) ? h.color : 'white',
                    color: activeHandlers.includes(h) ? 'white' : h.color,
                  }}>
                  {h.name}
                </button>
              ))}
            </div>
          </div>

          {/* 체인 시각화 */}
          <ChainVisualizer handlers={activeHandlers} results={validationResults} />

          {/* 입력 & 검증 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              type="text"
              value={password}
              onChange={e => { setPassword(e.target.value); setValidationResults([]) }}
              placeholder="비밀번호 입력 (예: Abc1@hello)"
              style={{ flex: 1, padding: '10px 14px', border: '2px solid #ddd', borderRadius: 6, fontSize: 14 }}
            />
            <button onClick={validate}
              style={{ padding: '10px 24px', background: '#333', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>
              검증
            </button>
          </div>

          {/* 결과 표시 */}
          {validationResults.length > 0 && (
            <div style={{
              padding: 16, borderRadius: 8, marginBottom: 16,
              background: allPassed ? '#e8f5e9' : '#ffebee',
              border: `2px solid ${allPassed ? '#4caf50' : '#f44336'}`,
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8, color: allPassed ? '#2e7d32' : '#b71c1c' }}>
                {allPassed ? '✅ 모든 검증 통과!' : '❌ 검증 실패'}
              </div>
              {validationResults.map((r, i) => (
                <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                  {r.passed ? '✓' : '✗'} <strong>{r.handlerName}:</strong> {r.message}
                  {!r.passed && <span style={{ color: '#888', fontSize: 11 }}> ← 여기서 체인 중단</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
            티켓 레벨에 따라 처리 가능한 첫 번째 담당자에게 전달됩니다.
          </p>
          {tickets.map(ticket => {
            const trace = runSupportChain(ticket)
            return (
              <div key={ticket.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 'bold', fontSize: 14 }}>티켓 #{ticket.id}: {ticket.title}</span>
                  <span style={{
                    padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold',
                    background: ticket.level === 'general' ? '#e8f5e9' : ticket.level === 'technical' ? '#e3f2fd' : '#f3e5f5',
                    color: ticket.level === 'general' ? '#2e7d32' : ticket.level === 'technical' ? '#1565c0' : '#6a1b9a',
                  }}>
                    {ticket.level}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {trace.map((step, i) => {
                    const h = supportHandlers[i]
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                          padding: '6px 10px', borderRadius: 6, fontSize: 12,
                          border: `2px solid ${h.color}`,
                          background: step.escalated ? '#f5f5f5' : h.color,
                          color: step.escalated ? '#aaa' : 'white',
                        }}>
                          {step.escalated ? `↷ ${h.name}` : `✓ ${h.name}`}
                        </div>
                        {i < trace.length - 1 && (
                          <div style={{ width: 20, height: 2, background: '#ddd' }} />
                        )}
                      </div>
                    )
                  })}
                  {!trace.some(t => !t.escalated) && (
                    <div style={{ fontSize: 12, color: '#f44336', marginLeft: 8 }}>미처리</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, fontSize: 13 }}>
        <strong>패턴 포인트:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li>각 핸들러는 자신이 처리할 수 없으면 <code>null</code>을 반환해 다음으로 위임한다</li>
          <li>체인이 중단되면 이후 핸들러는 호출되지 않는다 — 불필요한 검증 생략</li>
          <li>핸들러 순서 변경, 추가, 제거가 클라이언트 코드 변경 없이 가능하다</li>
          <li>체인 시각화로 어떤 핸들러에서 요청이 처리됐는지 직관적으로 확인 가능</li>
        </ul>
      </div>
    </div>
  )
}
