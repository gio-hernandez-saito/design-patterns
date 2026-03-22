<script setup lang="ts">
/**
 * ChatRoom 컴포넌트 — Mediator(중재자) 역할
 *
 * Vue에서의 역할 매핑:
 *   ChatRoom (이 컴포넌트)  → ConcreteMediator: 메시지 라우팅 로직 담당
 *   provide(ChatRoomKey)    → 중재자를 하위 컴포넌트에 주입하는 메커니즘
 *   users (ref 배열)        → 등록된 Colleague 목록
 *   sendMessage()           → 보낸 사람 제외 모든 사용자에게 메시지 전달
 *
 * 왜 provide/inject인가?
 *   TypeScript 버전에서 Colleague가 mediator 참조를 생성자로 받았다면,
 *   Vue에서는 provide/inject로 중재자를 컴포넌트 트리에 주입한다.
 *   자식 컴포넌트(UserPanel)는 서로를 직접 참조하지 않고
 *   provide된 중재자를 통해서만 통신한다.
 */

import { ref, provide, reactive } from 'vue'
import type { InjectionKey } from 'vue'

// 메시지 타입
export interface Message {
  id: number
  sender: string
  text: string
  time: string
  isSystem?: boolean
}

// 사용자 타입
export interface ChatUser {
  name: string
  type: 'regular' | 'premium'
  inbox: Message[]
}

// Injection Key: 타입 안전한 provide/inject를 위해 Symbol + 타입 사용
export interface ChatRoomAPI {
  registerUser: (name: string, type: 'regular' | 'premium') => void
  sendMessage: (senderName: string, text: string) => void
  users: ChatUser[]
  globalLog: Message[]
}

export const ChatRoomKey: InjectionKey<ChatRoomAPI> = Symbol('ChatRoom')

const props = defineProps<{ roomName: string }>()

// 등록된 사용자 목록과 전체 메시지 로그
const users = reactive<ChatUser[]>([])
const globalLog = reactive<Message[]>([])
let msgId = 0

/**
 * 사용자 등록 — TypeScript 버전의 registerUser()와 동일
 * Colleague 생성 시 중재자에 자동 등록된다.
 */
function registerUser(name: string, type: 'regular' | 'premium') {
  if (users.find(u => u.name === name)) return
  users.push({ name, type, inbox: [] })
  globalLog.push({
    id: msgId++,
    sender: '시스템',
    text: `"${name}"(${type === 'premium' ? '프리미엄' : '일반'}) 입장`,
    time: new Date().toLocaleTimeString(),
    isSystem: true,
  })
}

/**
 * 메시지 전달 — TypeScript 버전의 sendMessage()와 동일
 * 보낸 사람을 제외한 모든 사용자의 inbox에 메시지를 추가한다.
 * "직접 통신 차단"이 여기서 구현된다.
 */
function sendMessage(senderName: string, text: string) {
  const msg: Message = {
    id: msgId++,
    sender: senderName,
    text,
    time: new Date().toLocaleTimeString(),
  }
  // 전체 로그에 추가
  globalLog.push(msg)

  // 보낸 사람 제외 모든 사용자에게 전달
  users.forEach(user => {
    if (user.name !== senderName) {
      // 프리미엄 사용자는 대문자로 수신 (TypeScript 버전의 PremiumUser.receive()와 동일)
      const receivedText = user.type === 'premium' ? text.toUpperCase() : text
      user.inbox.push({ ...msg, text: receivedText })
    }
  })
}

// provide: 하위 컴포넌트(UserPanel)들이 inject로 중재자에 접근할 수 있게 한다
provide(ChatRoomKey, { registerUser, sendMessage, users, globalLog })
</script>

<template>
  <div style="border: 2px solid #2b6cb0; border-radius: 10px; padding: 1.5rem; background: #f7faff;">
    <div style="font-size: 1.1rem; font-weight: bold; color: #2b6cb0; margin-bottom: 1rem;">
      채팅방: {{ roomName }}
      <span style="font-size: 0.8rem; font-weight: normal; color: #888; margin-left: 0.5rem;">
        ({{ users.length }}명 참여 중)
      </span>
    </div>
    <!-- 자식 컴포넌트(UserPanel)들이 여기에 슬롯으로 렌더링된다 -->
    <slot />
    <!-- 전체 채팅 로그 (중재자가 관리) -->
    <div style="margin-top: 1rem; border-top: 1px solid #bee3f8; padding-top: 1rem;">
      <div style="font-size: 0.85rem; font-weight: bold; color: #2b6cb0; margin-bottom: 0.5rem;">
        채팅방 전체 로그 (Mediator가 관리)
      </div>
      <div style="max-height: 120px; overflow-y: auto; background: #fff; border-radius: 4px; padding: 0.5rem;">
        <div v-if="!globalLog.length" style="color: #888; font-size: 0.8rem; font-style: italic;">메시지 없음</div>
        <div v-for="msg in [...globalLog].reverse()" :key="msg.id"
          :style="{ fontSize: '0.8rem', padding: '2px 0', color: msg.isSystem ? '#888' : '#333', fontStyle: msg.isSystem ? 'italic' : 'normal' }">
          <span v-if="!msg.isSystem" style="color: #2b6cb0; font-weight: bold;">{{ msg.sender }}: </span>
          {{ msg.text }}
          <span style="color: #aaa; font-size: 0.75rem; margin-left: 0.3rem;">{{ msg.time }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
