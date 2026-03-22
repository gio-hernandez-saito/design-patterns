/**
 * Mediator 패턴 테스트
 *
 * 테스트 목표:
 * 1. 중재자를 통한 메시지 전달이 올바르게 작동하는지 확인
 * 2. 보낸 사람 자신에게는 메시지가 돌아오지 않는지 확인 (직접 통신 차단)
 * 3. 여러 사용자가 있을 때 모든 나머지 사용자에게 전달되는지 확인
 * 4. 다른 타입의 Colleague(RegularUser, PremiumUser)가 함께 동작하는지 확인
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChatRoom, RegularUser, PremiumUser } from './mediator';

describe('Mediator 패턴 — ChatRoom', () => {
  // 각 테스트마다 새 채팅방을 만들어 테스트 간 독립성을 보장한다.
  let chatRoom: ChatRoom;

  beforeEach(() => {
    chatRoom = new ChatRoom('테스트 채팅방');
  });

  // -------------------------------------------------------------------------
  // 기본 메시지 전달 테스트
  // -------------------------------------------------------------------------

  it('사용자 등록 시 채팅방 인원수가 증가한다', () => {
    expect(chatRoom.getUserCount()).toBe(0);

    // RegularUser 생성자가 자동으로 chatRoom.registerUser()를 호출한다.
    new RegularUser(chatRoom, '앨리스');
    expect(chatRoom.getUserCount()).toBe(1);

    new RegularUser(chatRoom, '밥');
    expect(chatRoom.getUserCount()).toBe(2);
  });

  it('메시지를 보내면 보낸 사람을 제외한 모든 사용자가 수신한다', () => {
    const alice = new RegularUser(chatRoom, '앨리스');
    const bob = new RegularUser(chatRoom, '밥');
    const charlie = new RegularUser(chatRoom, '찰리');

    // 앨리스가 메시지를 보낸다.
    alice.send('안녕하세요!');

    // 밥과 찰리는 메시지를 받아야 한다.
    expect(bob.receivedMessages).toHaveLength(1);
    expect(bob.receivedMessages[0]).toEqual({
      sender: '앨리스',
      message: '안녕하세요!',
    });

    expect(charlie.receivedMessages).toHaveLength(1);
    expect(charlie.receivedMessages[0]).toEqual({
      sender: '앨리스',
      message: '안녕하세요!',
    });
  });

  it('보낸 사람 자신은 자신의 메시지를 수신하지 않는다 (직접 통신 차단)', () => {
    const alice = new RegularUser(chatRoom, '앨리스');
    new RegularUser(chatRoom, '밥');

    alice.send('자기 자신에게는 안 온다');

    // 앨리스는 receivedMessages가 없다 (RegularUser에 배열이 있지만 자기 자신은 수신 대상에서 제외됨).
    expect(alice.receivedMessages).toHaveLength(0);
  });

  it('여러 사용자가 각자 메시지를 보낼 수 있다', () => {
    const alice = new RegularUser(chatRoom, '앨리스');
    const bob = new RegularUser(chatRoom, '밥');

    alice.send('안녕, 밥!');
    bob.send('안녕, 앨리스!');

    // 앨리스는 밥의 메시지를 수신해야 한다.
    expect(alice.receivedMessages).toHaveLength(1);
    expect(alice.receivedMessages[0].sender).toBe('밥');

    // 밥은 앨리스의 메시지를 수신해야 한다.
    expect(bob.receivedMessages).toHaveLength(1);
    expect(bob.receivedMessages[0].sender).toBe('앨리스');
  });

  // -------------------------------------------------------------------------
  // 다른 타입의 Colleague 혼용 테스트
  // -------------------------------------------------------------------------

  it('RegularUser와 PremiumUser가 같은 채팅방에서 함께 동작한다', () => {
    const alice = new RegularUser(chatRoom, '앨리스');
    const premium = new PremiumUser(chatRoom, '프리미엄유저');

    alice.send('일반 사용자 메시지');
    premium.send('프리미엄 사용자 메시지');

    // 프리미엄 유저는 앨리스 메시지를 받는다.
    expect(premium.receivedMessages).toHaveLength(1);
    expect(premium.receivedMessages[0].message).toBe('일반 사용자 메시지');

    // 앨리스는 프리미엄 유저 메시지를 받는다.
    expect(alice.receivedMessages).toHaveLength(1);
    expect(alice.receivedMessages[0].message).toBe('프리미엄 사용자 메시지');
  });

  // -------------------------------------------------------------------------
  // 엣지 케이스 테스트
  // -------------------------------------------------------------------------

  it('혼자 있는 채팅방에서 메시지를 보내도 에러가 없다', () => {
    const alice = new RegularUser(chatRoom, '앨리스');

    // 다른 사람이 없어도 send()는 정상 동작해야 한다.
    expect(() => alice.send('혼자 보내는 메시지')).not.toThrow();
    expect(alice.receivedMessages).toHaveLength(0);
  });

  it('여러 메시지를 순서대로 수신한다', () => {
    const alice = new RegularUser(chatRoom, '앨리스');
    const bob = new RegularUser(chatRoom, '밥');

    alice.send('첫 번째');
    alice.send('두 번째');
    alice.send('세 번째');

    expect(bob.receivedMessages).toHaveLength(3);
    expect(bob.receivedMessages[0].message).toBe('첫 번째');
    expect(bob.receivedMessages[1].message).toBe('두 번째');
    expect(bob.receivedMessages[2].message).toBe('세 번째');
  });

  it('채팅방 이름이 올바르게 설정된다', () => {
    expect(chatRoom.roomName).toBe('테스트 채팅방');
  });
});
