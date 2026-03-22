import { describe, it, expect } from 'vitest'
import { DocumentTemplate, SectionContent, TemplateRegistry } from './prototype'

/** 테스트용 기본 문서 템플릿을 만드는 헬퍼 */
function createMeetingTemplate(): DocumentTemplate {
  return new DocumentTemplate(
    '회의록 템플릿',
    [
      new SectionContent('참석자', '이름을 입력하세요', ['meeting', 'people']),
      new SectionContent('안건', '안건을 입력하세요', ['agenda']),
      new SectionContent('결론', '결론을 입력하세요', ['conclusion']),
    ],
    {
      author: '시스템',
      version: '1.0',
      createdAt: new Date('2024-01-01'),
      tags: ['template', 'meeting'],
    },
  )
}

describe('Prototype — 문서 템플릿 복제 시스템', () => {
  describe('SectionContent.clone()', () => {
    it('섹션의 독립적인 복사본을 반환한다', () => {
      const original = new SectionContent('제목', '내용', ['tag1', 'tag2'])
      const clone = original.clone()

      expect(clone.title).toBe('제목')
      expect(clone.body).toBe('내용')
      expect(clone.tags).toEqual(['tag1', 'tag2'])
    })

    it('복사본의 tags를 수정해도 원본 tags는 변경되지 않는다 (깊은 복사)', () => {
      const original = new SectionContent('제목', '내용', ['tag1'])
      const clone = original.clone()

      // 복사본에만 새 태그를 추가한다
      clone.tags.push('newTag')

      // 원본은 영향받지 않아야 한다
      expect(original.tags).toEqual(['tag1'])
      expect(clone.tags).toEqual(['tag1', 'newTag'])
    })
  })

  describe('DocumentTemplate.clone()', () => {
    it('문서 템플릿의 독립적인 복사본을 반환한다', () => {
      const original = createMeetingTemplate()
      const clone = original.clone()

      expect(clone.title).toBe(original.title)
      expect(clone.sections).toHaveLength(original.sections.length)
      expect(clone.metadata.author).toBe(original.metadata.author)
    })

    it('복사본의 제목을 바꿔도 원본 제목은 변경되지 않는다', () => {
      const original = createMeetingTemplate()
      const clone = original.clone()

      clone.setTitle('2024년 3월 회의록')

      expect(original.title).toBe('회의록 템플릿')
      expect(clone.title).toBe('2024년 3월 회의록')
    })

    it('복사본의 섹션 내용을 수정해도 원본 섹션은 변경되지 않는다 (깊은 복사)', () => {
      const original = createMeetingTemplate()
      const clone = original.clone()

      // 복사본의 첫 번째 섹션 내용을 변경한다
      clone.updateSection(0, '참석자 목록', '홍길동, 김철수')

      // 원본의 첫 번째 섹션은 그대로여야 한다
      expect(original.sections[0].title).toBe('참석자')
      expect(original.sections[0].body).toBe('이름을 입력하세요')

      expect(clone.sections[0].title).toBe('참석자 목록')
    })

    it('복사본의 metadata.tags를 수정해도 원본은 영향받지 않는다 (깊은 복사)', () => {
      const original = createMeetingTemplate()
      const clone = original.clone()

      clone.metadata.tags.push('important')

      expect(original.metadata.tags).toEqual(['template', 'meeting'])
      expect(clone.metadata.tags).toContain('important')
    })

    it('복사본의 metadata.createdAt을 수정해도 원본 날짜는 변경되지 않는다', () => {
      const original = createMeetingTemplate()
      const originalDate = original.metadata.createdAt.getTime()

      const clone = original.clone()
      clone.metadata.createdAt.setFullYear(2099)

      // 원본 날짜는 그대로여야 한다
      expect(original.metadata.createdAt.getTime()).toBe(originalDate)
    })

    it('복사본에 섹션을 추가해도 원본 섹션 수는 변하지 않는다', () => {
      const original = createMeetingTemplate()
      const clone = original.clone()

      clone.addSection(new SectionContent('후속 조치', '내용', []))

      expect(original.sections).toHaveLength(3)
      expect(clone.sections).toHaveLength(4)
    })

    it('getSummary()는 제목과 섹션 수를 포함한 요약을 반환한다', () => {
      const doc = createMeetingTemplate()
      const summary = doc.getSummary()

      expect(summary).toContain('회의록 템플릿')
      expect(summary).toContain('3')
      expect(summary).toContain('시스템')
    })
  })

  describe('TemplateRegistry — 프로토타입 레지스트리', () => {
    it('등록된 템플릿을 이름으로 가져올 수 있다', () => {
      const registry = new TemplateRegistry()
      const template = createMeetingTemplate()

      registry.register('meeting', template)
      const retrieved = registry.getTemplate('meeting')

      expect(retrieved.title).toBe('회의록 템플릿')
    })

    it('getTemplate()은 원본이 아닌 복사본을 반환한다', () => {
      const registry = new TemplateRegistry()
      registry.register('meeting', createMeetingTemplate())

      const copy1 = registry.getTemplate('meeting')
      const copy2 = registry.getTemplate('meeting')

      // 두 번 가져온 복사본은 서로 다른 객체여야 한다
      expect(copy1).not.toBe(copy2)
    })

    it('복사본을 수정해도 레지스트리의 원본 템플릿은 변경되지 않는다', () => {
      const registry = new TemplateRegistry()
      registry.register('meeting', createMeetingTemplate())

      const copy = registry.getTemplate('meeting')
      copy.setTitle('수정된 제목')
      copy.metadata.tags.push('modified')

      // 레지스트리에서 다시 가져온 템플릿은 원본 상태여야 한다
      const freshCopy = registry.getTemplate('meeting')
      expect(freshCopy.title).toBe('회의록 템플릿')
      expect(freshCopy.metadata.tags).not.toContain('modified')
    })

    it('등록 후 원본을 수정해도 레지스트리의 템플릿은 영향받지 않는다', () => {
      const registry = new TemplateRegistry()
      const original = createMeetingTemplate()

      registry.register('meeting', original)

      // 등록 후 원본을 수정한다
      original.setTitle('외부에서 수정된 제목')

      // 레지스트리의 복사본은 영향받지 않아야 한다
      const retrieved = registry.getTemplate('meeting')
      expect(retrieved.title).toBe('회의록 템플릿')
    })

    it('존재하지 않는 템플릿을 가져오면 에러를 던진다', () => {
      const registry = new TemplateRegistry()

      expect(() => registry.getTemplate('nonExistent')).toThrow('템플릿을 찾을 수 없습니다')
    })

    it('listTemplates()는 등록된 모든 템플릿 이름을 반환한다', () => {
      const registry = new TemplateRegistry()
      registry.register('meeting', createMeetingTemplate())
      registry.register('report', createMeetingTemplate())

      const names = registry.listTemplates()
      expect(names).toContain('meeting')
      expect(names).toContain('report')
      expect(names).toHaveLength(2)
    })

    it('섹션 인덱스 범위 초과 시 에러를 던진다', () => {
      const doc = createMeetingTemplate()
      expect(() => doc.updateSection(99, '제목', '내용')).toThrow('섹션 인덱스 범위 초과')
    })
  })
})
