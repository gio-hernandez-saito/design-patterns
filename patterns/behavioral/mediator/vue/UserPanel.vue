<script setup lang="ts">
/**
 * UserPanel 컴포넌트 — Colleague 역할
 *
 * Vue에서의 역할 매핑:
 *   UserPanel (이 컴포넌트) → ConcreteColleague: 중재자를 통해서만 통신
 *   inject(ChatRoomKey)     → mediator 참조 획득: TypeScript 버전의 생성자 주입과 동일
 *   send()                  → mediator.sendMessage() 호출: 다른 사용자를 직접 참조하지 않음
 *   inbox (computed)        → 수신된 메시지: 중재자가 전달해준 메시지들
 *
 * 핵심: 이 컴포넌트는 다른 UserPanel을 import하거나 직접 참조하지 않는다.
 * 모든 통신은 inject된 중재자를 통해서만 이루어진다.
 */

import { ref, inject, computed, onMounted } from 'vue'
import { ChatRoomKey } from './ChatRoom.vue'
import type { ChatUser } from './ChatRoom.vue'

const props = defineProps<{
  userName: string
  userType: 'regular' | 'premium'
}>()

// inject: provide된 중재자(ChatRoom)를 가져온다
// TypeScript 버전의 생성자에서 mediator를 받는 것과 동일
const chatRoom = inject(ChatRoomKey)
if (!chatRoom) throw new Error('ChatRoom provide가 필요합니다')

// 컴포넌트 마운트 시 중재자에 자동 등록
onMounted(() => {
  chatRoom.registerUser(props.userName, props.userType)
})

// 이 사용자의 inbox: 중재자가 전달한 메시지들
const myUser = computed<ChatUser | undefined>(
  () => chatRoom.users.find(u => u.name === props.userName)
)

const messageText = ref('')

/**
 * 메시지 전송: 직접 다른 UserPanel을 호출하지 않는다.
 * 중재자(chatRoom)에게 메시지를 넘기면 중재자가 라우팅을 결정한다.
 */
function sendMessage() {
  if (!messageText.value.trim()) return
  chatRoom.sendMessage(props.userName, messageText.value)
  messageText.value = ''
}
</script>

<template>
  <div :style="{
    border: `1px solid ${userType === 'premium' ? '#d6bcfa' : '#ddd'}`,
    borderRadius: '8px', padding: '1rem',
    background: userType === 'premium' ? '#faf5ff' : '#fff',
  }">
    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
      <span style="font-size: 1.2rem;">{{ userType === 'premium' ? '⭐' : '👤' }}</span>
      <span style="font-weight: bold;">{{ userName }}</span>
      <span :style="{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '10px', background: userType === 'premium' ? '#d6bcfa' : '#e2e8f0', color: userType === 'premium' ? '#553c9a' : '#4a5568' }">
        {{ userType === 'premium' ? '프리미엄' : '일반' }}
      </span>
    </div>

    <!-- 메시지 전송 -->
    <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
      <input
        v-model="messageText"
        :placeholder="`${userName}의 메시지...`"
        @keydown.enter="sendMessage"
        style="flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.85rem;"
      />
      <button @click="sendMessage"
        :style="{
          padding: '6px 12px', cursor: 'pointer', borderRadius: '4px', border: 'none',
          background: userType === 'premium' ? '#805ad5' : '#4a5568',
          color: 'white', fontSize: '0.85rem',
        }">
        전송
      </button>
    </div>

    <!-- 수신함 -->
    <div>
      <div style="font-size: 0.8rem; font-weight: bold; color: #555; margin-bottom: 4px;">
        수신함
        <span v-if="userType === 'premium'" style="color: #805ad5; font-weight: normal;">(대문자 변환)</span>
      </div>
      <div style="max-height: 100px; overflow-y: auto; background: #f9f9f9; border-radius: 4px; padding: 0.5rem;">
        <div v-if="!myUser?.inbox.length" style="color: #aaa; font-size: 0.78rem; font-style: italic;">수신 없음</div>
        <div v-for="msg in [...(myUser?.inbox ?? [])].reverse()" :key="msg.id"
          style="font-size: 0.78rem; padding: 2px 0; border-bottom: 1px solid #eee;">
          <span style="color: #2b6cb0; font-weight: bold;">{{ msg.sender }}: </span>
          {{ msg.text }}
        </div>
      </div>
    </div>
  </div>
</template>
