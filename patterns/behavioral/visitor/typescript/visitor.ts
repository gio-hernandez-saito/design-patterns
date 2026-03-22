/**
 * Visitor 패턴
 *
 * 목적: 객체 구조를 변경하지 않고, 새로운 연산(동작)을 추가할 수 있게 한다.
 *
 * 핵심 아이디어:
 * - "데이터 구조"와 "연산"을 분리한다.
 * - 새 연산을 추가할 때 기존 클래스를 수정하지 않고 Visitor 클래스만 추가하면 된다.
 * - Double Dispatch: 어떤 메서드가 호출될지를 두 번의 동적 바인딩으로 결정한다.
 *   (1) accept(visitor)를 호출하는 Element의 타입
 *   (2) visitor 안에서 호출되는 메서드 — visitCircle 또는 visitRectangle
 *
 * 역할 매핑:
 * - Visitor         → ShapeVisitor 인터페이스 (각 Element 타입별 visit 메서드 계약)
 * - ConcreteVisitor → AreaVisitor, PerimeterVisitor 클래스 (실제 연산 구현)
 * - Element         → Shape 인터페이스 (accept(visitor) 메서드를 가진 계약)
 * - ConcreteElement → Circle, Rectangle 클래스 (실제 도형 데이터)
 */

// =============================================================================
// Element 인터페이스
// =============================================================================

/**
 * 방문을 받을 수 있는 모든 도형의 계약 — Element.
 *
 * accept() 메서드가 핵심이다.
 * 이 메서드에서 "자기 자신을 visitor에게 넘겨주는" double dispatch가 일어난다.
 */
export interface Shape {
  /**
   * Visitor를 받아들이고, visitor의 적절한 메서드를 호출한다.
   *
   * Double Dispatch의 두 번째 단계가 여기서 일어난다.
   * Circle은 visitor.visitCircle(this)를 호출하고,
   * Rectangle은 visitor.visitRectangle(this)를 호출한다.
   * 이를 통해 런타임에 올바른 메서드가 선택된다.
   *
   * @param visitor 연산을 수행할 Visitor
   */
  accept(visitor: ShapeVisitor): number;

  /** 도형 이름을 반환한다 */
  getName(): string;
}

// =============================================================================
// ConcreteElement 클래스들
// =============================================================================

/**
 * 원 — ConcreteElement.
 */
export class Circle implements Shape {
  /** 원의 반지름 */
  public readonly radius: number;

  constructor(radius: number) {
    this.radius = radius;
  }

  /**
   * Visitor에게 자기 자신(원)을 넘긴다.
   * Visitor는 이 정보를 바탕으로 원에 특화된 연산(visitCircle)을 실행한다.
   */
  public accept(visitor: ShapeVisitor): number {
    // "나는 Circle이다"라는 사실을 visitor에게 알려주는 것이 double dispatch의 핵심.
    // visitor.visit(this) 대신 visitCircle(this)를 직접 호출함으로써
    // 타입 캐스팅 없이 올바른 오버로드가 선택된다.
    return visitor.visitCircle(this);
  }

  public getName(): string {
    return `원 (반지름: ${this.radius})`;
  }
}

/**
 * 직사각형 — ConcreteElement.
 */
export class Rectangle implements Shape {
  /** 직사각형의 너비 */
  public readonly width: number;
  /** 직사각형의 높이 */
  public readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public accept(visitor: ShapeVisitor): number {
    return visitor.visitRectangle(this);
  }

  public getName(): string {
    return `직사각형 (너비: ${this.width}, 높이: ${this.height})`;
  }
}

/**
 * 삼각형 — ConcreteElement.
 * 새 도형 타입을 추가하는 것이 얼마나 쉬운지 보여주는 예시.
 */
export class Triangle implements Shape {
  /** 세 변의 길이 */
  public readonly a: number;
  public readonly b: number;
  public readonly c: number;

  constructor(a: number, b: number, c: number) {
    this.a = a;
    this.b = b;
    this.c = c;
  }

  public accept(visitor: ShapeVisitor): number {
    return visitor.visitTriangle(this);
  }

  public getName(): string {
    return `삼각형 (변: ${this.a}, ${this.b}, ${this.c})`;
  }
}

// =============================================================================
// Visitor 인터페이스
// =============================================================================

/**
 * 각 ConcreteElement 타입별 방문 메서드를 정의하는 계약 — Visitor.
 *
 * 새 도형(Element)이 추가되면 여기에 새 visit 메서드를 추가해야 한다.
 * (이것이 Visitor 패턴의 트레이드오프: 새 Element 추가는 어렵지만 새 연산 추가는 쉽다)
 */
export interface ShapeVisitor {
  /** 원에 대한 연산을 수행한다 */
  visitCircle(circle: Circle): number;

  /** 직사각형에 대한 연산을 수행한다 */
  visitRectangle(rectangle: Rectangle): number;

  /** 삼각형에 대한 연산을 수행한다 */
  visitTriangle(triangle: Triangle): number;
}

// =============================================================================
// ConcreteVisitor 클래스들
// =============================================================================

/**
 * 면적 계산 Visitor — ConcreteVisitor.
 *
 * 도형 클래스(Circle, Rectangle, Triangle)를 수정하지 않고
 * 면적 계산이라는 새로운 연산을 추가하는 방법을 보여준다.
 */
export class AreaVisitor implements ShapeVisitor {
  /**
   * 원의 면적 = π × r²
   */
  public visitCircle(circle: Circle): number {
    return Math.PI * circle.radius ** 2;
  }

  /**
   * 직사각형의 면적 = 너비 × 높이
   */
  public visitRectangle(rectangle: Rectangle): number {
    return rectangle.width * rectangle.height;
  }

  /**
   * 삼각형의 면적 = 헤론의 공식 사용
   * s = (a + b + c) / 2 일 때, 면적 = √(s(s-a)(s-b)(s-c))
   */
  public visitTriangle(triangle: Triangle): number {
    const { a, b, c } = triangle;
    const s = (a + b + c) / 2;
    return Math.sqrt(s * (s - a) * (s - b) * (s - c));
  }
}

/**
 * 둘레 계산 Visitor — ConcreteVisitor.
 *
 * 도형 클래스를 전혀 수정하지 않고 둘레 계산 기능을 추가했다.
 * 이것이 Visitor 패턴의 핵심 장점이다.
 */
export class PerimeterVisitor implements ShapeVisitor {
  /**
   * 원의 둘레 = 2 × π × r
   */
  public visitCircle(circle: Circle): number {
    return 2 * Math.PI * circle.radius;
  }

  /**
   * 직사각형의 둘레 = 2 × (너비 + 높이)
   */
  public visitRectangle(rectangle: Rectangle): number {
    return 2 * (rectangle.width + rectangle.height);
  }

  /**
   * 삼각형의 둘레 = 세 변의 합
   */
  public visitTriangle(triangle: Triangle): number {
    return triangle.a + triangle.b + triangle.c;
  }
}

/**
 * 정보 출력 Visitor — ConcreteVisitor.
 * 숫자가 아닌 문자열을 반환하고 싶을 때의 패턴.
 * 제네릭 Visitor로 확장하는 방법을 보여주는 예시다.
 * (여기서는 단순히 0을 반환하고 콘솔에 출력한다)
 */
export class DescriptionVisitor implements ShapeVisitor {
  public descriptions: string[] = [];

  public visitCircle(circle: Circle): number {
    this.descriptions.push(
      `원: 반지름=${circle.radius}, 면적≈${(Math.PI * circle.radius ** 2).toFixed(2)}`
    );
    return 0;
  }

  public visitRectangle(rectangle: Rectangle): number {
    this.descriptions.push(
      `직사각형: ${rectangle.width}×${rectangle.height}, 면적=${rectangle.width * rectangle.height}`
    );
    return 0;
  }

  public visitTriangle(triangle: Triangle): number {
    this.descriptions.push(
      `삼각형: 변 ${triangle.a}, ${triangle.b}, ${triangle.c}`
    );
    return 0;
  }
}
