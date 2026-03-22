/**
 * Abstract Factory 패턴
 *
 * 목적: 관련된 객체들의 집합(제품군)을 생성하기 위한 인터페이스를 제공하되,
 *       구체적인 클래스를 지정하지 않는다. 서로 어울리는 객체들을 일관성 있게 생성한다.
 *
 * Factory Method와의 차이:
 * - Factory Method: 하나의 제품을 만드는 메서드를 서브클래스에 위임
 * - Abstract Factory: 서로 연관된 여러 제품을 함께 만드는 공장 자체를 추상화
 *
 * 핵심 아이디어:
 * - AbstractFactory가 제품군 전체를 만드는 메서드들을 선언한다.
 * - ConcreteFactory가 같은 테마/군에 속하는 제품들을 한꺼번에 만든다.
 * - 클라이언트는 AbstractFactory만 알고, 어떤 팩토리를 주입하느냐에 따라 결과가 달라진다.
 *
 * 역할 매핑:
 * - AbstractFactory   → UIFactory (인터페이스)
 * - ConcreteFactory   → LightThemeFactory, DarkThemeFactory
 * - AbstractProduct   → Button, Input, Card (인터페이스들)
 * - ConcreteProduct   → LightButton, DarkButton, LightInput, DarkInput, LightCard, DarkCard
 * - Client            → UIRenderer (팩토리를 주입받아 사용하는 클래스)
 */

// ─────────────────────────────────────────────
// AbstractProduct: 각 제품 유형의 인터페이스
// ─────────────────────────────────────────────

/** 버튼 컴포넌트의 추상 인터페이스 — AbstractProduct 역할 */
export interface Button {
  render(): string;
  onClick(): string;
}

/** 입력 필드 컴포넌트의 추상 인터페이스 — AbstractProduct 역할 */
export interface Input {
  render(): string;
  onFocus(): string;
}

/** 카드 컴포넌트의 추상 인터페이스 — AbstractProduct 역할 */
export interface Card {
  render(): string;
  getStyle(): string;
}

// ─────────────────────────────────────────────
// ConcreteProduct (Light 테마): 밝은 테마 제품군
// ─────────────────────────────────────────────

/** 라이트 테마 버튼 — ConcreteProduct 역할 */
export class LightButton implements Button {
  public render(): string {
    return '<button style="background:#fff; color:#333; border:1px solid #ccc">버튼</button>';
  }
  public onClick(): string {
    return 'Light 버튼 클릭됨 (ripple 효과)';
  }
}

/** 라이트 테마 입력 필드 — ConcreteProduct 역할 */
export class LightInput implements Input {
  public render(): string {
    return '<input style="background:#fff; color:#333; border:1px solid #ddd" />';
  }
  public onFocus(): string {
    return 'Light 입력 필드 포커스 (파란 테두리)';
  }
}

/** 라이트 테마 카드 — ConcreteProduct 역할 */
export class LightCard implements Card {
  public render(): string {
    return '<div style="background:#fafafa; border:1px solid #eee; border-radius:8px">카드</div>';
  }
  public getStyle(): string {
    return 'light-card';
  }
}

// ─────────────────────────────────────────────
// ConcreteProduct (Dark 테마): 어두운 테마 제품군
// ─────────────────────────────────────────────

/** 다크 테마 버튼 — ConcreteProduct 역할 */
export class DarkButton implements Button {
  public render(): string {
    return '<button style="background:#1e1e1e; color:#fff; border:1px solid #555">버튼</button>';
  }
  public onClick(): string {
    return 'Dark 버튼 클릭됨 (glow 효과)';
  }
}

/** 다크 테마 입력 필드 — ConcreteProduct 역할 */
export class DarkInput implements Input {
  public render(): string {
    return '<input style="background:#2d2d2d; color:#fff; border:1px solid #555" />';
  }
  public onFocus(): string {
    return 'Dark 입력 필드 포커스 (보라색 테두리)';
  }
}

/** 다크 테마 카드 — ConcreteProduct 역할 */
export class DarkCard implements Card {
  public render(): string {
    return '<div style="background:#1a1a2e; border:1px solid #333; border-radius:8px">카드</div>';
  }
  public getStyle(): string {
    return 'dark-card';
  }
}

// ─────────────────────────────────────────────
// AbstractFactory: 제품군 생성 인터페이스
// ─────────────────────────────────────────────

/**
 * UI 컴포넌트 팩토리의 추상 인터페이스 — AbstractFactory 역할.
 *
 * 이 인터페이스를 구현하는 팩토리는 반드시 Button, Input, Card를 함께 만들어야 한다.
 * 같은 팩토리에서 만든 컴포넌트들은 서로 같은 테마를 공유하므로 일관성이 보장된다.
 */
export interface UIFactory {
  createButton(): Button;
  createInput(): Input;
  createCard(): Card;
}

// ─────────────────────────────────────────────
// ConcreteFactory: 실제 제품군을 생성하는 팩토리
// ─────────────────────────────────────────────

/**
 * 라이트 테마 컴포넌트 집합을 생성하는 팩토리 — ConcreteFactory 역할.
 *
 * 이 팩토리에서 만든 Button, Input, Card는 모두 라이트 테마로 통일된다.
 * 서로 섞이지 않으므로 UI 일관성이 깨지지 않는다.
 */
export class LightThemeFactory implements UIFactory {
  public createButton(): Button {
    return new LightButton();
  }
  public createInput(): Input {
    return new LightInput();
  }
  public createCard(): Card {
    return new LightCard();
  }
}

/**
 * 다크 테마 컴포넌트 집합을 생성하는 팩토리 — ConcreteFactory 역할.
 */
export class DarkThemeFactory implements UIFactory {
  public createButton(): Button {
    return new DarkButton();
  }
  public createInput(): Input {
    return new DarkInput();
  }
  public createCard(): Card {
    return new DarkCard();
  }
}

// ─────────────────────────────────────────────
// Client: AbstractFactory만 알고 동작하는 클라이언트
// ─────────────────────────────────────────────

/**
 * UI를 렌더링하는 클라이언트 클래스 — Client 역할.
 *
 * UIFactory 인터페이스만 알고 있으므로, LightThemeFactory를 주입하든
 * DarkThemeFactory를 주입하든 코드 변경 없이 다른 테마가 적용된다.
 * 이것이 Abstract Factory의 핵심 이점: 클라이언트가 구체 클래스에 의존하지 않는다.
 */
export class UIRenderer {
  private readonly button: Button;
  private readonly input: Input;
  private readonly card: Card;

  constructor(factory: UIFactory) {
    // 팩토리를 통해 일관된 제품군을 한 번에 생성한다
    this.button = factory.createButton();
    this.input = factory.createInput();
    this.card = factory.createCard();
  }

  /**
   * 생성된 컴포넌트들을 렌더링한 결과를 반환한다.
   */
  public renderPage(): string {
    return [
      '=== 페이지 렌더링 ===',
      this.button.render(),
      this.input.render(),
      this.card.render(),
    ].join('\n');
  }

  public getComponents(): { button: Button; input: Input; card: Card } {
    return { button: this.button, input: this.input, card: this.card };
  }
}
