<script setup lang="ts">
/**
 * Factory Method 패턴 — Vue 구현
 *
 * Vue에서의 역할 매핑:
 *   <component :is>              → 동적 컴포넌트: 팩토리가 반환한 컴포넌트를 렌더링한다
 *   useNotificationFactory()     → Factory Method composable: 채널 타입에 따라 컴포넌트/설정을 생성
 *   EmailCard / SmsCard / PushCard → ConcreteProduct: 실제 알림 UI 컴포넌트
 *   NotificationForm             → Creator: 팩토리를 사용해 알림을 전송하는 클라이언트
 *
 * 왜 이렇게 구현하는가?
 *   TypeScript 버전의 Creator/ConcreteCreator 상속 구조를 Vue에서는
 *   "팩토리 composable + <component :is> 동적 컴포넌트"로 표현한다.
 *   채널 타입(email/sms/push)에 따라 어떤 컴포넌트를 렌더링할지
 *   클라이언트 코드(App)는 알 필요 없다.
 */

import { ref, computed, defineComponent, h } from 'vue'

// ─── ConcreteProduct: 채널별 알림 카드 컴포넌트 ──────────────────────────────
// 각각은 Notification 인터페이스를 구현하는 ConcreteProduct에 해당한다.
// defineComponent + h()로 인라인 정의해 별도 파일 없이 패턴에 집중한다.

/** Email 알림 카드 — ConcreteProduct 역할 */
const EmailCard = defineComponent({
  props: { message: String, recipient: String },
  setup(props) {
    return () => h('div', {
      style: 'background:#e8f4fd;border:1px solid #bee3f8;border-radius:8px;padding:1rem;'
    }, [
      h('div', { style: 'font-size:1.5rem;margin-bottom:0.5rem;' }, '📧'),
      h('div', { style: 'font-weight:bold;color:#2b6cb0;' }, `Email → ${props.recipient}`),
      h('div', { style: 'margin-top:0.5rem;color:#4a5568;' }, props.message),
    ])
  },
})

/** SMS 알림 카드 — ConcreteProduct 역할 */
const SmsCard = defineComponent({
  props: { message: String, phone: String },
  setup(props) {
    return () => h('div', {
      style: 'background:#f0fff4;border:1px solid #9ae6b4;border-radius:8px;padding:1rem;'
    }, [
      h('div', { style: 'font-size:1.5rem;margin-bottom:0.5rem;' }, '📱'),
      h('div', { style: 'font-weight:bold;color:#276749;' }, `SMS → ${props.phone}`),
      h('div', { style: 'margin-top:0.5rem;color:#4a5568;' }, props.message),
    ])
  },
})

/** Push 알림 카드 — ConcreteProduct 역할 */
const PushCard = defineComponent({
  props: { message: String, token: String },
  setup(props) {
    return () => h('div', {
      style: 'background:#faf5ff;border:1px solid #d6bcfa;border-radius:8px;padding:1rem;'
    }, [
      h('div', { style: 'font-size:1.5rem;margin-bottom:0.5rem;' }, '🔔'),
      h('div', { style: 'font-weight:bold;color:#553c9a;' }, `Push → ${props.token}`),
      h('div', { style: 'margin-top:0.5rem;color:#4a5568;' }, props.message),
    ])
  },
})

// ─── Factory Method composable ────────────────────────────────────────────────
// TypeScript 버전의 ConcreteCreator들을 하나의 composable로 통합한다.
// "어떤 채널을 위한 컴포넌트/설정을 생성할지" 결정하는 팩토리 로직이 여기에 있다.

type Channel = 'email' | 'sms' | 'push'

/** 채널별 기본 수신자 설정 */
const defaultTargets: Record<Channel, string> = {
  email: 'user@example.com',
  sms: '010-1234-5678',
  push: 'device-token-abc123',
}

/**
 * useNotificationFactory: Factory Method composable
 *
 * 채널 타입을 받아 적절한 컴포넌트와 props를 반환한다.
 * 클라이언트(App)는 Email/SMS/Push 컴포넌트를 직접 import하지 않는다.
 * 팩토리가 대신 결정해준다.
 */
function useNotificationFactory(channel: Channel, message: string, target: string) {
  // 어떤 ConcreteProduct(컴포넌트)를 만들지 결정하는 팩토리 메서드
  const componentMap = {
    email: EmailCard,
    sms: SmsCard,
    push: PushCard,
  }

  // 채널마다 다른 prop 이름을 가진다 (어댑터 역할도 겸한다)
  const propsMap: Record<Channel, Record<string, string>> = {
    email: { message, recipient: target },
    sms: { message, phone: target },
    push: { message, token: target },
  }

  return {
    // <component :is>에 전달할 컴포넌트 — Product
    component: componentMap[channel],
    // 해당 컴포넌트에 전달할 props
    props: propsMap[channel],
    // 전송 결과 메시지
    resultText: `[${channel.toUpperCase()} 채널] ${target}에게 "${message}" 전송`,
  }
}

// ─── 데모 UI 상태 ─────────────────────────────────────────────────────────────
const selectedChannel = ref<Channel>('email')
const message = ref('안녕하세요! 테스트 메시지입니다.')
const target = ref(defaultTargets['email'])
const sentNotifications = ref<Array<{ channel: Channel; text: string; component: any; props: Record<string, string> }>>([])

// 채널이 바뀌면 기본 수신자 주소도 바꾼다
function onChannelChange() {
  target.value = defaultTargets[selectedChannel.value]
}

function sendNotification() {
  if (!message.value.trim()) return

  // 팩토리를 통해 Product(컴포넌트 + props)를 생성한다.
  // 클라이언트는 EmailCard/SmsCard/PushCard를 직접 알지 못한다.
  const { component, props, resultText } = useNotificationFactory(
    selectedChannel.value,
    message.value,
    target.value,
  )

  sentNotifications.value.unshift({
    channel: selectedChannel.value,
    text: resultText,
    component,
    props,
  })
}

const channelLabels: Record<Channel, string> = {
  email: '📧 이메일',
  sms: '📱 SMS',
  push: '🔔 푸시',
}
</script>

<template>
  <div style="font-family: sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem;">
    <h1 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">
      Factory Method 패턴
    </h1>
    <p style="color: #555;">
      <code>&lt;component :is&gt;</code>로 동적 컴포넌트를 렌더링한다.
      팩토리 composable이 채널 타입에 따라 어떤 컴포넌트를 만들지 결정하므로,
      클라이언트 코드는 <code>EmailCard</code> / <code>SmsCard</code> / <code>PushCard</code>를
      직접 알 필요가 없다.
    </p>

    <!-- 알림 전송 폼 (Creator 역할) -->
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
      <h3 style="margin-top: 0;">알림 전송</h3>

      <div style="margin-bottom: 1rem;">
        <label style="font-weight: bold; display: block; margin-bottom: 0.5rem;">채널 선택</label>
        <div style="display: flex; gap: 0.75rem;">
          <label v-for="(label, ch) in channelLabels" :key="ch" style="cursor: pointer;">
            <input
              type="radio"
              :value="ch"
              v-model="selectedChannel"
              @change="onChannelChange"
            />
            {{ label }}
          </label>
        </div>
      </div>

      <div style="margin-bottom: 1rem;">
        <label style="font-weight: bold; display: block; margin-bottom: 0.5rem;">수신자</label>
        <input
          v-model="target"
          style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
        />
      </div>

      <div style="margin-bottom: 1rem;">
        <label style="font-weight: bold; display: block; margin-bottom: 0.5rem;">메시지</label>
        <textarea
          v-model="message"
          rows="2"
          style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical;"
        />
      </div>

      <button
        @click="sendNotification"
        style="background: #4a5568; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-size: 1rem;"
      >
        전송
      </button>
    </div>

    <!-- 전송된 알림 목록 (팩토리가 생성한 Product들) -->
    <div v-if="sentNotifications.length">
      <h3>전송된 알림 (팩토리가 생성한 컴포넌트들)</h3>
      <div v-for="(n, i) in sentNotifications" :key="i" style="margin-bottom: 1rem;">
        <!-- 핵심: <component :is>로 팩토리가 반환한 컴포넌트를 동적으로 렌더링 -->
        <!-- 클라이언트는 컴포넌트 타입을 몰라도 된다 -->
        <component :is="n.component" v-bind="n.props" />
        <div style="font-size: 0.8rem; color: #888; margin-top: 4px;">{{ n.text }}</div>
      </div>
    </div>
    <div v-else style="color: #888; font-style: italic;">
      전송 버튼을 눌러 팩토리가 만든 컴포넌트를 확인하세요.
    </div>
  </div>
</template>
