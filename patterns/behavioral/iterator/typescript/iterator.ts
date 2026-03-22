/**
 * Iterator 패턴
 *
 * 목적: 컬렉션의 내부 구조를 노출하지 않으면서,
 *       컬렉션의 요소들을 순차적으로 접근하는 방법을 제공한다.
 *
 * 핵심 아이디어:
 * - 순회 로직을 컬렉션 자체에서 분리해 Iterator 객체로 옮긴다.
 * - 같은 컬렉션에 DFS, BFS 등 다른 순회 전략을 동시에 적용할 수 있다.
 * - JavaScript의 Iterable 프로토콜과 완벽히 통합돼 for...of 문을 사용할 수 있다.
 *
 * 역할 매핑:
 * - Iterator       → TreeIterator 인터페이스 (순회 계약)
 * - ConcreteIterator → DFSIterator, BFSIterator 클래스 (실제 순회 알고리즘)
 * - Aggregate      → TreeCollection 인터페이스 (Iterator를 생성하는 컬렉션 계약)
 * - ConcreteAggregate → BinaryTree 클래스 (실제 트리 컬렉션)
 */

// =============================================================================
// 트리 노드 정의
// =============================================================================

/**
 * 트리를 구성하는 개별 노드.
 * 각 노드는 값과 자식 노드들의 배열을 갖는다.
 */
export class TreeNode<T> {
  public value: T;
  /** 자식 노드 목록. N-ary 트리(자식이 여러 개)를 지원한다. */
  public children: TreeNode<T>[];

  constructor(value: T, children: TreeNode<T>[] = []) {
    this.value = value;
    this.children = children;
  }
}

// =============================================================================
// Iterator 인터페이스
// =============================================================================

/**
 * 모든 Iterator가 구현해야 하는 계약.
 *
 * JavaScript 표준 Iterator 프로토콜(Symbol.iterator)을 구현하면
 * for...of, 스프레드 연산자(...) 등과 함께 사용할 수 있다.
 */
export interface TreeIterator<T> extends Iterator<T>, Iterable<T> {
  /** 다음 요소가 있으면 true를 반환한다 */
  hasNext(): boolean;

  /** 다음 요소를 반환하고 내부 커서를 이동한다 */
  next(): IteratorResult<T>;

  /** Iterator를 처음 상태로 초기화한다 */
  reset(): void;

  /** JavaScript의 for...of와 호환되기 위한 메서드 */
  [Symbol.iterator](): Iterator<T>;
}

// =============================================================================
// ConcreteIterator: DFS (깊이 우선 탐색)
// =============================================================================

/**
 * 깊이 우선 탐색(DFS) Iterator — ConcreteIterator.
 *
 * 루트에서 출발해 자식 방향으로 최대한 깊이 들어갔다가 되돌아오는 방식.
 * 스택(Stack)을 사용해 구현한다.
 *
 * 예시 트리:
 *       1
 *      / \
 *     2   3
 *    / \
 *   4   5
 *
 * DFS 순서: 1 → 2 → 4 → 5 → 3
 */
export class DFSIterator<T> implements TreeIterator<T> {
  private root: TreeNode<T>;
  // 아직 방문하지 않은 노드를 담는 스택.
  // 스택은 LIFO(후입선출)이므로 자식을 역순으로 push해야 올바른 순서가 된다.
  private stack: TreeNode<T>[];

  constructor(root: TreeNode<T>) {
    this.root = root;
    // 루트 노드를 스택에 넣어 순회를 시작할 준비를 한다.
    this.stack = [root];
  }

  public hasNext(): boolean {
    return this.stack.length > 0;
  }

  public next(): IteratorResult<T> {
    if (!this.hasNext()) {
      // JavaScript Iterator 프로토콜: 더 이상 값이 없으면 done: true를 반환한다.
      return { value: undefined as unknown as T, done: true };
    }

    // 스택의 맨 위 노드를 꺼낸다.
    const node = this.stack.pop()!;

    // 자식 노드를 역순으로 스택에 push한다.
    // 역순으로 넣어야 왼쪽 자식이 먼저 pop되어 올바른 DFS 순서가 된다.
    for (let i = node.children.length - 1; i >= 0; i--) {
      this.stack.push(node.children[i]);
    }

    return { value: node.value, done: false };
  }

  public reset(): void {
    // 스택을 초기화하고 루트부터 다시 시작한다.
    this.stack = [this.root];
  }

  // for...of 문과 호환되기 위해 this를 반환한다.
  public [Symbol.iterator](): Iterator<T> {
    return this;
  }
}

// =============================================================================
// ConcreteIterator: BFS (너비 우선 탐색)
// =============================================================================

/**
 * 너비 우선 탐색(BFS) Iterator — ConcreteIterator.
 *
 * 루트에서 출발해 같은 깊이의 노드를 모두 방문한 뒤 다음 깊이로 내려가는 방식.
 * 큐(Queue)를 사용해 구현한다.
 *
 * 예시 트리:
 *       1
 *      / \
 *     2   3
 *    / \
 *   4   5
 *
 * BFS 순서: 1 → 2 → 3 → 4 → 5
 */
export class BFSIterator<T> implements TreeIterator<T> {
  private root: TreeNode<T>;
  // 아직 방문하지 않은 노드를 담는 큐.
  // 큐는 FIFO(선입선출)이므로 같은 레벨의 노드들이 순서대로 처리된다.
  private queue: TreeNode<T>[];

  constructor(root: TreeNode<T>) {
    this.root = root;
    this.queue = [root];
  }

  public hasNext(): boolean {
    return this.queue.length > 0;
  }

  public next(): IteratorResult<T> {
    if (!this.hasNext()) {
      return { value: undefined as unknown as T, done: true };
    }

    // 큐의 앞에서 노드를 꺼낸다(FIFO).
    const node = this.queue.shift()!;

    // 자식 노드를 큐의 뒤에 추가한다.
    // 순서를 유지하면서 push하므로 같은 레벨의 노드들이 순서대로 처리된다.
    for (const child of node.children) {
      this.queue.push(child);
    }

    return { value: node.value, done: false };
  }

  public reset(): void {
    this.queue = [this.root];
  }

  public [Symbol.iterator](): Iterator<T> {
    return this;
  }
}

// =============================================================================
// Aggregate 인터페이스
// =============================================================================

/**
 * Iterator를 생성하는 컬렉션의 계약.
 *
 * 컬렉션은 자신의 내부 구조에 맞는 Iterator를 생성해서 반환한다.
 * 클라이언트는 컬렉션 내부 구조를 몰라도 Iterator를 통해 순회할 수 있다.
 */
export interface TreeCollection<T> {
  /** 깊이 우선 탐색 Iterator를 생성한다 */
  createDFSIterator(): TreeIterator<T>;

  /** 너비 우선 탐색 Iterator를 생성한다 */
  createBFSIterator(): TreeIterator<T>;
}

// =============================================================================
// ConcreteAggregate 클래스
// =============================================================================

/**
 * 실제 트리 컬렉션 — ConcreteAggregate.
 *
 * 내부적으로 TreeNode 구조를 유지하면서,
 * 클라이언트에게는 Iterator를 통해서만 접근을 허용한다.
 */
export class BinaryTree<T> implements TreeCollection<T> {
  // 트리의 시작점. null이면 비어있는 트리다.
  private root: TreeNode<T> | null = null;

  /**
   * 트리의 루트 노드를 설정한다.
   * @param root 루트 노드
   */
  public setRoot(root: TreeNode<T>): void {
    this.root = root;
  }

  /**
   * DFS Iterator를 생성한다.
   * 루트가 없으면 빈 노드를 기준으로 Iterator를 만든다.
   */
  public createDFSIterator(): TreeIterator<T> {
    if (this.root === null) {
      throw new Error('트리가 비어있습니다.');
    }
    return new DFSIterator<T>(this.root);
  }

  /**
   * BFS Iterator를 생성한다.
   */
  public createBFSIterator(): TreeIterator<T> {
    if (this.root === null) {
      throw new Error('트리가 비어있습니다.');
    }
    return new BFSIterator<T>(this.root);
  }
}
