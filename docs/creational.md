# Creational Patterns (생성 패턴)

객체를 **어떻게 만들 것인가**에 대한 패턴. 객체 생성 로직을 캡슐화하여 유연성과 재사용성을 높인다.

---

## 1. Singleton

클래스의 인스턴스를 하나만 보장하고, 전역 접근점을 제공한다.

- TS: 설정 관리자, 로그 시스템, DB 커넥션 풀
- React: 전역 상태, Context
- Vue: app.provide / 전역 composable
- Svelte: module-level store

## 2. Factory Method

객체 생성을 서브클래스에 위임한다. 어떤 클래스의 인스턴스를 만들지를 서브클래스가 결정한다.

- TS: 알림 생성 (Email, SMS, Push 등 타입에 따라 다른 객체 생성)
- React: 컴포넌트 팩토리
- Vue: 동적 컴포넌트 (component :is)
- Svelte: 동적 컴포넌트 (svelte:component)

## 3. Abstract Factory `TS only`

관련된 객체 군(family)을 구체 클래스 지정 없이 생성한다.

- TS: UI 테마 시스템 (Light/Dark 테마별로 Button, Input, Card 등을 일관되게 생성)

## 4. Builder

복잡한 객체의 생성 과정과 표현을 분리한다. 단계별로 객체를 조립한다.

- TS: 검색 쿼리 빌더, HTTP 요청 구성
- React: props builder, form builder
- Vue: form builder composable
- Svelte: form builder action

## 5. Prototype `TS only`

기존 객체를 복제(clone)하여 새 객체를 생성한다.

- TS: 설정 프리셋 복제, 템플릿에서 새 문서 생성
