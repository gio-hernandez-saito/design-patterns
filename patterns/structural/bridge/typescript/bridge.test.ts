import { describe, it, expect, beforeEach } from "vitest";
import {
  EmailSender,
  SMSSender,
  PushNotificationSender,
  SimpleNotification,
  UrgentNotification,
  MarketingNotification,
  type MessageSender,
  type SentMessage,
} from "./bridge.js";

// =============================================================================
// 브릿지 패턴 테스트
// 핵심 검증 사항:
// 1. 추상화(알림 종류)와 구현(전송 방식)이 독립적으로 동작하는지
// 2. 모든 조합(3 × 3 = 9가지)이 올바르게 동작하는지
// 3. 런타임에 구현체(전송 방식)를 교체할 수 있는지
// =============================================================================

describe("ConcreteImplementor: 전송 방식 구현체들", () => {
  describe("EmailSender", () => {
    it("이메일을 전송하고 SentMessage를 반환한다", () => {
      const sender = new EmailSender("smtp.gmail.com");
      const result = sender.send("user@example.com", "안녕하세요");

      expect(result.recipient).toBe("user@example.com");
      expect(result.content).toBe("안녕하세요");
      expect(result.channel).toBe("email");
      expect(result.sentAt).toBeInstanceOf(Date);
    });

    it("채널 이름에 SMTP 호스트가 포함된다", () => {
      const sender = new EmailSender("smtp.naver.com");
      expect(sender.getChannelName()).toContain("smtp.naver.com");
    });
  });

  describe("SMSSender", () => {
    it("SMS를 전송하고 SentMessage를 반환한다", () => {
      const sender = new SMSSender("010-1234-5678");
      const result = sender.send("홍길동", "테스트 메시지");

      expect(result.channel).toBe("sms");
      expect(result.content).toBe("테스트 메시지");
      expect(result.sentAt).toBeInstanceOf(Date);
    });

    it("90자를 초과하는 메시지는 잘려서 전송된다", () => {
      const sender = new SMSSender("010-0000-0000");
      const longMessage = "a".repeat(100);
      const result = sender.send("recipient", longMessage);

      // SMS 길이 제한: 90자 → 87자 + "..."
      expect(result.content.length).toBe(90);
      expect(result.content.endsWith("...")).toBe(true);
    });

    it("90자 이하의 메시지는 잘리지 않는다", () => {
      const sender = new SMSSender("010-0000-0000");
      const shortMessage = "안녕하세요";
      const result = sender.send("recipient", shortMessage);

      expect(result.content).toBe(shortMessage);
    });
  });

  describe("PushNotificationSender", () => {
    it("푸시 알림을 전송한다", () => {
      const sender = new PushNotificationSender("com.example.app");
      const result = sender.send("user_device_token", "새 메시지가 도착했습니다");

      expect(result.channel).toContain("push");
      expect(result.channel).toContain("com.example.app");
    });
  });
});

describe("Abstraction + Implementor 조합 테스트 (브릿지 패턴의 핵심)", () => {
  describe("SimpleNotification (추상화) + 다양한 전송 방식 (구현)", () => {
    it("이메일로 일반 알림을 보낼 수 있다", () => {
      const notification = new SimpleNotification(new EmailSender());
      const result = notification.notify("user@test.com", "주문 완료", "주문이 성공적으로 처리되었습니다");

      expect(result.content).toContain("[주문 완료]");
      expect(result.content).toContain("주문이 성공적으로 처리되었습니다");
      expect(result.channel).toBe("email");
    });

    it("SMS로 일반 알림을 보낼 수 있다", () => {
      const notification = new SimpleNotification(new SMSSender("010-0000-0000"));
      const result = notification.notify("홍길동", "배송 완료", "상품이 도착했습니다");

      expect(result.content).toContain("[배송 완료]");
      expect(result.channel).toBe("sms");
    });

    it("푸시 알림으로 일반 알림을 보낼 수 있다", () => {
      const notification = new SimpleNotification(new PushNotificationSender("my.app"));
      const result = notification.notify("device_token", "이벤트", "한정 특가!");

      expect(result.content).toContain("[이벤트]");
      expect(result.channel).toContain("push");
    });
  });

  describe("UrgentNotification (추상화) + 다양한 전송 방식 (구현)", () => {
    it("이메일로 긴급 알림을 보내면 [긴급] 접두사가 붙는다", () => {
      const notification = new UrgentNotification(new EmailSender());
      const result = notification.notify("admin@example.com", "서버 장애", "즉시 확인 필요");

      expect(result.content).toContain("[긴급: 서버 장애]");
      expect(result.content).toContain("즉시 확인 필요");
    });

    it("SMS로 긴급 알림을 보낼 수 있다", () => {
      const notification = new UrgentNotification(new SMSSender("010-1111-2222"));
      const result = notification.notify("관리자", "보안 경고", "비정상 접근 감지");

      expect(result.content).toContain("[긴급: 보안 경고]");
      expect(result.channel).toBe("sms");
    });
  });

  describe("MarketingNotification (추상화) + 다양한 전송 방식 (구현)", () => {
    it("마케팅 알림에는 캠페인 ID가 포함된다", () => {
      const notification = new MarketingNotification(new EmailSender(), "SUMMER2024");
      const result = notification.notify("user@test.com", "여름 세일", "최대 50% 할인");

      expect(result.content).toContain("SUMMER2024");
      expect(result.content).toContain("여름 세일");
    });

    it("마케팅 SMS에는 수신 거부 안내가 포함된다", () => {
      const notification = new MarketingNotification(new SMSSender("010-0000-0000"), "PROMO001");
      const result = notification.notify("홍길동", "쿠폰 도착", "5000원 할인 쿠폰");

      expect(result.content).toContain("STOP");
    });
  });
});

describe("런타임 전송 방식 교체 (setSender)", () => {
  it("동일한 알림 객체로 다른 채널로 전송할 수 있다", () => {
    const notification = new SimpleNotification(new EmailSender());

    // 이메일로 첫 번째 전송
    const emailResult = notification.notify("user@test.com", "테스트", "이메일 전송");
    expect(emailResult.channel).toBe("email");

    // 런타임에 SMS로 교체
    notification.setSender(new SMSSender("010-0000-0000"));
    const smsResult = notification.notify("홍길동", "테스트", "SMS 전송");
    expect(smsResult.channel).toBe("sms");

    // 같은 알림 객체인데 채널이 달라진 것을 확인
    expect(emailResult.channel).not.toBe(smsResult.channel);
  });

  it("전송 방식 교체 후에도 메시지 형식은 동일하다", () => {
    const notification = new UrgentNotification(new EmailSender());

    notification.setSender(new PushNotificationSender("my.app"));
    const result = notification.notify("user", "긴급 공지", "시스템 점검");

    // 전송 방식이 바뀌어도 긴급 알림 형식은 유지된다
    expect(result.content).toContain("[긴급: 긴급 공지]");
    expect(result.channel).toContain("push");
  });
});

describe("독립적 확장성 검증 (브릿지 패턴의 가치)", () => {
  it("새 전송 방식을 추가해도 기존 알림 클래스를 수정하지 않아도 된다", () => {
    // 새로운 전송 방식: 카카오 알림톡 (인라인으로 구현)
    class KakaoSender implements MessageSender {
      send(recipient: string, message: string): SentMessage {
        return {
          recipient,
          content: message,
          channel: "kakao",
          sentAt: new Date(),
        };
      }
      getChannelName(): string { return "카카오 알림톡"; }
    }

    // 기존 SimpleNotification, UrgentNotification 수정 없이 새 채널 사용
    const simpleKakao = new SimpleNotification(new KakaoSender());
    const urgentKakao = new UrgentNotification(new KakaoSender());

    const simple = simpleKakao.notify("kakao_user", "공지", "안녕하세요");
    const urgent = urgentKakao.notify("kakao_user", "긴급", "확인 필요");

    expect(simple.channel).toBe("kakao");
    expect(urgent.channel).toBe("kakao");
    expect(urgent.content).toContain("[긴급:");
  });

  it("3×3 조합이 모두 동작한다 (브릿지의 N+M 조합 지원)", () => {
    // 추상화 3개: Simple, Urgent, Marketing
    // 구현 3개: Email, SMS, Push
    // 총 9가지 조합 모두 테스트

    const senders: MessageSender[] = [
      new EmailSender(),
      new SMSSender("010-0000-0000"),
      new PushNotificationSender("app.id"),
    ];

    const results: SentMessage[] = [];

    for (const sender of senders) {
      results.push(new SimpleNotification(sender).notify("r", "제목", "내용"));
      results.push(new UrgentNotification(sender).notify("r", "제목", "내용"));
      results.push(new MarketingNotification(sender, "C001").notify("r", "제목", "내용"));
    }

    expect(results).toHaveLength(9);
    for (const result of results) {
      expect(result.content).toBeTruthy();
      expect(result.channel).toBeTruthy();
    }
  });
});
