/**
 * Mediator 패턴 — React 구현
 *
 * React에서의 역할 매핑:
 * - Mediator (ChatMediator 인터페이스) → ChatContext (Context가 중재자 역할)
 * - ConcreteMediator (ChatRoom)        → ChatProvider 컴포넌트 (메시지 라우팅 로직)
 * - Colleague (User 추상 클래스)       → useChat() 훅 (메시지 발신/수신)
 * - ConcreteColleague                  → UserPanel 컴포넌트 (채팅 참가자 UI)
 *
 * 왜 Context가 Mediator인가?
 * - TS에서 각 User는 ChatRoom(Mediator)을 통해서만 메시지를 주고받았다.
 * - React에서 Context가 중재자 역할을 한다:
 *   - 컴포넌트들은 Context를 통해서만 메시지를 주고받는다.
 *   - 서로 직접 참조하지 않는다 (props drilling 없음, 직접 import 없음).
 * - ChatProvider가 메시지 라우팅 로직을 담당한다 (ChatRoom.sendMessage()에 해당).
 */

import { createContext, useContext, useState, useCallback, useRef } from 'react'

// ─────────────────────────────────────────────
// 메시지 타입 정의
// ─────────────────────────────────────────────

interface Message {
  id: string
  from: string
  to: string | 'all'  // 'all'이면 브로드캐스트
  content: string
  timestamp: string
  type: 'regular' | 'premium' | 'system'
}

// ─────────────────────────────────────────────
// Mediator Context — 중재자 역할
// ─────────────────────────────────────────────

interface ChatContextValue {
  // Mediator 인터페이스 메서드들
  sendMessage: (from: string, content: string, to?: string) => void
  registerUser: (name: string, type: 'regular' | 'premium') => void
  unregisterUser: (name: string) => void
  // 상태 조회
  getAllMessages: () => Message[]
  getMessagesFor: (name: string) => Message[]
  getUsers: () => string[]
}

/**
 * ChatContext: Mediator 인터페이스에 해당.
 * 컴포넌트들은 이 Context를 통해서만 통신한다.
 * 서로를 직접 참조하지 않는다 — Mediator 패턴의 핵심.
 */
const ChatContext = createContext<ChatContextValue | null>(null)

// ─────────────────────────────────────────────
// ConcreteMediator — ChatProvider
// ─────────────────────────────────────────────

/**
 * ChatProvider: ConcreteMediator (ChatRoom)에 해당하는 컴포넌트.
 *
 * 모든 메시지는 이 Provider를 통해 흐른다.
 * 누가 누구에게 메시지를 보낼지 결정하는 라우팅 로직이 여기에 집중된다.
 *
 * 이렇게 중앙화하면 "차단", "브로드캐스트", "귓속말" 같은 기능을
 * 각 컴포넌트를 건드리지 않고 이 Provider에만 추가할 수 있다.
 */
function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([])
  const users = useRef<Map<string, 'regular' | 'premium'>>(new Map())

  /**
   * sendMessage: ChatRoom.sendMessage()에 해당.
   * 보낸 사람을 제외한 모든 사람(또는 특정 대상)에게 메시지를 전달한다.
   *
   * 이 중앙 라우팅 로직 덕분에:
   * - 각 UserPanel은 다른 UserPanel을 직접 참조하지 않는다.
   * - 차단, 필터링, 로깅 등을 여기에만 추가하면 된다.
   */
  const sendMessage = useCallback((from: string, content: string, to: string = 'all') => {
    const userType = users.current.get(from) ?? 'regular'
    const msg: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      from,
      to,
      content: userType === 'premium' ? content : content, // premium은 나중에 강조 표시
      timestamp: new Date().toLocaleTimeString(),
      type: userType,
    }
    setMessages(prev => [...prev, msg])
  }, [])

  const registerUser = useCallback((name: string, type: 'regular' | 'premium') => {
    users.current.set(name, type)
    const sysMsg: Message = {
      id: `sys-${Date.now()}`,
      from: '시스템',
      to: 'all',
      content: `"${name}"이(가) 채팅방에 입장했습니다.`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'system',
    }
    setMessages(prev => [...prev, sysMsg])
  }, [])

  const unregisterUser = useCallback((name: string) => {
    users.current.delete(name)
    const sysMsg: Message = {
      id: `sys-${Date.now()}`,
      from: '시스템',
      to: 'all',
      content: `"${name}"이(가) 채팅방을 나갔습니다.`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'system',
    }
    setMessages(prev => [...prev, sysMsg])
  }, [])

  const getAllMessages = useCallback(() => messages, [messages])

  const getMessagesFor = useCallback((name: string) => {
    // 자신이 보낸 메시지는 제외, 자신에게 온 메시지만 반환
    return messages.filter(m =>
      m.from !== name && (m.to === 'all' || m.to === name)
    )
  }, [messages])

  const getUsers = useCallback(() => Array.from(users.current.keys()), [])

  return (
    <ChatContext.Provider value={{
      sendMessage, registerUser, unregisterUser,
      getAllMessages, getMessagesFor, getUsers,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

// ─────────────────────────────────────────────
// Colleague 훅 — useChat()
// ─────────────────────────────────────────────

/**
 * useChat: Colleague(User) 역할을 하는 훅.
 * ChatContext(Mediator)를 통해서만 메시지를 주고받는다.
 * 다른 UserPanel을 직접 참조하지 않는다.
 */
function useChat(userName: string, type: 'regular' | 'premium') {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('ChatProvider 내부에서만 사용 가능합니다')

  // 이 사용자가 수신한 메시지만 필터링
  const receivedMessages = ctx.getMessagesFor(userName)

  /**
   * send: User.send()에 해당.
   * 직접 다른 사용자에게 보내지 않고 Mediator(Context)에게 위임한다.
   */
  const send = useCallback((content: string, to?: string) => {
    ctx.sendMessage(userName, content, to)
  }, [ctx, userName])

  return { send, receivedMessages, userType: type }
}

// ─────────────────────────────────────────────
// ConcreteColleague 컴포넌트
// ─────────────────────────────────────────────

const USER_CONFIG = {
  regular: { color: '#1976d2', bg: '#e3f2fd', label: '일반 사용자' },
  premium: { color: '#7b1fa2', bg: '#f3e5f5', label: '프리미엄 사용자' },
}

/**
 * UserPanel: ConcreteColleague(RegularUser/PremiumUser)에 해당하는 컴포넌트.
 * useChat() 훅을 통해 Mediator와만 통신한다.
 */
function UserPanel({ name, type, allUsers }: {
  name: string
  type: 'regular' | 'premium'
  allUsers: string[]
}) {
  const chat = useChat(name, type)
  const [input, setInput] = useState('')
  const [target, setTarget] = useState<string>('all')
  const cfg = USER_CONFIG[type]

  const handleSend = () => {
    if (!input.trim()) return
    // Mediator에게 위임: 다른 사용자를 직접 알 필요 없다
    chat.send(input, target)
    setInput('')
  }

  return (
    <div style={{
      border: `2px solid ${cfg.color}`, borderRadius: 8, padding: 12,
      background: cfg.bg, flex: 1,
    }}>
      <div style={{ fontWeight: 'bold', fontSize: 13, color: cfg.color, marginBottom: 8 }}>
        {type === 'premium' ? '⭐' : '👤'} {name} ({cfg.label})
      </div>

      {/* 수신 메시지 */}
      <div style={{
        background: 'white', borderRadius: 6, padding: 8, marginBottom: 8,
        minHeight: 80, maxHeight: 150, overflowY: 'auto', fontSize: 12,
      }}>
        {chat.receivedMessages.length === 0 ? (
          <div style={{ color: '#aaa' }}>수신된 메시지 없음</div>
        ) : (
          chat.receivedMessages.slice(-5).map(m => (
            <div key={m.id} style={{ marginBottom: 4 }}>
              <span style={{
                color: m.type === 'premium' ? '#7b1fa2' : m.type === 'system' ? '#888' : '#1976d2',
                fontWeight: 'bold',
              }}>
                {m.from}:
              </span>{' '}
              <span style={{ color: m.type === 'premium' ? '#7b1fa2' : 'inherit' }}>
                {m.type === 'premium' ? m.content.toUpperCase() : m.content}
              </span>
              {m.to !== 'all' && <span style={{ fontSize: 10, color: '#888' }}> (귓속말)</span>}
              <span style={{ fontSize: 10, color: '#bbb', marginLeft: 4 }}>{m.timestamp}</span>
            </div>
          ))
        )}
      </div>

      {/* 메시지 전송 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <select value={target} onChange={e => setTarget(e.target.value)}
          style={{ padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }}>
          <option value="all">전체</option>
          {allUsers.filter(u => u !== name).map(u => (
            <option key={u} value={u}>{u}에게</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="메시지 입력..."
          style={{ flex: 1, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }} />
        <button onClick={handleSend}
          style={{ padding: '6px 12px', background: cfg.color, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
          전송
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 채팅방 전체 로그 컴포넌트
// ─────────────────────────────────────────────

function ChatRoomLog() {
  const ctx = useContext(ChatContext)!
  const messages = ctx.getAllMessages()

  return (
    <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 12, marginTop: 16 }}>
      <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
        채팅방 전체 로그 (Mediator가 라우팅한 모든 메시지)
      </div>
      <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 11, fontFamily: 'monospace' }}>
        {messages.slice(-10).map(m => (
          <div key={m.id} style={{
            color: m.type === 'system' ? '#888' : m.type === 'premium' ? '#ce93d8' : '#90caf9',
            marginBottom: 2,
          }}>
            [{m.timestamp}] {m.from} → {m.to === 'all' ? '전체' : m.to}: {m.content}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 App
// ─────────────────────────────────────────────

function ChatRoom() {
  const ctx = useContext(ChatContext)!
  const [joined, setJoined] = useState<Array<{ name: string; type: 'regular' | 'premium' }>>([])
  const users = ctx.getUsers()

  const handleJoin = (name: string, type: 'regular' | 'premium') => {
    if (!joined.find(u => u.name === name)) {
      ctx.registerUser(name, type)
      setJoined(prev => [...prev, { name, type }])
    }
  }

  const handleLeave = (name: string) => {
    ctx.unregisterUser(name)
    setJoined(prev => prev.filter(u => u.name !== name))
  }

  return (
    <div>
      {/* 참가 버튼 */}
      {joined.length < 3 && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { name: '김민준', type: 'regular' as const },
            { name: '이서연', type: 'regular' as const },
            { name: '박지훈 ⭐', type: 'premium' as const },
          ].filter(u => !joined.find(j => j.name === u.name)).map(u => (
            <button key={u.name} onClick={() => handleJoin(u.name, u.type)}
              style={{
                padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer',
                background: u.type === 'premium' ? '#7b1fa2' : '#1976d2', color: 'white', fontSize: 13,
              }}>
              {u.name} 입장
            </button>
          ))}
        </div>
      )}

      {/* 사용자 패널들 */}
      {joined.length === 0 ? (
        <div style={{ color: '#aaa', fontSize: 13, padding: 20, textAlign: 'center', background: '#f5f5f5', borderRadius: 8 }}>
          위 버튼으로 사용자를 채팅방에 입장시켜 보세요
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            {joined.map(u => (
              <UserPanel key={u.name} name={u.name} type={u.type} allUsers={users} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {joined.map(u => (
              <button key={u.name} onClick={() => handleLeave(u.name)}
                style={{ flex: 1, padding: '6px 0', background: '#bdbdbd', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                {u.name} 퇴장
              </button>
            ))}
          </div>
          <ChatRoomLog />
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ChatProvider>
      <div style={{ fontFamily: 'sans-serif', maxWidth: 750, margin: '40px auto', padding: '0 20px' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Mediator 패턴 — React</h1>
        <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
          Context가 중재자(Mediator) 역할을 합니다.<br />
          사용자들은 서로 직접 참조하지 않고, Context를 통해서만 메시지를 주고받습니다.
        </p>

        <ChatRoom />

        <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, fontSize: 13, marginTop: 16 }}>
          <strong>패턴 포인트:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li><code>ChatContext</code>가 Mediator — 모든 메시지가 이 Context를 통해 흐른다</li>
            <li><code>ChatProvider</code>가 ConcreteMediator — 메시지 라우팅 로직을 담당한다</li>
            <li>각 <code>UserPanel</code>은 다른 <code>UserPanel</code>을 전혀 알지 못한다 — 낮은 결합도</li>
            <li>새 기능(차단, 필터링)은 <code>ChatProvider</code>에만 추가하면 된다</li>
            <li>프리미엄 사용자의 메시지는 대문자로 표시 — Colleague마다 다른 수신 처리</li>
          </ul>
        </div>
      </div>
    </ChatProvider>
  )
}
