/**
 * Iterator 패턴 테스트
 *
 * 테스트 목표:
 * 1. DFS(깊이 우선)와 BFS(너비 우선) 순회 순서가 올바른지 확인
 * 2. hasNext()와 next()가 정상 동작하는지 확인
 * 3. reset() 이후 처음부터 다시 순회할 수 있는지 확인
 * 4. for...of 문(JavaScript Iterable 프로토콜)과 호환되는지 확인
 */

import { describe, it, expect } from 'vitest';
import { TreeNode, DFSIterator, BFSIterator, BinaryTree } from './iterator';

/**
 * 테스트에 사용할 트리 구조:
 *
 *        1
 *       / \
 *      2   3
 *     / \
 *    4   5
 *
 * DFS 예상 순서: 1 → 2 → 4 → 5 → 3
 * BFS 예상 순서: 1 → 2 → 3 → 4 → 5
 */
function buildTestTree(): TreeNode<number> {
  const node4 = new TreeNode(4);
  const node5 = new TreeNode(5);
  const node2 = new TreeNode(2, [node4, node5]);
  const node3 = new TreeNode(3);
  const root = new TreeNode(1, [node2, node3]);
  return root;
}

describe('Iterator 패턴 — 트리 순회', () => {
  // -------------------------------------------------------------------------
  // DFS Iterator 테스트
  // -------------------------------------------------------------------------

  describe('DFSIterator (깊이 우선 탐색)', () => {
    it('올바른 DFS 순서로 순회한다: 1 → 2 → 4 → 5 → 3', () => {
      const root = buildTestTree();
      const iterator = new DFSIterator(root);

      const result: number[] = [];
      while (iterator.hasNext()) {
        const { value } = iterator.next();
        result.push(value);
      }

      expect(result).toEqual([1, 2, 4, 5, 3]);
    });

    it('hasNext()가 요소가 남아있는 동안 true를 반환한다', () => {
      const root = new TreeNode(42);
      const iterator = new DFSIterator(root);

      expect(iterator.hasNext()).toBe(true);
      iterator.next();
      expect(iterator.hasNext()).toBe(false);
    });

    it('모든 요소를 소진한 후 next()를 호출하면 done: true를 반환한다', () => {
      const root = new TreeNode(1);
      const iterator = new DFSIterator(root);

      iterator.next(); // 유일한 요소 소진

      const result = iterator.next();
      expect(result.done).toBe(true);
    });

    it('reset() 이후 처음부터 다시 순회한다', () => {
      const root = buildTestTree();
      const iterator = new DFSIterator(root);

      // 첫 번째 순회
      const first: number[] = [];
      while (iterator.hasNext()) {
        first.push(iterator.next().value);
      }

      // 리셋 후 두 번째 순회
      iterator.reset();
      const second: number[] = [];
      while (iterator.hasNext()) {
        second.push(iterator.next().value);
      }

      // 두 번의 순회 결과가 동일해야 한다.
      expect(first).toEqual(second);
      expect(first).toEqual([1, 2, 4, 5, 3]);
    });

    it('for...of 문과 호환된다 (JavaScript Iterable 프로토콜)', () => {
      const root = buildTestTree();
      const iterator = new DFSIterator(root);

      const result: number[] = [];
      // for...of는 내부적으로 Symbol.iterator와 next()를 사용한다.
      for (const value of iterator) {
        result.push(value);
      }

      expect(result).toEqual([1, 2, 4, 5, 3]);
    });
  });

  // -------------------------------------------------------------------------
  // BFS Iterator 테스트
  // -------------------------------------------------------------------------

  describe('BFSIterator (너비 우선 탐색)', () => {
    it('올바른 BFS 순서로 순회한다: 1 → 2 → 3 → 4 → 5', () => {
      const root = buildTestTree();
      const iterator = new BFSIterator(root);

      const result: number[] = [];
      while (iterator.hasNext()) {
        result.push(iterator.next().value);
      }

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('hasNext()가 올바르게 동작한다', () => {
      const root = new TreeNode(42);
      const iterator = new BFSIterator(root);

      expect(iterator.hasNext()).toBe(true);
      iterator.next();
      expect(iterator.hasNext()).toBe(false);
    });

    it('reset() 이후 BFS를 다시 시작할 수 있다', () => {
      const root = buildTestTree();
      const iterator = new BFSIterator(root);

      while (iterator.hasNext()) iterator.next();

      iterator.reset();
      const result: number[] = [];
      while (iterator.hasNext()) {
        result.push(iterator.next().value);
      }

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('for...of 문과 호환된다', () => {
      const root = buildTestTree();
      const iterator = new BFSIterator(root);

      const result: number[] = [];
      for (const value of iterator) {
        result.push(value);
      }

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });
  });

  // -------------------------------------------------------------------------
  // DFS vs BFS 비교 테스트
  // -------------------------------------------------------------------------

  it('같은 트리에 DFS와 BFS를 적용하면 다른 순서가 나온다', () => {
    const root = buildTestTree();
    const dfs = new DFSIterator(root);
    const bfs = new BFSIterator(root);

    const dfsResult: number[] = [];
    const bfsResult: number[] = [];

    for (const v of dfs) dfsResult.push(v);
    for (const v of bfs) bfsResult.push(v);

    // 두 순회 결과는 같은 요소를 포함하지만 순서가 다르다.
    expect(dfsResult).not.toEqual(bfsResult);
    expect(dfsResult.sort()).toEqual(bfsResult.sort());
  });

  // -------------------------------------------------------------------------
  // BinaryTree (ConcreteAggregate) 테스트
  // -------------------------------------------------------------------------

  describe('BinaryTree (ConcreteAggregate)', () => {
    it('BinaryTree가 DFS Iterator를 생성한다', () => {
      const tree = new BinaryTree<number>();
      tree.setRoot(buildTestTree());

      const iterator = tree.createDFSIterator();
      const result: number[] = [];
      for (const v of iterator) result.push(v);

      expect(result).toEqual([1, 2, 4, 5, 3]);
    });

    it('BinaryTree가 BFS Iterator를 생성한다', () => {
      const tree = new BinaryTree<number>();
      tree.setRoot(buildTestTree());

      const iterator = tree.createBFSIterator();
      const result: number[] = [];
      for (const v of iterator) result.push(v);

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('루트가 없는 BinaryTree에서 Iterator 생성 시 에러를 던진다', () => {
      const tree = new BinaryTree<number>();

      expect(() => tree.createDFSIterator()).toThrow('트리가 비어있습니다.');
      expect(() => tree.createBFSIterator()).toThrow('트리가 비어있습니다.');
    });

    it('단일 노드 트리를 올바르게 순회한다', () => {
      const tree = new BinaryTree<string>();
      tree.setRoot(new TreeNode('루트만'));

      const dfs = [...tree.createDFSIterator()];
      const bfs = [...tree.createBFSIterator()];

      expect(dfs).toEqual(['루트만']);
      expect(bfs).toEqual(['루트만']);
    });
  });
});
