/**
 * Interpreter 패턴 테스트
 *
 * 테스트 목표:
 * 1. 각 Terminal/Nonterminal Expression이 올바르게 평가되는지 확인
 * 2. 복합 식(중첩된 Expression 트리)이 올바르게 계산되는지 확인
 * 3. 변수 참조가 Context를 통해 올바르게 동작하는지 확인
 * 4. parseRPN()이 후위 표기법 문자열을 올바르게 파싱하는지 확인
 * 5. 에러 케이스(0으로 나누기, 미정의 변수)가 적절히 처리되는지 확인
 */

import { describe, it, expect } from 'vitest';
import {
  InterpreterContext,
  NumberExpression,
  VariableExpression,
  AddExpression,
  SubtractExpression,
  MultiplyExpression,
  DivideExpression,
  parseRPN,
} from './interpreter';

describe('Interpreter 패턴 — 수식 파서', () => {
  // 기본 컨텍스트 (각 테스트에서 필요시 생성)
  const emptyContext = new InterpreterContext();

  // -------------------------------------------------------------------------
  // TerminalExpression 테스트
  // -------------------------------------------------------------------------

  describe('NumberExpression (숫자 리터럴)', () => {
    it('숫자를 그대로 반환한다', () => {
      const expr = new NumberExpression(42);
      expect(expr.interpret(emptyContext)).toBe(42);
    });

    it('음수도 올바르게 처리한다', () => {
      const expr = new NumberExpression(-10);
      expect(expr.interpret(emptyContext)).toBe(-10);
    });

    it('소수점도 처리한다', () => {
      const expr = new NumberExpression(3.14);
      expect(expr.interpret(emptyContext)).toBeCloseTo(3.14);
    });
  });

  describe('VariableExpression (변수 참조)', () => {
    it('Context에서 변수값을 찾아온다', () => {
      const context = new InterpreterContext();
      context.setVariable('x', 10);

      const expr = new VariableExpression('x');
      expect(expr.interpret(context)).toBe(10);
    });

    it('정의되지 않은 변수 참조 시 에러를 던진다', () => {
      const context = new InterpreterContext();
      const expr = new VariableExpression('미정의변수');

      expect(() => expr.interpret(context)).toThrow('정의되지 않은 변수');
    });

    it('변수값이 업데이트되면 최신값을 반환한다', () => {
      const context = new InterpreterContext();
      context.setVariable('y', 5);
      const expr = new VariableExpression('y');

      expect(expr.interpret(context)).toBe(5);

      context.setVariable('y', 100);
      expect(expr.interpret(context)).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // NonterminalExpression 테스트
  // -------------------------------------------------------------------------

  describe('AddExpression (덧셈)', () => {
    it('두 숫자를 더한다', () => {
      const expr = new AddExpression(
        new NumberExpression(3),
        new NumberExpression(4)
      );
      expect(expr.interpret(emptyContext)).toBe(7);
    });

    it('중첩된 덧셈을 계산한다: (1 + 2) + 3 = 6', () => {
      const expr = new AddExpression(
        new AddExpression(new NumberExpression(1), new NumberExpression(2)),
        new NumberExpression(3)
      );
      expect(expr.interpret(emptyContext)).toBe(6);
    });
  });

  describe('SubtractExpression (뺄셈)', () => {
    it('두 숫자를 뺀다', () => {
      const expr = new SubtractExpression(
        new NumberExpression(10),
        new NumberExpression(3)
      );
      expect(expr.interpret(emptyContext)).toBe(7);
    });

    it('음수 결과도 올바르게 계산한다', () => {
      const expr = new SubtractExpression(
        new NumberExpression(3),
        new NumberExpression(10)
      );
      expect(expr.interpret(emptyContext)).toBe(-7);
    });
  });

  describe('MultiplyExpression (곱셈)', () => {
    it('두 숫자를 곱한다', () => {
      const expr = new MultiplyExpression(
        new NumberExpression(4),
        new NumberExpression(5)
      );
      expect(expr.interpret(emptyContext)).toBe(20);
    });
  });

  describe('DivideExpression (나눗셈)', () => {
    it('두 숫자를 나눈다', () => {
      const expr = new DivideExpression(
        new NumberExpression(10),
        new NumberExpression(2)
      );
      expect(expr.interpret(emptyContext)).toBe(5);
    });

    it('0으로 나누면 에러를 던진다', () => {
      const expr = new DivideExpression(
        new NumberExpression(10),
        new NumberExpression(0)
      );
      expect(() => expr.interpret(emptyContext)).toThrow('0으로 나눌 수 없습니다.');
    });
  });

  // -------------------------------------------------------------------------
  // 복합 식 테스트 (Expression 트리)
  // -------------------------------------------------------------------------

  it('복합 식: 3 + 4 * 2 = 11 (곱셈 먼저)', () => {
    // 3 + (4 * 2) = 3 + 8 = 11
    const expr = new AddExpression(
      new NumberExpression(3),
      new MultiplyExpression(new NumberExpression(4), new NumberExpression(2))
    );
    expect(expr.interpret(emptyContext)).toBe(11);
  });

  it('복합 식: (3 + 4) * 2 = 14 (괄호로 순서 변경)', () => {
    const expr = new MultiplyExpression(
      new AddExpression(new NumberExpression(3), new NumberExpression(4)),
      new NumberExpression(2)
    );
    expect(expr.interpret(emptyContext)).toBe(14);
  });

  it('변수를 포함한 복합 식: x * y + z', () => {
    const context = new InterpreterContext();
    context.setVariable('x', 3);
    context.setVariable('y', 4);
    context.setVariable('z', 5);

    // (x * y) + z = 12 + 5 = 17
    const expr = new AddExpression(
      new MultiplyExpression(
        new VariableExpression('x'),
        new VariableExpression('y')
      ),
      new VariableExpression('z')
    );

    expect(expr.interpret(context)).toBe(17);
  });

  // -------------------------------------------------------------------------
  // parseRPN() 테스트
  // -------------------------------------------------------------------------

  describe('parseRPN (후위 표기법 파서)', () => {
    it('단순 덧셈: "3 4 +"  → 7', () => {
      const expr = parseRPN('3 4 +');
      expect(expr.interpret(emptyContext)).toBe(7);
    });

    it('단순 뺄셈: "10 3 -" → 7', () => {
      const expr = parseRPN('10 3 -');
      expect(expr.interpret(emptyContext)).toBe(7);
    });

    it('단순 곱셈: "4 5 *" → 20', () => {
      const expr = parseRPN('4 5 *');
      expect(expr.interpret(emptyContext)).toBe(20);
    });

    it('단순 나눗셈: "10 2 /" → 5', () => {
      const expr = parseRPN('10 2 /');
      expect(expr.interpret(emptyContext)).toBe(5);
    });

    it('복합 식: "3 4 2 * +" → 3 + (4 * 2) = 11', () => {
      const expr = parseRPN('3 4 2 * +');
      expect(expr.interpret(emptyContext)).toBe(11);
    });

    it('복합 식: "3 4 + 2 *" → (3 + 4) * 2 = 14', () => {
      const expr = parseRPN('3 4 + 2 *');
      expect(expr.interpret(emptyContext)).toBe(14);
    });

    it('깊은 중첩: "1 2 + 3 4 + *" → (1+2) * (3+4) = 21', () => {
      const expr = parseRPN('1 2 + 3 4 + *');
      expect(expr.interpret(emptyContext)).toBe(21);
    });

    it('변수 포함 수식: "x y +" → x + y', () => {
      const context = new InterpreterContext();
      context.setVariable('x', 10);
      context.setVariable('y', 5);

      const expr = parseRPN('x y +');
      expect(expr.interpret(context)).toBe(15);
    });

    it('변수와 숫자 혼합: "x 3 * y +"', () => {
      const context = new InterpreterContext();
      context.setVariable('x', 4);
      context.setVariable('y', 2);

      // (x * 3) + y = 12 + 2 = 14
      const expr = parseRPN('x 3 * y +');
      expect(expr.interpret(context)).toBe(14);
    });

    it('단일 숫자: "42" → 42', () => {
      const expr = parseRPN('42');
      expect(expr.interpret(emptyContext)).toBe(42);
    });

    it('피연산자 부족 시 에러를 던진다', () => {
      expect(() => parseRPN('3 +')).toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // InterpreterContext 테스트
  // -------------------------------------------------------------------------

  describe('InterpreterContext (컨텍스트)', () => {
    it('변수를 설정하고 조회할 수 있다', () => {
      const context = new InterpreterContext();
      context.setVariable('a', 42);

      expect(context.getVariable('a')).toBe(42);
    });

    it('변수 존재 여부를 확인할 수 있다', () => {
      const context = new InterpreterContext();

      expect(context.hasVariable('없는변수')).toBe(false);

      context.setVariable('있는변수', 1);
      expect(context.hasVariable('있는변수')).toBe(true);
    });

    it('정의되지 않은 변수 조회 시 에러를 던진다', () => {
      const context = new InterpreterContext();
      expect(() => context.getVariable('없음')).toThrow('정의되지 않은 변수');
    });
  });
});
