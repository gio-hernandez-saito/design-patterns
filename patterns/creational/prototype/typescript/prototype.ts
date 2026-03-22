/**
 * Prototype 패턴
 *
 * 목적: 기존 객체를 복사(clone)해 새 객체를 만든다.
 *       클래스에 직접 의존하지 않고 객체를 복제할 수 있다.
 *
 * 핵심 아이디어:
 * - 객체 생성 비용이 크거나, 초기 설정이 복잡할 때 원형(prototype) 객체 하나를 만들어 두고
 *   필요할 때마다 복제해 사용한다.
 * - 얕은 복사(shallow copy)와 깊은 복사(deep copy)의 차이에 주의해야 한다.
 *   중첩 객체가 있으면 반드시 깊은 복사를 해야 원본과 복사본이 독립적으로 유지된다.
 *
 * 역할 매핑:
 * - Prototype         → Cloneable (인터페이스)
 * - ConcretePrototype → DocumentTemplate, SectionContent (clone()을 구현하는 클래스들)
 * - Client            → TemplateRegistry (프로토타입을 등록하고 복제해 사용)
 */

// ─────────────────────────────────────────────
// Prototype: 복제 메서드를 선언하는 인터페이스
// ─────────────────────────────────────────────

/**
 * 복제 가능한 객체임을 나타내는 인터페이스 — Prototype 역할.
 *
 * clone()을 통해 자기 자신의 독립적인 복사본을 반환한다.
 */
export interface Cloneable<T> {
  clone(): T;
}

// ─────────────────────────────────────────────
// 보조 타입: 문서 내 섹션
// ─────────────────────────────────────────────

/**
 * 문서의 개별 섹션을 나타내는 클래스.
 *
 * DocumentTemplate 내부에 중첩 객체로 들어가기 때문에
 * 깊은 복사를 위해 자체적으로 clone()을 구현한다.
 */
export class SectionContent implements Cloneable<SectionContent> {
  constructor(
    public title: string,
    public body: string,
    public tags: string[], // 배열도 독립적으로 복사해야 한다
  ) {}

  /**
   * 이 섹션의 깊은 복사본을 반환한다.
   * 배열(tags)을 slice()로 복사해 원본 배열을 공유하지 않도록 한다.
   * 공유하면 복사본의 tags를 수정할 때 원본도 바뀌는 버그가 생긴다.
   */
  public clone(): SectionContent {
    return new SectionContent(
      this.title,
      this.body,
      this.tags.slice(), // 배열의 얕은 복사 (string은 불변이므로 이것으로 충분)
    );
  }
}

// ─────────────────────────────────────────────
// ConcretePrototype: 복제를 구현하는 실제 클래스
// ─────────────────────────────────────────────

/** 문서 메타데이터 */
export interface DocumentMetadata {
  author: string;
  version: string;
  createdAt: Date;
  tags: string[];
}

/**
 * 문서 템플릿 — ConcretePrototype 역할.
 *
 * 복잡한 문서 구조(중첩 객체, 배열)를 가지고 있어서
 * 직접 생성하기보다 템플릿을 복제해 사용하면 효율적이다.
 *
 * 예: 회의록 템플릿, 보고서 템플릿 등을 한 번 만들어 두고
 *     필요할 때마다 복제해 내용만 바꿔 사용한다.
 */
export class DocumentTemplate implements Cloneable<DocumentTemplate> {
  public title: string;
  public sections: SectionContent[];
  public metadata: DocumentMetadata;

  constructor(
    title: string,
    sections: SectionContent[],
    metadata: DocumentMetadata,
  ) {
    this.title = title;
    this.sections = sections;
    this.metadata = metadata;
  }

  /**
   * 이 문서 템플릿의 깊은 복사본을 반환한다.
   *
   * 왜 깊은 복사가 필요한가?
   * - sections 배열을 그냥 복사하면 원본 SectionContent 객체들을 공유하게 된다.
   * - 복사본의 섹션 내용을 바꾸면 원본 템플릿도 바뀌는 버그가 발생한다.
   * - 따라서 배열도, 각 섹션 객체도, 메타데이터도 모두 새로 만들어야 한다.
   */
  public clone(): DocumentTemplate {
    return new DocumentTemplate(
      // 문자열은 불변(immutable)이므로 그냥 복사해도 된다
      this.title,
      // 각 섹션을 개별적으로 clone()해 완전히 독립적인 복사본을 만든다
      this.sections.map((section) => section.clone()),
      // 메타데이터 객체도 새로 만든다
      {
        author: this.metadata.author,
        version: this.metadata.version,
        createdAt: new Date(this.metadata.createdAt.getTime()), // Date도 참조 타입이므로 새로 생성
        tags: this.metadata.tags.slice(), // 배열도 복사
      },
    );
  }

  /**
   * 제목을 업데이트한다.
   */
  public setTitle(title: string): void {
    this.title = title;
  }

  /**
   * 특정 인덱스의 섹션 내용을 업데이트한다.
   */
  public updateSection(index: number, title: string, body: string): void {
    if (index < 0 || index >= this.sections.length) {
      throw new Error(`섹션 인덱스 범위 초과: ${index} (0~${this.sections.length - 1})`);
    }
    this.sections[index].title = title;
    this.sections[index].body = body;
  }

  /**
   * 새 섹션을 추가한다.
   */
  public addSection(section: SectionContent): void {
    this.sections.push(section);
  }

  /**
   * 문서 요약 정보를 반환한다.
   */
  public getSummary(): string {
    return `[${this.title}] 섹션 ${this.sections.length}개 | 작성자: ${this.metadata.author} | 버전: ${this.metadata.version}`;
  }
}

// ─────────────────────────────────────────────
// Client: 프로토타입 레지스트리 (프로토타입 관리 & 복제)
// ─────────────────────────────────────────────

/**
 * 문서 템플릿을 등록하고 복제해 제공하는 레지스트리 — Client 역할.
 *
 * 자주 쓰는 템플릿을 미리 등록해 두고,
 * 요청이 올 때마다 clone()으로 독립적인 복사본을 반환한다.
 * 원본 템플릿은 항상 변경되지 않은 상태로 보존된다.
 */
export class TemplateRegistry {
  // 등록된 프로토타입(원형) 템플릿들을 이름으로 관리한다
  private readonly templates: Map<string, DocumentTemplate> = new Map();

  /**
   * 템플릿을 레지스트리에 등록한다.
   * 등록 시 복사본을 저장해 외부에서 원본을 수정해도 레지스트리가 영향받지 않는다.
   */
  public register(name: string, template: DocumentTemplate): void {
    // 등록 시점에 복사해두면 외부 수정으로부터 원형을 보호할 수 있다
    this.templates.set(name, template.clone());
  }

  /**
   * 등록된 템플릿의 복사본을 반환한다.
   *
   * 매번 clone()을 호출하기 때문에 반환된 복사본을 수정해도
   * 레지스트리의 원본 템플릿은 변경되지 않는다.
   */
  public getTemplate(name: string): DocumentTemplate {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`템플릿을 찾을 수 없습니다: "${name}"`);
    }
    // 원본이 아닌 복사본을 반환한다 — 이것이 Prototype 패턴의 핵심 동작
    return template.clone();
  }

  /**
   * 등록된 템플릿 이름 목록을 반환한다.
   */
  public listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}
