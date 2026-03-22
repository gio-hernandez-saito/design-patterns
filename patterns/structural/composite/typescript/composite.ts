// =============================================================================
// 컴포지트 패턴 (Composite Pattern)
// =============================================================================
// 목적: 개별 객체(Leaf)와 복합 객체(Composite)를 동일한 인터페이스로 다룰 수 있게 한다.
//       트리 구조를 자연스럽게 표현한다.
//
// 왜 필요한가?
// - 파일 시스템에서 파일과 폴더를 같은 방식으로 다루고 싶다.
// - 폴더 안에 파일도 있고 폴더도 있는데, "크기 계산"이나 "이름 출력"을 동일하게 처리하고 싶다.
// - 클라이언트는 단일 파일인지 폴더인지 구별하지 않고 같은 메서드를 호출한다.
//
// 역할 매핑:
//   FileSystemItem (Component) → Leaf와 Composite 모두가 구현하는 공통 인터페이스
//   File (Leaf)                → 자식이 없는 최소 단위 요소
//   Folder (Composite)         → 자식을 가질 수 있는 복합 요소, 자식들에게 작업을 위임한다
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// Component: 공통 인터페이스
// Leaf와 Composite 모두 이 인터페이스를 구현한다.
// 클라이언트는 이 인터페이스만 사용하므로, 단일 파일과 폴더를 구별하지 않아도 된다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Component 인터페이스: 파일 시스템의 모든 항목이 공유하는 인터페이스
 *
 * 이 인터페이스 덕분에 클라이언트 코드는 File인지 Folder인지 신경 쓰지 않아도 된다.
 * 예: "크기를 계산해줘" → 파일이면 자신의 크기, 폴더면 모든 내용물의 크기 합계
 */
export interface FileSystemItem {
  /** 항목의 이름 반환 */
  getName(): string;

  /** 항목의 크기(바이트) 반환. 폴더라면 모든 하위 항목의 크기 합계 */
  getSize(): number;

  /** 항목을 트리 형태로 출력. depth는 들여쓰기 레벨 */
  display(depth?: number): string;

  /** 항목의 타입 반환 */
  getType(): "file" | "folder";
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaf: 자식이 없는 최소 단위 요소
// 트리의 말단(leaf) 노드. 더 이상 하위 항목을 가질 수 없다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Leaf: 파일 클래스
 * 자식 항목이 없는 최소 단위.
 * 모든 메서드를 자신의 데이터로만 처리한다.
 */
export class File implements FileSystemItem {
  private name: string;
  private size: number;  // 바이트 단위

  constructor(name: string, size: number) {
    this.name = name;
    this.size = size;
  }

  getName(): string {
    return this.name;
  }

  // Leaf는 자신의 크기만 반환한다. 위임할 자식이 없다.
  getSize(): number {
    return this.size;
  }

  display(depth: number = 0): string {
    // 들여쓰기로 트리 구조를 시각화한다.
    const indent = "  ".repeat(depth);
    const sizeStr = this.formatSize(this.size);
    return `${indent}📄 ${this.name} (${sizeStr})`;
  }

  getType(): "file" | "folder" {
    return "file";
  }

  /** 바이트를 읽기 좋은 형태로 변환 */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite: 자식을 가질 수 있는 복합 요소
// 핵심: 자식들에게 작업을 위임(delegation)한다. 자식이 File이든 Folder든 상관없다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Composite: 폴더 클래스
 * 파일과 다른 폴더를 자식으로 가질 수 있다.
 *
 * 왜 위임(delegation)이 강력한가?
 * - getSize()를 호출하면 모든 자식의 getSize()를 재귀적으로 호출한다.
 * - 자식이 File인지 Folder인지 몰라도 된다. 인터페이스가 같으니까.
 * - 깊이가 얼마나 깊든 자동으로 재귀 처리된다.
 */
export class Folder implements FileSystemItem {
  private name: string;
  // 자식 목록: File도 되고 Folder도 된다. Component 타입으로 선언하는 것이 핵심.
  private children: FileSystemItem[] = [];

  constructor(name: string) {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  /**
   * 핵심 메서드: 모든 자식의 크기를 합산한다.
   * 자식이 Folder라면 그 Folder도 재귀적으로 자신의 자식들을 합산한다.
   * 클라이언트는 이 재귀 구조를 신경 쓸 필요가 없다.
   */
  getSize(): number {
    // reduce를 사용하여 모든 자식의 크기를 누적한다.
    return this.children.reduce((total, child) => total + child.getSize(), 0);
  }

  display(depth: number = 0): string {
    const indent = "  ".repeat(depth);
    const sizeStr = this.formatSize(this.getSize());
    // 자신의 정보를 출력하고 모든 자식의 display()를 재귀 호출한다.
    const lines = [`${indent}📁 ${this.name}/ (${sizeStr})`];
    for (const child of this.children) {
      lines.push(child.display(depth + 1));
    }
    return lines.join("\n");
  }

  getType(): "file" | "folder" {
    return "folder";
  }

  // ── 자식 관리 메서드들 (Composite만 가지는 메서드) ──────────────────────

  /** 자식 항목 추가 */
  add(item: FileSystemItem): this {
    this.children.push(item);
    return this;  // 메서드 체이닝 지원
  }

  /** 자식 항목 제거 */
  remove(item: FileSystemItem): boolean {
    const index = this.children.indexOf(item);
    if (index !== -1) {
      this.children.splice(index, 1);
      return true;
    }
    return false;
  }

  /** 자식 목록 반환 */
  getChildren(): FileSystemItem[] {
    return [...this.children];  // 복사본을 반환하여 내부 배열 보호
  }

  /** 자식 수 반환 */
  getChildCount(): number {
    return this.children.length;
  }

  /**
   * 재귀적으로 특정 이름의 항목 검색
   * Composite 패턴의 재귀 탐색 활용 예시
   */
  find(name: string): FileSystemItem | null {
    for (const child of this.children) {
      if (child.getName() === name) return child;
      // 자식이 Folder라면 그 안에서도 검색한다.
      if (child instanceof Folder) {
        const found = child.find(name);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 재귀적으로 모든 파일 수 계산
   * 클라이언트가 깊이를 몰라도 전체 파일 수를 알 수 있다.
   */
  countFiles(): number {
    let count = 0;
    for (const child of this.children) {
      if (child.getType() === "file") {
        count++;
      } else if (child instanceof Folder) {
        count += child.countFiles();
      }
    }
    return count;
  }

  /** 바이트를 읽기 좋은 형태로 변환 */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}
