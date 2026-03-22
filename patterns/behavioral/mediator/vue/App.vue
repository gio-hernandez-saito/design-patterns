<script setup lang="ts">
/**
 * Mediator 패턴 — Vue 구현
 *
 * Vue에서의 역할 매핑:
 *   ChatRoom 컴포넌트       → ConcreteMediator: provide로 중재자 주입, 메시지 라우팅 담당
 *   UserPanel 컴포넌트들    → ConcreteColleague: inject로 중재자 획득, 서로를 직접 참조 안 함
 *   provide/inject          → Mediator 패턴의 Vue 구현 핵심
 *
 * TypeScript 버전과의 차이:
 *   - TypeScript: 생성자에서 mediator 참조를 직접 전달 (new RegularUser(chatRoom, "홍길동"))
 *   - Vue: provide/inject로 컴포넌트 트리를 통해 중재자를 전달
 *   - 결과는 동일: 각 Colleague는 mediator만 알고, 다른 Colleague를 직접 참조하지 않는다
 *
 * 왜 provide/inject가 Mediator 패턴에 이상적인가?
 *   - 컴포넌트 트리 어디서든 중재자에 접근 가능 (전역 진입점)
 *   - 각 UserPanel은 ChatRoom을 직접 import하지 않아도 된다
 *   - 중재자 교체가 가능 (다른 provide로 다른 ChatRoom 주입 가능)
 */
import ChatRoom from './ChatRoom.vue'
import UserPanel from './UserPanel.vue'
</script>

<template>
  <div style="font-family: sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem;">
    <h1 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">Mediator 패턴</h1>
    <p style="color: #555; margin-bottom: 1.5rem;">
      <code>ChatRoom</code>이 <code>provide</code>로 중재자를 주입하면,
      각 <code>UserPanel</code>은 <code>inject</code>로 중재자를 가져와 서로 직접 참조 없이 통신한다.
      한 패널에서 메시지를 전송하면 중재자가 다른 모든 패널의 수신함에 전달한다.
      프리미엄 사용자는 메시지를 대문자로 수신한다.
    </p>

    <!-- ChatRoom: Mediator provide -->
    <ChatRoom room-name="Vue 디자인 패턴 스터디">
      <!-- UserPanel들: Colleague (서로를 직접 참조하지 않는다) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <UserPanel user-name="홍길동" user-type="regular" />
        <UserPanel user-name="김철수" user-type="premium" />
        <UserPanel user-name="이영희" user-type="regular" />
      </div>
    </ChatRoom>

    <!-- 패턴 설명 -->
    <div style="margin-top: 1.5rem; padding: 1rem; background: #fffbeb; border: 1px solid #f6e05e; border-radius: 6px; font-size: 0.85rem; color: #744210;">
      <strong>패턴 포인트:</strong>
      <ul style="margin: 0.5rem 0 0; padding-left: 1.2rem;">
        <li>각 UserPanel은 다른 UserPanel을 import하지 않는다.</li>
        <li>모든 메시지는 ChatRoom(중재자)을 통해 라우팅된다.</li>
        <li>김철수(프리미엄)의 수신함 내용이 대문자인 것을 확인하세요.</li>
        <li>새 사용자를 추가해도 기존 UserPanel 코드는 변경하지 않는다.</li>
      </ul>
    </div>
  </div>
</template>
