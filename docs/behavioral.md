# Behavioral Patterns (행위 패턴)

객체 간 **어떻게 소통하고 역할을 분담할 것인가**에 대한 패턴. 알고리즘과 책임의 할당을 다룬다.

---

## 1. Observer

상태 변화가 발생하면 의존 객체들에 자동으로 통지한다.

- TS: 이벤트 리스너, 상태 관리 구독, 실시간 알림
- React: custom event hook, 구독 패턴 (useSyncExternalStore)
- Vue: watch, watchEffect, EventBus
- Svelte: $effect, readable/writable store 구독

## 2. Strategy

알고리즘을 캡슐화하여 런타임에 교체 가능하게 한다.

- TS: 정렬 방식 전환, 결제 수단 선택, 검증 로직 교체
- React: 렌더 전략, 정렬/필터 교체
- Vue: 동적 컴포넌트 + provide/inject
- Svelte: snippet 전달, 컴포넌트 prop 교체

## 3. Command

요청을 객체로 캡슐화하여 매개변수화, 큐잉, 취소(Undo/Redo)를 가능하게 한다.

- TS: 에디터의 Undo/Redo, 작업 큐, 단축키 바인딩
- React: undo/redo, action dispatch (useReducer)
- Vue: undo/redo composable, Pinia action
- Svelte: undo/redo store, command dispatcher

## 4. Chain of Responsibility

요청을 처리할 수 있는 객체들의 체인을 따라 전달한다. 처리 가능한 객체가 처리한다.

- TS: 미들웨어 체인, 폼 유효성 검증 체인, 이벤트 버블링
- React: 미들웨어, 폼 검증 체인
- Vue: navigation guard 체인, 검증 체인
- Svelte: 미들웨어 패턴, 검증 체인

## 5. State

객체의 내부 상태에 따라 행위를 변경한다. 상태별로 다른 클래스가 동작한다.

- TS: 주문 상태(대기/결제/배송/완료)에 따른 동작 변화
- React: 상태 머신, useReducer
- Vue: 상태 머신 composable
- Svelte: $state 기반 상태 머신

## 6. Template Method

알고리즘의 골격을 정의하고, 세부 단계를 서브클래스에 위임한다.

- TS: 데이터 fetch → transform → render 파이프라인
- React: 커스텀 hook 골격
- Vue: composable 골격
- Svelte: 재사용 가능한 로직 함수 골격

## 7. Mediator

객체 간 직접 통신 대신 중재자를 통해 소통한다. 결합도를 낮춘다.

- TS: 폼 필드 간 상호작용 조율, 채팅방(서버가 중재자)
- React: 컴포넌트 간 통신 중재 (Context, 이벤트 버스)
- Vue: provide/inject 기반 중재
- Svelte: context 기반 중재

## 8. Iterator `TS only`

컬렉션의 내부 구조를 노출하지 않고 요소를 순차적으로 접근한다.

- TS: 페이지네이션, 무한 스크롤 데이터 순회, 트리 순회

## 9. Memento `TS only`

객체의 상태를 저장하고, 필요 시 이전 상태로 복원한다.

- TS: 폼 임시저장/복원, 에디터 버전 히스토리

## 10. Visitor `TS only`

객체 구조를 변경하지 않고 새로운 연산을 추가한다.

- TS: AST 노드 순회, 다양한 포맷으로 내보내기(JSON/CSV/PDF)

## 11. Interpreter `TS only`

언어의 문법을 클래스로 표현하고 해석한다.

- TS: 검색 필터 DSL 파싱, 수식 계산기, 템플릿 엔진
