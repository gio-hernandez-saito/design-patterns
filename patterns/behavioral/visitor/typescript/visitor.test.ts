/**
 * Visitor 패턴 테스트
 *
 * 테스트 목표:
 * 1. Double dispatch가 올바르게 동작하는지 확인 (각 도형에 맞는 메서드가 호출되는지)
 * 2. AreaVisitor가 면적을 올바르게 계산하는지 확인
 * 3. PerimeterVisitor가 둘레를 올바르게 계산하는지 확인
 * 4. 새 Visitor 추가가 기존 코드 수정 없이 가능한지 확인
 * 5. 도형 컬렉션에 Visitor를 적용하는 방법 확인
 */

import { describe, it, expect } from 'vitest';
import {
  Circle,
  Rectangle,
  Triangle,
  AreaVisitor,
  PerimeterVisitor,
  DescriptionVisitor,
  Shape,
} from './visitor';

describe('Visitor 패턴 — 도형 계산', () => {
  // -------------------------------------------------------------------------
  // AreaVisitor 테스트
  // -------------------------------------------------------------------------

  describe('AreaVisitor (면적 계산)', () => {
    const areaVisitor = new AreaVisitor();

    it('원의 면적을 올바르게 계산한다: π × r²', () => {
      const circle = new Circle(5);
      const area = circle.accept(areaVisitor);

      // π × 5² = 78.539...
      expect(area).toBeCloseTo(Math.PI * 25, 5);
    });

    it('반지름 1인 원의 면적은 π이다', () => {
      const circle = new Circle(1);
      expect(circle.accept(areaVisitor)).toBeCloseTo(Math.PI, 5);
    });

    it('직사각형의 면적을 올바르게 계산한다: 너비 × 높이', () => {
      const rect = new Rectangle(4, 6);
      const area = rect.accept(areaVisitor);

      expect(area).toBe(24);
    });

    it('정사각형(가로=세로)의 면적도 올바르게 계산한다', () => {
      const square = new Rectangle(5, 5);
      expect(square.accept(areaVisitor)).toBe(25);
    });

    it('삼각형의 면적을 헤론의 공식으로 올바르게 계산한다', () => {
      // 3-4-5 직각삼각형: 면적 = (3 × 4) / 2 = 6
      const triangle = new Triangle(3, 4, 5);
      expect(triangle.accept(areaVisitor)).toBeCloseTo(6, 5);
    });

    it('정삼각형의 면적을 올바르게 계산한다', () => {
      // 변의 길이가 2인 정삼각형: 면적 = √3 ≈ 1.732
      const equilateral = new Triangle(2, 2, 2);
      expect(equilateral.accept(areaVisitor)).toBeCloseTo(Math.sqrt(3), 5);
    });
  });

  // -------------------------------------------------------------------------
  // PerimeterVisitor 테스트
  // -------------------------------------------------------------------------

  describe('PerimeterVisitor (둘레 계산)', () => {
    const perimeterVisitor = new PerimeterVisitor();

    it('원의 둘레를 올바르게 계산한다: 2 × π × r', () => {
      const circle = new Circle(3);
      const perimeter = circle.accept(perimeterVisitor);

      expect(perimeter).toBeCloseTo(2 * Math.PI * 3, 5);
    });

    it('직사각형의 둘레를 올바르게 계산한다: 2 × (너비 + 높이)', () => {
      const rect = new Rectangle(4, 6);
      const perimeter = rect.accept(perimeterVisitor);

      expect(perimeter).toBe(20);
    });

    it('삼각형의 둘레를 올바르게 계산한다: 세 변의 합', () => {
      const triangle = new Triangle(3, 4, 5);
      const perimeter = triangle.accept(perimeterVisitor);

      expect(perimeter).toBe(12);
    });
  });

  // -------------------------------------------------------------------------
  // Double Dispatch 검증 테스트
  // -------------------------------------------------------------------------

  it('double dispatch: Shape 타입으로 다뤄도 올바른 visit 메서드가 호출된다', () => {
    // Shape 인터페이스 타입으로 다형성을 사용할 때도 올바르게 동작해야 한다.
    const shapes: Shape[] = [
      new Circle(1),
      new Rectangle(2, 3),
      new Triangle(3, 4, 5),
    ];

    const areaVisitor = new AreaVisitor();
    const areas = shapes.map(shape => shape.accept(areaVisitor));

    // 원: π × 1² ≈ 3.14
    expect(areas[0]).toBeCloseTo(Math.PI, 5);
    // 직사각형: 2 × 3 = 6
    expect(areas[1]).toBe(6);
    // 삼각형 (3-4-5): 면적 = 6
    expect(areas[2]).toBeCloseTo(6, 5);
  });

  it('같은 도형 배열에 두 가지 Visitor를 적용할 수 있다', () => {
    const shapes: Shape[] = [
      new Rectangle(3, 4),
      new Circle(2),
    ];

    const areaVisitor = new AreaVisitor();
    const perimeterVisitor = new PerimeterVisitor();

    const areas = shapes.map(s => s.accept(areaVisitor));
    const perimeters = shapes.map(s => s.accept(perimeterVisitor));

    // 직사각형 면적: 12, 원 면적: 4π
    expect(areas[0]).toBe(12);
    expect(areas[1]).toBeCloseTo(4 * Math.PI, 5);

    // 직사각형 둘레: 14, 원 둘레: 4π
    expect(perimeters[0]).toBe(14);
    expect(perimeters[1]).toBeCloseTo(4 * Math.PI, 5);
  });

  // -------------------------------------------------------------------------
  // 새 Visitor 추가 테스트 (개방/폐쇄 원칙 검증)
  // -------------------------------------------------------------------------

  it('DescriptionVisitor: 기존 도형 클래스 수정 없이 새 동작을 추가할 수 있다', () => {
    const shapes: Shape[] = [
      new Circle(5),
      new Rectangle(3, 4),
      new Triangle(3, 4, 5),
    ];

    // 새 Visitor(DescriptionVisitor)를 추가했지만 Circle, Rectangle, Triangle은 전혀 수정하지 않았다.
    const descVisitor = new DescriptionVisitor();
    shapes.forEach(shape => shape.accept(descVisitor));

    expect(descVisitor.descriptions).toHaveLength(3);
    expect(descVisitor.descriptions[0]).toContain('원');
    expect(descVisitor.descriptions[1]).toContain('직사각형');
    expect(descVisitor.descriptions[2]).toContain('삼각형');
  });

  // -------------------------------------------------------------------------
  // 도형 이름 테스트
  // -------------------------------------------------------------------------

  it('각 도형이 올바른 이름을 반환한다', () => {
    expect(new Circle(3).getName()).toContain('원');
    expect(new Rectangle(4, 5).getName()).toContain('직사각형');
    expect(new Triangle(3, 4, 5).getName()).toContain('삼각형');
  });
});
