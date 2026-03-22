// =============================================================================
// 데코레이터 패턴 (Decorator Pattern)
// =============================================================================
// 목적: 객체에 동적으로 새로운 책임을 추가한다.
//       서브클래싱 대신 래핑(wrapping)으로 기능을 확장한다.
//
// 왜 필요한가?
// - 커피 주문 시스템에서 "에스프레소+우유+시럽+휘핑크림"처럼 조합이 다양하다.
// - 상속으로 모든 조합을 만들면 클래스 수가 폭발적으로 늘어난다.
// - 데코레이터는 기존 객체를 감싸는 방식으로 런타임에 기능을 추가한다.
//
// 역할 매핑:
//   Beverage (Component)           → 음료의 공통 인터페이스
//   Espresso, Drip (ConcreteComponent) → 기본 음료 (데코레이팅 대상)
//   CondimentDecorator (Decorator) → 모든 토핑의 기반 클래스, Beverage를 감싼다
//   Milk, Syrup, WhipCream (ConcreteDecorator) → 실제 토핑 구현체
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// Component: 공통 인터페이스
// 기본 음료와 모든 데코레이터가 이 인터페이스를 구현한다.
// 덕분에 데코레이터로 감싼 객체를 원본과 동일하게 취급할 수 있다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Component 인터페이스: 모든 음료의 공통 인터페이스
 *
 * 왜 인터페이스인가?
 * - 기본 음료(Espresso)와 토핑 데코레이터(Milk)가 같은 타입으로 다뤄져야
 *   데코레이터를 재귀적으로 중첩할 수 있다.
 */
export interface Beverage {
  /** 음료 설명 반환 (데코레이터를 거칠 때마다 내용이 추가된다) */
  getDescription(): string;
  /** 음료 가격 반환 (데코레이터를 거칠 때마다 가격이 누적된다) */
  getCost(): number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ConcreteComponent: 기본 음료 (데코레이팅의 대상)
// 가장 안쪽에 위치하며, 데코레이터들이 이 객체를 감싼다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ConcreteComponent 1: 에스프레소
 * 아무 토핑도 없는 기본 에스프레소
 */
export class Espresso implements Beverage {
  getDescription(): string {
    return "에스프레소";
  }

  getCost(): number {
    return 1500;  // 원화 기준
  }
}

/**
 * ConcreteComponent 2: 드립 커피
 * 기본 드립 커피
 */
export class DripCoffee implements Beverage {
  getDescription(): string {
    return "드립 커피";
  }

  getCost(): number {
    return 1200;
  }
}

/**
 * ConcreteComponent 3: 디카페인
 */
export class Decaf implements Beverage {
  getDescription(): string {
    return "디카페인";
  }

  getCost(): number {
    return 1700;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Decorator: 데코레이터 기반 클래스
// Beverage를 구현하면서 동시에 Beverage를 내부에 보유한다.
// 이 "자기 참조" 구조가 데코레이터 패턴의 핵심이다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decorator 기반 클래스: 모든 토핑 데코레이터의 부모
 *
 * 핵심 설계:
 * - Beverage를 구현(implements)한다 → 데코레이터 자체도 Beverage로 취급 가능
 * - Beverage를 보유(has-a)한다 → 내부 음료에 작업을 위임할 수 있다
 * 이 두 가지가 동시에 성립하기 때문에 무한 중첩이 가능하다.
 */
export abstract class CondimentDecorator implements Beverage {
  // 감싸고 있는 음료에 대한 참조
  // 이 음료는 기본 커피일 수도 있고, 이미 다른 토핑으로 감싸진 커피일 수도 있다.
  protected beverage: Beverage;

  constructor(beverage: Beverage) {
    this.beverage = beverage;
  }

  // 서브클래스가 이 메서드들을 오버라이드하여 자신의 기여분을 추가한다.
  abstract getDescription(): string;
  abstract getCost(): number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ConcreteDecorator: 실제 토핑 구현체들
// 각각 내부 음료의 설명/가격에 자신의 내용을 추가한다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ConcreteDecorator: 우유 추가
 */
export class Milk extends CondimentDecorator {
  getDescription(): string {
    // 내부 음료의 설명에 "우유"를 덧붙인다.
    // 체이닝: "에스프레소" → "에스프레소 + 우유"
    return this.beverage.getDescription() + " + 우유";
  }

  getCost(): number {
    // 내부 음료의 가격에 우유 가격을 더한다.
    return this.beverage.getCost() + 300;
  }
}

/**
 * ConcreteDecorator: 시럽 추가
 */
export class Syrup extends CondimentDecorator {
  private flavor: string;

  constructor(beverage: Beverage, flavor: string = "바닐라") {
    super(beverage);
    this.flavor = flavor;
  }

  getDescription(): string {
    return this.beverage.getDescription() + ` + ${this.flavor} 시럽`;
  }

  getCost(): number {
    return this.beverage.getCost() + 500;
  }
}

/**
 * ConcreteDecorator: 휘핑크림 추가
 */
export class WhipCream extends CondimentDecorator {
  getDescription(): string {
    return this.beverage.getDescription() + " + 휘핑크림";
  }

  getCost(): number {
    return this.beverage.getCost() + 600;
  }
}

/**
 * ConcreteDecorator: 샷 추가
 */
export class ExtraShot extends CondimentDecorator {
  private shots: number;

  constructor(beverage: Beverage, shots: number = 1) {
    super(beverage);
    this.shots = shots;
  }

  getDescription(): string {
    return this.beverage.getDescription() + ` + 샷 ${this.shots}개 추가`;
  }

  getCost(): number {
    return this.beverage.getCost() + (400 * this.shots);
  }
}

/**
 * ConcreteDecorator: 두유 (우유 대체)
 */
export class SoyMilk extends CondimentDecorator {
  getDescription(): string {
    return this.beverage.getDescription() + " + 두유";
  }

  getCost(): number {
    return this.beverage.getCost() + 500;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 유틸리티: 주문 요약 출력 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 음료 주문 요약을 반환한다.
 */
export function getOrderSummary(beverage: Beverage): string {
  return `${beverage.getDescription()} — ${beverage.getCost()}원`;
}
