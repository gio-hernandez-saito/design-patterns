import { describe, it, expect } from 'vitest'
import {
  EmailCreator,
  SmsCreator,
  PushCreator,
  EmailNotification,
  SmsNotification,
  PushNotification,
} from './factory-method'

describe('Factory Method — 알림 시스템', () => {
  describe('EmailCreator', () => {
    it('EmailNotification을 생성하고 이메일로 메시지를 전송한다', () => {
      const creator = new EmailCreator('user@example.com')
      const result = creator.notify('비밀번호가 변경되었습니다.')

      // Creator의 notify()가 올바른 채널명과 메시지를 포함하는지 확인
      expect(result).toContain('EMAIL 채널')
      expect(result).toContain('user@example.com')
      expect(result).toContain('비밀번호가 변경되었습니다.')
    })

    it('EmailNotification의 getChannel()은 "email"을 반환한다', () => {
      const notification = new EmailNotification('test@example.com')
      expect(notification.getChannel()).toBe('email')
    })

    it('EmailNotification.send()는 수신자와 메시지를 포함한 문자열을 반환한다', () => {
      const notification = new EmailNotification('alice@example.com')
      const result = notification.send('안녕하세요')

      expect(result).toContain('alice@example.com')
      expect(result).toContain('안녕하세요')
    })
  })

  describe('SmsCreator', () => {
    it('SmsNotification을 생성하고 SMS로 메시지를 전송한다', () => {
      const creator = new SmsCreator('010-1234-5678')
      const result = creator.notify('인증번호: 123456')

      expect(result).toContain('SMS 채널')
      expect(result).toContain('010-1234-5678')
      expect(result).toContain('인증번호: 123456')
    })

    it('SmsNotification의 getChannel()은 "sms"를 반환한다', () => {
      const notification = new SmsNotification('010-0000-0000')
      expect(notification.getChannel()).toBe('sms')
    })
  })

  describe('PushCreator', () => {
    it('PushNotification을 생성하고 푸시로 메시지를 전송한다', () => {
      const creator = new PushCreator('device-token-abc123')
      const result = creator.notify('새 메시지가 도착했습니다.')

      expect(result).toContain('PUSH 채널')
      expect(result).toContain('device-token-abc123')
      expect(result).toContain('새 메시지가 도착했습니다.')
    })

    it('PushNotification의 getChannel()은 "push"를 반환한다', () => {
      const notification = new PushNotification('token-xyz')
      expect(notification.getChannel()).toBe('push')
    })
  })

  describe('다형성 (Polymorphism)', () => {
    it('서로 다른 Creator가 각각 올바른 Product 타입을 생성한다', () => {
      // Factory Method의 핵심: 각 Creator가 자신의 타입에 맞는 Product를 반환한다
      const emailCreator = new EmailCreator('a@b.com')
      const smsCreator = new SmsCreator('010-0000-0000')
      const pushCreator = new PushCreator('token')

      // notify()는 NotificationCreator에 정의된 공통 메서드
      // 각 Creator가 올바른 채널로 전송하는지 확인한다
      expect(emailCreator.notify('test')).toContain('EMAIL')
      expect(smsCreator.notify('test')).toContain('SMS')
      expect(pushCreator.notify('test')).toContain('PUSH')
    })
  })
})
