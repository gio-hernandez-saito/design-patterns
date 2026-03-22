/**
 * Factory Method 패턴 — React 구현
 *
 * React에서의 역할 매핑:
 * - Product (Notification 인터페이스) → NotificationCard 컴포넌트가 받는 공통 props 타입
 * - ConcreteProduct (Email/SMS/Push)  → EmailCard, SmsCard, PushCard 컴포넌트
 * - Creator (NotificationCreator)     → createNotificationComponent() 팩토리 함수
 * - ConcreteCreator                   → channelType props 값에 따라 분기하는 팩토리
 *
 * 왜 컴포넌트 팩토리 함수인가?
 * - TS에서는 클래스의 factoryMethod()가 객체를 생성했다.
 * - React에서는 팩토리 함수가 어떤 JSX 컴포넌트를 렌더할지 결정한다.
 * - props를 "생성 파라미터"로, 컴포넌트를 "Product"로 매핑한다.
 */

import { useState } from 'react'

// ─────────────────────────────────────────────
// Product 인터페이스 — 모든 알림 컴포넌트가 받을 공통 props
// ─────────────────────────────────────────────

interface NotificationProps {
  message: string
  recipient: string
}

// ─────────────────────────────────────────────
// ConcreteProduct 컴포넌트들 — 각 알림 채널의 구체적인 UI
// ─────────────────────────────────────────────

/**
 * ConcreteProduct: 이메일 알림 카드
 * 동일한 NotificationProps 인터페이스를 구현한다.
 */
function EmailCard({ message, recipient }: NotificationProps) {
  return (
    <div style={{
      border: '2px solid #1976d2', borderRadius: 8, padding: 16,
      background: '#e3f2fd', marginBottom: 8,
    }}>
      <div style={{ fontWeight: 'bold', color: '#1976d2', marginBottom: 4 }}>
        📧 이메일 알림
      </div>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
        수신: <strong>{recipient}</strong>
      </div>
      <div style={{ fontSize: 14 }}>{message}</div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
        채널: email | 형식: HTML 메일
      </div>
    </div>
  )
}

/**
 * ConcreteProduct: SMS 알림 카드
 */
function SmsCard({ message, recipient }: NotificationProps) {
  return (
    <div style={{
      border: '2px solid #388e3c', borderRadius: 8, padding: 16,
      background: '#e8f5e9', marginBottom: 8,
    }}>
      <div style={{ fontWeight: 'bold', color: '#388e3c', marginBottom: 4 }}>
        📱 SMS 알림
      </div>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
        수신: <strong>{recipient}</strong>
      </div>
      <div style={{ fontSize: 14 }}>{message.slice(0, 80)}{message.length > 80 ? '...' : ''}</div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
        채널: sms | 최대 80자 제한
      </div>
    </div>
  )
}

/**
 * ConcreteProduct: 푸시 알림 카드
 */
function PushCard({ message, recipient }: NotificationProps) {
  return (
    <div style={{
      border: '2px solid #f57c00', borderRadius: 8, padding: 16,
      background: '#fff3e0', marginBottom: 8,
    }}>
      <div style={{ fontWeight: 'bold', color: '#f57c00', marginBottom: 4 }}>
        🔔 푸시 알림
      </div>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
        기기 토큰: <strong>{recipient}</strong>
      </div>
      <div style={{ fontSize: 14 }}>{message}</div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
        채널: push | 즉시 전달
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Creator — 팩토리 메서드 역할을 하는 함수
// ─────────────────────────────────────────────

type ChannelType = 'email' | 'sms' | 'push'

/**
 * createNotificationComponent: 팩토리 메서드에 해당하는 함수.
 *
 * TS 구현에서는 ConcreteCreator 클래스가 createNotification()을 오버라이드해
 * 어떤 ConcreteProduct를 반환할지 결정했다.
 *
 * React에서는 이 함수가 channelType에 따라 어떤 컴포넌트(ConcreteProduct)를
 * 렌더할지 결정한다. 호출하는 쪽은 어떤 컴포넌트인지 몰라도 된다.
 */
function createNotificationComponent(
  channel: ChannelType,
  props: NotificationProps
): React.ReactElement {
  // 팩토리 메서드의 핵심: 어떤 ConcreteProduct를 만들지 이 함수가 결정한다
  switch (channel) {
    case 'email':
      return <EmailCard {...props} />
    case 'sms':
      return <SmsCard {...props} />
    case 'push':
      return <PushCard {...props} />
  }
}

// ─────────────────────────────────────────────
// NotificationSender — Creator의 notify() 역할을 하는 컴포넌트
// ─────────────────────────────────────────────

/**
 * NotificationSender: TS의 Creator.notify()에 해당하는 컴포넌트.
 * 팩토리 함수를 호출해 적절한 알림 컴포넌트를 렌더한다.
 * 내부에서 어떤 ConcreteProduct가 만들어지는지 알 필요가 없다.
 */
function NotificationSender({ channel, message, recipient }: {
  channel: ChannelType
  message: string
  recipient: string
}) {
  // 팩토리 메서드 호출: 어떤 컴포넌트인지 몰라도 된다
  return createNotificationComponent(channel, { message, recipient })
}

// ─────────────────────────────────────────────
// 메인 App 컴포넌트
// ─────────────────────────────────────────────

interface SentNotification {
  id: number
  channel: ChannelType
  message: string
  recipient: string
}

export default function App() {
  const [channel, setChannel] = useState<ChannelType>('email')
  const [message, setMessage] = useState('안녕하세요! 중요한 알림입니다.')
  const [recipient, setRecipient] = useState('user@example.com')
  const [sent, setSent] = useState<SentNotification[]>([])

  // 채널이 바뀔 때 recipient 기본값도 맞게 변경
  const handleChannelChange = (ch: ChannelType) => {
    setChannel(ch)
    if (ch === 'email') setRecipient('user@example.com')
    else if (ch === 'sms') setRecipient('010-1234-5678')
    else setRecipient('device_token_abc123')
  }

  const handleSend = () => {
    setSent(prev => [...prev, { id: Date.now(), channel, message, recipient }])
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 700, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Factory Method 패턴 — React</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        팩토리 함수가 채널 타입에 따라 적절한 알림 컴포넌트를 생성합니다.<br />
        발신자는 어떤 컴포넌트가 렌더되는지 몰라도 됩니다.
      </p>

      {/* 알림 설정 폼 */}
      <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 8, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px' }}>알림 설정</h3>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>
            채널 선택 (팩토리가 이 값으로 ConcreteProduct를 결정)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['email', 'sms', 'push'] as ChannelType[]).map(ch => (
              <button
                key={ch}
                onClick={() => handleChannelChange(ch)}
                style={{
                  padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: channel === ch ? '#1976d2' : '#ddd',
                  color: channel === ch ? 'white' : '#333',
                  fontWeight: channel === ch ? 'bold' : 'normal',
                }}
              >
                {ch === 'email' ? '📧 Email' : ch === 'sms' ? '📱 SMS' : '🔔 Push'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>
            수신자
          </label>
          <input
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>
            메시지
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>

        <button
          onClick={handleSend}
          style={{ padding: '10px 24px', background: '#333', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
        >
          알림 전송 (팩토리 메서드 호출)
        </button>
      </div>

      {/* 전송된 알림 목록 — 팩토리가 생성한 컴포넌트들 */}
      {sent.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 12 }}>전송된 알림 (팩토리가 생성한 Product 컴포넌트들)</h3>
          {sent.map(n => (
            <NotificationSender
              key={n.id}
              channel={n.channel}
              message={n.message}
              recipient={n.recipient}
            />
          ))}
        </div>
      )}

      <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, fontSize: 13, marginTop: 16 }}>
        <strong>패턴 포인트:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li><code>createNotificationComponent()</code>가 팩토리 메서드다</li>
          <li><code>NotificationSender</code>는 어떤 컴포넌트가 나올지 모른다 — Creator와 동일</li>
          <li>새 채널(예: Slack)을 추가해도 <code>NotificationSender</code> 코드는 변경되지 않는다</li>
        </ul>
      </div>
    </div>
  )
}
