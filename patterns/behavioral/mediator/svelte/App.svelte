<script lang="ts">
  // ─────────────────────────────────────────────────────────────────────────────
  // Mediator 패턴 — Svelte 5 runes 구현
  //
  // 역할 매핑:
  //   chatRooms ($state)          → ConcreteMediator (ChatRoom)
  //   users ($state)              → ConcreteColleague (RegularUser, PremiumUser)
  //   sendMessage()               → Mediator.sendMessage() (라우팅 로직)
  //   $effect                     → 메시지가 모든 수신자에게 자동 전달
  //
  // 핵심 아이디어:
  //   TypeScript에서는 User가 mediator.sendMessage()를 호출해 간접 통신했지만,
  //   Svelte에서는 $state 공유 채팅방이 Mediator 역할을 하고,
  //   어떤 사용자도 다른 사용자를 직접 참조하지 않는다.
  //   모든 메시지는 채팅방($state)을 통해서만 흐른다.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Colleague 타입 ────────────────────────────────────────────────────────
  type UserType = 'regular' | 'premium'

  interface ChatUser {
    id: number
    name: string
    type: UserType
    icon: string
    // ConcreteColleague의 receivedMessages에 해당
    inbox: Array<{ from: string; message: string; time: string; roomId: number }>
  }

  // ── ConcreteMediator: 채팅방 ($state) ────────────────────────────────────
  // TypeScript의 ChatRoom 클래스에 해당한다
  interface ChatRoom {
    id: number
    name: string
    color: string
    // 채팅방의 메시지 목록 (Mediator를 통한 모든 통신이 여기 기록됨)
    messages: Array<{ from: string; fromId: number; message: string; time: string }>
    // 채팅방 참가자 ID 목록
    memberIds: number[]
  }

  // ── $state: 사용자 목록 (Colleague들) ─────────────────────────────────────
  let users = $state<ChatUser[]>([
    { id: 1, name: '홍길동', type: 'regular', icon: '👤', inbox: [] },
    { id: 2, name: '김철수', type: 'premium', icon: '⭐', inbox: [] },
    { id: 3, name: '이영희', type: 'regular', icon: '👤', inbox: [] },
    { id: 4, name: '박지민', type: 'premium', icon: '⭐', inbox: [] },
  ])

  // ── $state: 채팅방 목록 (ConcreteMediator들) ─────────────────────────────
  let rooms = $state<ChatRoom[]>([
    { id: 1, name: '일반 채팅방', color: '#3b82f6', messages: [], memberIds: [1, 2, 3] },
    { id: 2, name: '프리미엄 라운지', color: '#f59e0b', messages: [], memberIds: [2, 4] },
    { id: 3, name: '공지 채널', color: '#10b981', messages: [], memberIds: [1, 2, 3, 4] },
  ])

  // 현재 선택된 채팅방과 발신자
  let selectedRoomId = $state(1)
  let selectedSenderId = $state(1)
  let messageText = $state('')

  // $derived: 현재 채팅방
  let currentRoom = $derived(rooms.find(r => r.id === selectedRoomId)!)
  // $derived: 현재 채팅방의 멤버들
  let roomMembers = $derived(users.filter(u => currentRoom.memberIds.includes(u.id)))

  // ── Mediator.sendMessage(): 핵심 라우팅 로직 ─────────────────────────────
  // TypeScript의 ChatRoom.sendMessage()에 해당
  // sender는 다른 user를 직접 참조하지 않고, 오직 이 함수만 호출한다
  function sendMessage(senderId: number, roomId: number, message: string) {
    if (!message.trim()) return

    const sender = users.find(u => u.id === senderId)
    if (!sender) return

    const room = rooms.find(r => r.id === roomId)
    if (!room) return

    // 발신자가 해당 채팅방 멤버인지 확인
    if (!room.memberIds.includes(senderId)) {
      alert(`${sender.name}은(는) "${room.name}"의 멤버가 아닙니다.`)
      return
    }

    const time = new Date().toLocaleTimeString()

    // Mediator가 채팅방 메시지 목록에 기록 (중재자의 라우팅)
    room.messages = [...room.messages, { from: sender.name, fromId: senderId, message, time }]

    // Mediator가 모든 수신자의 inbox에 메시지 전달
    // 중요: 발신자 자신에게는 보내지 않는다 (ConcreteMediator의 핵심 로직)
    users = users.map(user => {
      if (user.id === senderId) return user  // 발신자 제외
      if (!room.memberIds.includes(user.id)) return user  // 채팅방 멤버만

      // 프리미엄 사용자는 메시지를 대문자로 받는다 (ConcreteObserver별 다른 동작)
      const receivedMsg = user.type === 'premium' ? message.toUpperCase() : message
      return {
        ...user,
        inbox: [
          { from: sender.name, message: receivedMsg, time, roomId },
          ...user.inbox,
        ],
      }
    })

    messageText = ''
  }

  // 선택된 사용자 (inbox 보기)
  let viewingUserId = $state<number | null>(null)
  let viewingUser = $derived(viewingUserId ? users.find(u => u.id === viewingUserId) : null)
</script>

<main>
  <h1>Mediator 패턴</h1>
  <p class="desc">
    사용자들은 서로 직접 통신하지 않고, 채팅방(<strong>Mediator</strong>)을 통해서만 메시지를 주고받는다.
    모든 라우팅 로직은 <code>sendMessage()</code>에 집중된다.
  </p>

  <div class="layout">
    <!-- 채팅 인터페이스 -->
    <section class="card">
      <h2>채팅방 (ConcreteMediator)</h2>

      <!-- 채팅방 탭 -->
      <div class="room-tabs">
        {#each rooms as room}
          <button
            class="room-tab"
            class:active={selectedRoomId === room.id}
            style="--color: {room.color}"
            onclick={() => (selectedRoomId = room.id)}
          >
            {room.name}
            <span class="msg-count">{room.messages.length}</span>
          </button>
        {/each}
      </div>

      <!-- 채팅방 멤버 표시 -->
      <div class="members-bar">
        멤버:
        {#each roomMembers as member}
          <span class="member-chip">{member.icon} {member.name}</span>
        {/each}
      </div>

      <!-- 메시지 목록 -->
      <div class="chat-messages">
        {#if currentRoom.messages.length === 0}
          <div class="empty">아직 메시지 없음</div>
        {:else}
          {#each currentRoom.messages as msg}
            <div class="msg" class:mine={msg.fromId === selectedSenderId}>
              <span class="msg-from">{msg.from}</span>
              <span class="msg-text">{msg.message}</span>
              <span class="msg-time">{msg.time}</span>
            </div>
          {/each}
        {/if}
      </div>

      <!-- 메시지 전송 -->
      <div class="send-area">
        <select bind:value={selectedSenderId}>
          {#each users as user}
            <option value={user.id}>{user.icon} {user.name}</option>
          {/each}
        </select>
        <input
          bind:value={messageText}
          placeholder="메시지 입력..."
          onkeydown={(e) => e.key === 'Enter' && sendMessage(selectedSenderId, selectedRoomId, messageText)}
        />
        <button
          class="btn-send"
          style="background: {currentRoom.color}"
          onclick={() => sendMessage(selectedSenderId, selectedRoomId, messageText)}
        >
          전송
        </button>
      </div>
    </section>

    <!-- 사용자 받은 편지함 (Colleague 상태) -->
    <section class="card">
      <h2>사용자 (Colleague) 받은 편지함</h2>
      <p class="mediator-note">
        각 사용자는 다른 사용자를 직접 참조하지 않는다.<br/>
        모든 메시지는 Mediator(채팅방)를 통해서만 전달된다.
      </p>

      <div class="user-list">
        {#each users as user}
          <div class="user-card" class:selected={viewingUserId === user.id}>
            <button class="user-info-btn" onclick={() => viewingUserId = viewingUserId === user.id ? null : user.id}>
              <span class="user-icon">{user.icon}</span>
              <div>
                <div class="user-name">{user.name}</div>
                <div class="user-type">{user.type === 'premium' ? '⭐ 프리미엄' : '일반 사용자'}</div>
              </div>
              <span class="user-inbox-count">{user.inbox.length}개</span>
            </button>

            {#if viewingUserId === user.id}
              <div class="user-inbox">
                {#if user.inbox.length === 0}
                  <div class="empty-inbox">수신된 메시지 없음</div>
                {:else}
                  {#each user.inbox.slice(0, 5) as msg}
                    <div class="inbox-msg">
                      <span class="inbox-from">{msg.from}</span>
                      <span class="inbox-text">{msg.message}</span>
                      {#if user.type === 'premium'}
                        <span class="premium-note">대문자 수신</span>
                      {/if}
                    </div>
                  {/each}
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  </div>

  <div class="explanation">
    <h3>TypeScript vs Svelte 구현 차이</h3>
    <ul>
      <li><strong>TS:</strong> <code>User</code>가 <code>mediator.sendMessage(msg, this)</code>를 호출해 간접 통신</li>
      <li><strong>Svelte:</strong> <code>$state</code> 채팅방이 Mediator, <code>sendMessage()</code>가 모든 라우팅 담당</li>
      <li><strong>결합도:</strong> 사용자들은 서로를 전혀 참조하지 않음 — 오직 Mediator(채팅방)만 안다</li>
    </ul>
  </div>
</main>

<style>
  main { font-family: sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
  h1 { color: #ec4899; margin-bottom: 0.25rem; }
  .desc { color: #64748b; margin-bottom: 1.5rem; }
  .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; }
  h2 { font-size: 1rem; margin-top: 0; color: #374151; }
  .room-tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
  .room-tab {
    display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem;
    border: 2px solid var(--color); border-radius: 20px; background: white;
    cursor: pointer; font-size: 0.82rem; transition: all 0.15s;
  }
  .room-tab.active { background: var(--color); color: white; }
  .msg-count { background: rgba(255,255,255,0.3); border-radius: 10px; padding: 0.05rem 0.35rem; font-size: 0.72rem; }
  .room-tab:not(.active) .msg-count { background: #f1f5f9; color: #6b7280; }
  .members-bar { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: #6b7280; margin-bottom: 0.5rem; flex-wrap: wrap; }
  .member-chip { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 0.15rem 0.5rem; border-radius: 10px; font-size: 0.78rem; }
  .chat-messages {
    height: 200px; overflow-y: auto; background: white; border: 1px solid #e2e8f0;
    border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem;
  }
  .msg { display: flex; align-items: baseline; gap: 0.4rem; font-size: 0.85rem; }
  .msg.mine .msg-from { color: #ec4899; }
  .msg-from { font-weight: 700; color: #374151; white-space: nowrap; font-size: 0.8rem; }
  .msg-text { flex: 1; color: #374151; }
  .msg-time { font-size: 0.72rem; color: #94a3b8; white-space: nowrap; }
  .send-area { display: flex; gap: 0.4rem; }
  .send-area select, .send-area input {
    padding: 0.4rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem;
  }
  .send-area input { flex: 1; }
  .btn-send { color: white; border: none; padding: 0.4rem 0.9rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; white-space: nowrap; }
  .mediator-note { font-size: 0.82rem; color: #6b7280; background: #fdf4ff; border: 1px solid #e9d5ff; border-radius: 7px; padding: 0.5rem 0.75rem; margin-bottom: 0.75rem; line-height: 1.5; }
  .user-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .user-card { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .user-card.selected { border-color: #ec4899; }
  .user-info-btn {
    width: 100%; display: flex; align-items: center; gap: 0.6rem;
    background: white; border: none; padding: 0.6rem 0.75rem; cursor: pointer; font-size: 0.88rem;
  }
  .user-info-btn:hover { background: #fdf4ff; }
  .user-icon { font-size: 1.3rem; }
  .user-name { font-weight: 600; font-size: 0.88rem; text-align: left; }
  .user-type { font-size: 0.75rem; color: #6b7280; }
  .user-inbox-count { margin-left: auto; background: #f1f5f9; padding: 0.15rem 0.5rem; border-radius: 10px; font-size: 0.75rem; color: #374151; }
  .user-inbox { background: #f8fafc; padding: 0.5rem 0.75rem; border-top: 1px solid #e2e8f0; max-height: 120px; overflow-y: auto; }
  .inbox-msg { display: flex; gap: 0.4rem; align-items: baseline; padding: 0.25rem 0; border-bottom: 1px solid #e2e8f0; font-size: 0.8rem; }
  .inbox-from { font-weight: 600; color: #374151; white-space: nowrap; }
  .inbox-text { flex: 1; color: #6b7280; word-break: break-all; }
  .premium-note { font-size: 0.7rem; background: #fef3c7; color: #92400e; padding: 0.05rem 0.3rem; border-radius: 3px; white-space: nowrap; }
  .empty-inbox { color: #94a3b8; font-size: 0.78rem; text-align: center; padding: 0.5rem; }
  .empty { color: #94a3b8; font-size: 0.82rem; text-align: center; margin: auto; }
  code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.8rem; }
  .explanation { margin-top: 2rem; background: #fdf4ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.9rem; }
  .explanation ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
  .explanation li { margin-bottom: 0.4rem; }
</style>
