# Structural Patterns (구조 패턴)

객체를 **어떻게 조합할 것인가**에 대한 패턴. 클래스나 객체를 조합하여 더 큰 구조를 만든다.

---

## 1. Adapter

호환되지 않는 인터페이스를 변환하여 함께 동작하게 만든다.

- TS: 외부 API 응답을 내부 모델로 변환, 레거시 코드 래핑
- React: 외부 라이브러리 래핑 hook
- Vue: 외부 라이브러리 래핑 composable
- Svelte: 외부 라이브러리 래핑 action/store

## 2. Bridge `TS only`

추상화와 구현을 분리하여 각각 독립적으로 변경 가능하게 한다.

- TS: 렌더러(Canvas/SVG)와 도형(Circle/Rect)의 분리

## 3. Composite

개별 객체와 복합 객체를 동일한 인터페이스로 다룬다. 트리 구조.

- TS: 파일/폴더 트리, 메뉴/서브메뉴, 조직도
- React: 재귀 컴포넌트 트리
- Vue: 재귀 컴포넌트
- Svelte: 재귀 컴포넌트 (svelte:self)

## 4. Decorator

객체에 동적으로 새로운 책임(기능)을 추가한다. 상속 대신 조합.

- TS: API 클라이언트에 인증/로깅/캐싱 레이어 추가
- React: HOC, wrapper 컴포넌트
- Vue: 렌더 함수 래핑, directive
- Svelte: wrapper 컴포넌트, action

## 5. Facade

복잡한 서브시스템에 단순한 인터페이스를 제공한다.

- TS: 여러 API 호출을 하나의 서비스 함수로 묶기
- React: 복잡한 hook 단순화
- Vue: 복잡한 composable 단순화
- Svelte: 복잡한 store 로직 단순화

## 6. Flyweight `TS only`

다수의 유사 객체가 데이터를 공유하여 메모리를 절약한다.

- TS: 대량의 리스트 아이템에서 공통 스타일/설정 공유

## 7. Proxy

다른 객체에 대한 대리자를 두어 접근을 제어한다.

- TS: 이미지 지연 로딩, API 캐싱 프록시, 접근 권한 체크
- React: React.lazy, forwardRef, 캐싱 hook
- Vue: defineAsyncComponent, ref (내부적으로 Proxy)
- Svelte: lazy loading, $effect 기반 캐싱
