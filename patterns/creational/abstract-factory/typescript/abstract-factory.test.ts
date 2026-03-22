import { describe, it, expect } from 'vitest'
import {
  LightThemeFactory,
  DarkThemeFactory,
  UIRenderer,
  LightButton,
  DarkButton,
  LightInput,
  DarkInput,
  LightCard,
  DarkCard,
} from './abstract-factory'

describe('Abstract Factory — UI 테마 시스템', () => {
  describe('LightThemeFactory', () => {
    it('라이트 테마의 Button, Input, Card를 생성한다', () => {
      const factory = new LightThemeFactory()

      expect(factory.createButton()).toBeInstanceOf(LightButton)
      expect(factory.createInput()).toBeInstanceOf(LightInput)
      expect(factory.createCard()).toBeInstanceOf(LightCard)
    })

    it('LightButton은 밝은 배경 스타일을 렌더링한다', () => {
      const button = new LightThemeFactory().createButton()
      const rendered = button.render()

      // 라이트 테마의 특징적인 스타일 확인
      expect(rendered).toContain('#fff')
    })

    it('LightCard의 getStyle()은 "light-card"를 반환한다', () => {
      const card = new LightThemeFactory().createCard()
      expect(card.getStyle()).toBe('light-card')
    })
  })

  describe('DarkThemeFactory', () => {
    it('다크 테마의 Button, Input, Card를 생성한다', () => {
      const factory = new DarkThemeFactory()

      expect(factory.createButton()).toBeInstanceOf(DarkButton)
      expect(factory.createInput()).toBeInstanceOf(DarkInput)
      expect(factory.createCard()).toBeInstanceOf(DarkCard)
    })

    it('DarkButton은 어두운 배경 스타일을 렌더링한다', () => {
      const button = new DarkThemeFactory().createButton()
      const rendered = button.render()

      // 다크 테마의 특징적인 스타일 확인
      expect(rendered).toContain('#1e1e1e')
    })

    it('DarkCard의 getStyle()은 "dark-card"를 반환한다', () => {
      const card = new DarkThemeFactory().createCard()
      expect(card.getStyle()).toBe('dark-card')
    })
  })

  describe('UIRenderer (Client)', () => {
    it('LightThemeFactory를 주입하면 라이트 테마 페이지를 렌더링한다', () => {
      const renderer = new UIRenderer(new LightThemeFactory())
      const page = renderer.renderPage()

      // 라이트 테마 컴포넌트의 스타일이 포함되어야 한다
      expect(page).toContain('#fff')
      expect(page).toContain('페이지 렌더링')
    })

    it('DarkThemeFactory를 주입하면 다크 테마 페이지를 렌더링한다', () => {
      const renderer = new UIRenderer(new DarkThemeFactory())
      const page = renderer.renderPage()

      // 다크 테마 컴포넌트의 스타일이 포함되어야 한다
      expect(page).toContain('#1e1e1e')
    })

    it('같은 팩토리에서 생성한 컴포넌트들은 동일한 테마 군에 속한다', () => {
      const lightRenderer = new UIRenderer(new LightThemeFactory())
      const { button, input, card } = lightRenderer.getComponents()

      // 모두 라이트 테마 컴포넌트여야 한다
      expect(button).toBeInstanceOf(LightButton)
      expect(input).toBeInstanceOf(LightInput)
      expect(card).toBeInstanceOf(LightCard)
    })

    it('팩토리를 교체하면 모든 컴포넌트가 새 테마로 바뀐다 (OCP 확인)', () => {
      // UIRenderer 코드 변경 없이 팩토리만 교체해 테마를 전환할 수 있다
      const factories = [new LightThemeFactory(), new DarkThemeFactory()]
      const styles = factories.map((f) => {
        const renderer = new UIRenderer(f)
        return renderer.getComponents().card.getStyle()
      })

      expect(styles).toEqual(['light-card', 'dark-card'])
    })
  })

  describe('컴포넌트 상호작용', () => {
    it('LightButton의 onClick()은 ripple 효과를 반환한다', () => {
      const button = new LightThemeFactory().createButton()
      expect(button.onClick()).toContain('ripple')
    })

    it('DarkButton의 onClick()은 glow 효과를 반환한다', () => {
      const button = new DarkThemeFactory().createButton()
      expect(button.onClick()).toContain('glow')
    })

    it('LightInput의 onFocus()는 파란 테두리를 언급한다', () => {
      const input = new LightThemeFactory().createInput()
      expect(input.onFocus()).toContain('파란')
    })

    it('DarkInput의 onFocus()는 보라색 테두리를 언급한다', () => {
      const input = new DarkThemeFactory().createInput()
      expect(input.onFocus()).toContain('보라색')
    })
  })
})
