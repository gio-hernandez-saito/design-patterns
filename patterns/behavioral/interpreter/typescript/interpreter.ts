/**
 * Interpreter 패턴
 *
 * 목적: 특정 언어(문법)에 대한 해석기를 만들기 위해,
 *       언어의 각 문법 규칙을 클래스로 표현하고 재귀적으로 해석한다.
 *
 * 핵심 아이디어:
 * - 언어의 각 문법 규칙 → 하나의 클래스.
 * - 문장은 이 클래스들의 트리(AST, Abstract Syntax Tree)로 표현된다.
 * - 해석(interpret)은 트리를 재귀적으로 순회하며 각 노드를 평가하는 것이다.
 * - 예시: "3 + 4 * 2"는 Add(Number(3), Multiply(Number(4), Number(2)))로 표현된다.
 *
 * 역할 매핑:
 * - AbstractExpression  → Expression 인터페이스 (모든 식이 구현하는 interpret 계약)
 * - TerminalExpression  → NumberExpression 클래스 (더 이상 분해되지 않는 숫자 리터럴)
 * - NonterminalExpression → AddExpression, SubtractExpression, MultiplyExpression,
 *                          DivideExpression 클래스 (하위 식을 포함하는 복합 식)
 * - Context            → InterpreterContext 클래스 (변수값 등 해석에 필요한 전역 정보)
 */

// =============================================================================
// Context 클래스
// =============================================================================

/**
 * 해석에 필요한 전역 정보를 담는 컨텍스트 — Context.
 *
 * 단순 수식 계산에는 컨텍스트가 크게 필요 없지만,
 * 변수를 사용하는 언어에서는 변수명 → 값 매핑을 여기에 보관한다.
 *
 * 예: "x + y" 식을 해석할 때 x=3, y=4라는 정보가 Context에 들어있다.
 */
export class InterpreterContext {
  // 변수 이름과 값을 매핑하는 저장소
  private variables: Map<string, number> = new Map();

  /**
   * 변수를 정의하거나 값을 업데이트한다.
   * @param name 변수 이름
   * @param value 변수 값
   */
  public setVariable(name: string, value: number): void {
    this.variables.set(name, value);
  }

  /**
   * 변수의 값을 조회한다.
   * @param name 변수 이름
   * @returns 변수 값
   * @throws 정의되지 않은 변수를 참조하면 에러를 던진다.
   */
  public getVariable(name: string): number {
    if (!this.variables.has(name)) {
      throw new Error(`정의되지 않은 변수: "${name}"`);
    }
    return this.variables.get(name)!;
  }

  /** 변수가 정의되어 있는지 확인한다 */
  public hasVariable(name: string): boolean {
    return this.variables.has(name);
  }
}

// =============================================================================
// AbstractExpression 인터페이스
// =============================================================================

/**
 * 모든 식(Expression)이 구현해야 하는 계약 — AbstractExpression.
 *
 * interpret() 메서드 하나만 있지만, 이것이 패턴의 핵심이다.
 * Terminal이든 Nonterminal이든 모두 같은 인터페이스를 통해 평가된다.
 * 이 덕분에 복잡한 중첩 식도 단순히 재귀 호출로 처리할 수 있다.
 */
export interface Expression {
  /**
   * 이 식을 주어진 컨텍스트에서 평가하고 결과값을 반환한다.
   * @param context 변수값 등 해석에 필요한 전역 정보
   * @returns 식의 평가 결과 (숫자)
   */
  interpret(context: InterpreterContext): number;
}

// =============================================================================
// TerminalExpression 클래스들
// =============================================================================

/**
 * 숫자 리터럴 — TerminalExpression.
 *
 * 더 이상 분해할 수 없는 가장 기본 단위의 식이다.
 * 트리의 "잎(leaf)" 노드에 해당한다.
 */
export class NumberExpression implements Expression {
  private readonly value: number;

  constructor(value: number) {
    this.value = value;
  }

  /**
   * 자기 자신의 값을 그대로 반환한다.
   * 컨텍스트는 필요 없다 — 값이 이미 정해져 있기 때문이다.
   */
  public interpret(_context: InterpreterContext): number {
    return this.value;
  }
}

/**
 * 변수 참조 — TerminalExpression.
 *
 * 변수 이름을 갖고 있다가, interpret() 시에 컨텍스트에서 값을 찾아온다.
 * 예: VariableExpression("x")는 context.getVariable("x")를 통해 값을 얻는다.
 */
export class VariableExpression implements Expression {
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  public interpret(context: InterpreterContext): number {
    // 컨텍스트에서 변수값을 찾아온다.
    // 변수가 없으면 InterpreterContext가 에러를 던진다.
    return context.getVariable(this.name);
  }
}

// =============================================================================
// NonterminalExpression 클래스들
// =============================================================================

/**
 * 덧셈 식 — NonterminalExpression.
 *
 * 두 개의 하위 식(left, right)을 포함한다.
 * interpret() 호출 시 두 하위 식을 각각 평가하고 그 합을 반환한다.
 *
 * 왜 재귀적으로 동작하는가?
 * left와 right는 또 다른 Expression일 수 있다.
 * 예: Add(Add(1, 2), 3) → left.interpret()이 먼저 Add(1,2)=3을 반환하고,
 *   최종적으로 3 + 3 = 6이 된다.
 */
export class AddExpression implements Expression {
  private readonly left: Expression;
  private readonly right: Expression;

  constructor(left: Expression, right: Expression) {
    this.left = left;
    this.right = right;
  }

  public interpret(context: InterpreterContext): number {
    // 재귀적으로 좌변과 우변을 평가한 뒤 더한다.
    return this.left.interpret(context) + this.right.interpret(context);
  }
}

/**
 * 뺄셈 식 — NonterminalExpression.
 */
export class SubtractExpression implements Expression {
  private readonly left: Expression;
  private readonly right: Expression;

  constructor(left: Expression, right: Expression) {
    this.left = left;
    this.right = right;
  }

  public interpret(context: InterpreterContext): number {
    return this.left.interpret(context) - this.right.interpret(context);
  }
}

/**
 * 곱셈 식 — NonterminalExpression.
 */
export class MultiplyExpression implements Expression {
  private readonly left: Expression;
  private readonly right: Expression;

  constructor(left: Expression, right: Expression) {
    this.left = left;
    this.right = right;
  }

  public interpret(context: InterpreterContext): number {
    return this.left.interpret(context) * this.right.interpret(context);
  }
}

/**
 * 나눗셈 식 — NonterminalExpression.
 */
export class DivideExpression implements Expression {
  private readonly left: Expression;
  private readonly right: Expression;

  constructor(left: Expression, right: Expression) {
    this.left = left;
    this.right = right;
  }

  public interpret(context: InterpreterContext): number {
    const divisor = this.right.interpret(context);
    // 0으로 나누는 것은 수학적으로 정의되지 않으므로 명시적으로 에러를 던진다.
    if (divisor === 0) {
      throw new Error('0으로 나눌 수 없습니다.');
    }
    return this.left.interpret(context) / divisor;
  }
}

// =============================================================================
// 편의 함수: 수식 파서
// =============================================================================

/**
 * 공백으로 구분된 후위 표기법(Reverse Polish Notation) 문자열을 파싱해
 * Expression 트리를 만드는 파서.
 *
 * 후위 표기법을 사용하는 이유:
 * 일반 중위 표기법(a + b)은 연산자 우선순위와 괄호 처리가 복잡하지만,
 * 후위 표기법(a b +)은 스택만으로 간단하게 파싱할 수 있다.
 *
 * 예시:
 * - "3 4 +"  → AddExpression(Number(3), Number(4)) → 7
 * - "3 4 2 * +" → AddExpression(Number(3), MultiplyExpression(Number(4), Number(2))) → 11
 *
 * @param expression 후위 표기법 수식 문자열
 * @returns 파싱된 Expression 트리
 */
export function parseRPN(expression: string): Expression {
  const tokens = expression.trim().split(/\s+/);
  const stack: Expression[] = [];

  for (const token of tokens) {
    if (token === '+' || token === '-' || token === '*' || token === '/') {
      // 연산자: 스택에서 피연산자 두 개를 꺼낸다.
      // 스택에서 꺼내는 순서가 반대이므로 right를 먼저 꺼낸다.
      if (stack.length < 2) {
        throw new Error(`연산자 "${token}" 앞에 피연산자가 부족합니다.`);
      }
      const right = stack.pop()!;
      const left = stack.pop()!;

      switch (token) {
        case '+':
          stack.push(new AddExpression(left, right));
          break;
        case '-':
          stack.push(new SubtractExpression(left, right));
          break;
        case '*':
          stack.push(new MultiplyExpression(left, right));
          break;
        case '/':
          stack.push(new DivideExpression(left, right));
          break;
      }
    } else {
      // 숫자 또는 변수 이름
      const num = Number(token);
      if (!isNaN(num)) {
        // 숫자 리터럴
        stack.push(new NumberExpression(num));
      } else {
        // 변수 이름 (알파벳으로 시작하는 토큰)
        stack.push(new VariableExpression(token));
      }
    }
  }

  if (stack.length !== 1) {
    throw new Error(`잘못된 수식입니다. 남은 스택: ${stack.length}개`);
  }

  return stack[0];
}
