# Design Patterns

GoF 23개 디자인 패턴을 **TypeScript**, **React**, **Vue**, **Svelte**로 구현한 학습 & 포트폴리오 프로젝트.

## Why?

- 패턴의 본질을 순수 TS로 이해
- 같은 패턴이 프레임워크별로 어떻게 다르게 표현되는지 실무 코드로 비교
- 프레임워크 버전은 의미 있는 패턴만 작성

## Tech Stack

- **TypeScript 5** — 순수 패턴 구현
- **React 19** — hooks, Context 기반
- **Vue 3.5** — Composition API, `<script setup>`
- **Svelte 5** — runes (`$state`, `$derived`, `$effect`)
- **Vite 6** — 모든 프레임워크 공통 빌드
- **Vitest** — 테스트
- **pnpm workspaces** — 모노레포

## Progress

### Creational (생성)

| 패턴             | TS | React | Vue | Svelte |
|------------------|:--:|:-----:|:---:|:------:|
| Singleton        | ✅ | ✅    | ✅  | ✅     |
| Factory Method   | ✅ | ✅    | ✅  | ✅     |
| Abstract Factory | ✅ |  -    |  -  |   -    |
| Builder          | ✅ | ✅    | ✅  | ✅     |
| Prototype        | ✅ |  -    |  -  |   -    |

### Structural (구조)

| 패턴      | TS | React | Vue | Svelte |
|-----------|:--:|:-----:|:---:|:------:|
| Adapter   | ✅ | ✅    | ✅  | ✅     |
| Bridge    | ✅ |  -    |  -  |   -    |
| Composite | ✅ | ✅    | ✅  | ✅     |
| Decorator | ✅ | ✅    | ✅  | ✅     |
| Facade    | ✅ | ✅    | ✅  | ✅     |
| Flyweight | ✅ |  -    |  -  |   -    |
| Proxy     | ✅ | ✅    | ✅  | ✅     |

### Behavioral (행위)

| 패턴                    | TS | React | Vue | Svelte |
|-------------------------|:--:|:-----:|:---:|:------:|
| Observer                | ✅ | ✅    | ✅  | ✅     |
| Strategy                | ✅ | ✅    | ✅  | ✅     |
| Command                 | ✅ | ✅    | ✅  | ✅     |
| Chain of Responsibility | ✅ | ✅    | ✅  | ✅     |
| State                   | ✅ | ✅    | ✅  | ✅     |
| Template Method         | ✅ | ✅    | ✅  | ✅     |
| Mediator                | ✅ | ✅    | ✅  | ✅     |
| Iterator                | ✅ |  -    |  -  |   -    |
| Memento                 | ✅ |  -    |  -  |   -    |
| Visitor                 | ✅ |  -    |  -  |   -    |
| Interpreter             | ✅ |  -    |  -  |   -    |

> `-` = 해당 프레임워크 버전 불필요 (TS only)

## Getting Started

```bash
pnpm install
pnpm test           # 전체 테스트
pnpm typecheck      # 타입 체크
```

## Docs

- [Overview](docs/overview.md)
- [Creational Patterns](docs/creational.md)
- [Structural Patterns](docs/structural.md)
- [Behavioral Patterns](docs/behavioral.md)
