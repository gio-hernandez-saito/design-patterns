# Design Patterns — TypeScript & Frontend Frameworks

GoF 23개 디자인 패턴을 **순수 TypeScript**, **React**, **Vue**, **Svelte** 버전으로 학습하는 프로젝트.

## 목표

- 패턴의 본질을 순수 TS로 이해
- 같은 패턴이 각 프레임워크에서 어떤 형태로 나타나는지 실무 관점으로 연결
- 프레임워크 버전은 의미 있는 패턴만 작성 (억지로 23개 전부 채우지 않음)
- 실무에서 바로 쓸 수 있는 예시 코드 중심

## 구조

```
design-patterns/
├── docs/                           # 개념 문서
│   ├── overview.md
│   ├── creational.md
│   ├── structural.md
│   └── behavioral.md
├── patterns/
│   ├── creational/
│   │   ├── singleton/
│   │   │   ├── typescript/
│   │   │   │   ├── singleton.ts
│   │   │   │   └── singleton.test.ts
│   │   │   ├── react/              # 해당 시
│   │   │   │   ├── App.tsx
│   │   │   │   ├── index.html
│   │   │   │   └── vite.config.ts
│   │   │   ├── vue/                # 해당 시
│   │   │   │   ├── App.vue
│   │   │   │   ├── index.html
│   │   │   │   └── vite.config.ts
│   │   │   ├── svelte/             # 해당 시
│   │   │   │   ├── App.svelte
│   │   │   │   ├── index.html
│   │   │   │   └── vite.config.ts
│   │   │   └── README.md           # 개념 설명 + 프레임워크별 비교
│   │   ├── factory-method/
│   │   └── ...
│   ├── structural/
│   └── behavioral/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.workspace.ts
└── README.md
```

## 패턴별 프레임워크 구현 범위

### Creational (생성 패턴)

| #  | 패턴             | TS | React | Vue | Svelte | React 적용 예시                |
|----|------------------|:--:|:-----:|:---:|:------:|-------------------------------|
| 1  | Singleton        | O  | O     | O   | O      | 전역 상태, Context             |
| 2  | Factory Method   | O  | O     | O   | O      | 컴포넌트 팩토리                |
| 3  | Abstract Factory | O  | -     | -   | -      | TS only (엔터프라이즈 패턴)    |
| 4  | Builder          | O  | O     | O   | O      | props builder, form builder   |
| 5  | Prototype        | O  | -     | -   | -      | TS only (JS 자체가 prototype) |

### Structural (구조 패턴)

| #  | 패턴      | TS | React | Vue | Svelte | React 적용 예시              |
|----|-----------|:--:|:-----:|:---:|:------:|------------------------------|
| 6  | Adapter   | O  | O     | O   | O      | 외부 라이브러리 래핑 hook      |
| 7  | Bridge    | O  | -     | -   | -      | TS only (추상 구조)           |
| 8  | Composite | O  | O     | O   | O      | 재귀 컴포넌트 트리            |
| 9  | Decorator | O  | O     | O   | O      | HOC, wrapper 컴포넌트         |
| 10 | Facade    | O  | O     | O   | O      | 복잡한 hook/composable 단순화 |
| 11 | Flyweight | O  | -     | -   | -      | TS only (메모리 최적화 전용)  |
| 12 | Proxy     | O  | O     | O   | O      | lazy, forwardRef, 캐싱 hook  |

### Behavioral (행위 패턴)

| #  | 패턴                      | TS | React | Vue | Svelte | React 적용 예시             |
|----|---------------------------|:--:|:-----:|:---:|:------:|----------------------------|
| 13 | Observer                  | O  | O     | O   | O      | custom event hook, 구독 패턴 |
| 14 | Strategy                  | O  | O     | O   | O      | 렌더 전략, 정렬/필터 교체    |
| 15 | Command                   | O  | O     | O   | O      | undo/redo, action dispatch  |
| 16 | Chain of Responsibility   | O  | O     | O   | O      | 미들웨어, 폼 검증 체인       |
| 17 | State                     | O  | O     | O   | O      | 상태 머신, useReducer        |
| 18 | Template Method           | O  | O     | O   | O      | 커스텀 hook 골격             |
| 19 | Mediator                  | O  | O     | O   | O      | 컴포넌트 간 통신 중재        |
| 20 | Iterator                  | O  | -     | -   | -      | TS only (JS 내장 iterator)  |
| 21 | Memento                   | O  | -     | -   | -      | TS only (상태 스냅샷)        |
| 22 | Visitor                   | O  | -     | -   | -      | TS only (AST 처리 전용)     |
| 23 | Interpreter               | O  | -     | -   | -      | TS only (DSL 파싱 전용)     |

> **프레임워크 버전**: TS + 프레임워크 모두 15개, TS only 8개

## 진행 상태

- [ ] Creational (0/5)
- [ ] Structural (0/7)
- [ ] Behavioral (0/11)

## 사용법

```bash
cd private/design-patterns
claude
> "Observer 패턴 시작하자"
```
