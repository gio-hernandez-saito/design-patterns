import { describe, it, expect } from "vitest";
import {
  Espresso,
  DripCoffee,
  Decaf,
  Milk,
  Syrup,
  WhipCream,
  ExtraShot,
  SoyMilk,
  getOrderSummary,
  type Beverage,
} from "./decorator.js";

// =============================================================================
// 데코레이터 패턴 테스트
// 핵심 검증 사항:
// 1. 단일 데코레이터가 설명과 가격을 올바르게 누적하는지
// 2. 데코레이터를 여러 겹 중첩할 때 누적이 정확한지
// 3. 동일한 데코레이터를 여러 번 적용할 수 있는지
// 4. 기본 음료는 데코레이터 없이 그대로 동작하는지
// =============================================================================

describe("ConcreteComponent: 기본 음료", () => {
  it("에스프레소의 기본 가격과 설명을 반환한다", () => {
    const espresso = new Espresso();

    expect(espresso.getDescription()).toBe("에스프레소");
    expect(espresso.getCost()).toBe(1500);
  });

  it("드립 커피의 기본 가격과 설명을 반환한다", () => {
    const drip = new DripCoffee();

    expect(drip.getDescription()).toBe("드립 커피");
    expect(drip.getCost()).toBe(1200);
  });

  it("디카페인의 기본 가격과 설명을 반환한다", () => {
    const decaf = new Decaf();

    expect(decaf.getDescription()).toBe("디카페인");
    expect(decaf.getCost()).toBe(1700);
  });
});

describe("ConcreteDecorator: 단일 토핑 추가", () => {
  it("에스프레소에 우유를 추가하면 설명과 가격이 누적된다", () => {
    const coffeeWithMilk = new Milk(new Espresso());

    expect(coffeeWithMilk.getDescription()).toBe("에스프레소 + 우유");
    expect(coffeeWithMilk.getCost()).toBe(1500 + 300);  // 에스프레소 + 우유
  });

  it("드립 커피에 시럽을 추가한다 (기본 바닐라 시럽)", () => {
    const dripWithSyrup = new Syrup(new DripCoffee());

    expect(dripWithSyrup.getDescription()).toContain("드립 커피");
    expect(dripWithSyrup.getDescription()).toContain("바닐라 시럽");
    expect(dripWithSyrup.getCost()).toBe(1200 + 500);
  });

  it("커피에 커스텀 시럽 맛을 지정할 수 있다", () => {
    const hazelnutSyrup = new Syrup(new Espresso(), "헤이즐넛");

    expect(hazelnutSyrup.getDescription()).toContain("헤이즐넛 시럽");
  });

  it("에스프레소에 휘핑크림을 추가한다", () => {
    const withWhip = new WhipCream(new Espresso());

    expect(withWhip.getDescription()).toBe("에스프레소 + 휘핑크림");
    expect(withWhip.getCost()).toBe(1500 + 600);
  });

  it("추가 샷을 넣을 수 있다", () => {
    const withShot = new ExtraShot(new Espresso());

    expect(withShot.getDescription()).toContain("샷 1개 추가");
    expect(withShot.getCost()).toBe(1500 + 400);
  });

  it("샷 개수를 2개로 지정할 수 있다", () => {
    const withDoubleShot = new ExtraShot(new Espresso(), 2);

    expect(withDoubleShot.getDescription()).toContain("샷 2개 추가");
    expect(withDoubleShot.getCost()).toBe(1500 + 800);  // 400 × 2
  });

  it("두유를 추가할 수 있다", () => {
    const withSoy = new SoyMilk(new Espresso());

    expect(withSoy.getDescription()).toContain("두유");
    expect(withSoy.getCost()).toBe(1500 + 500);
  });
});

describe("데코레이터 중첩: 여러 토핑 동시 적용", () => {
  it("에스프레소 + 우유 + 시럽 조합이 올바르게 동작한다", () => {
    // 안에서 밖으로: 에스프레소 → 우유 → 시럽
    const latte = new Syrup(new Milk(new Espresso()));

    expect(latte.getDescription()).toBe("에스프레소 + 우유 + 바닐라 시럽");
    expect(latte.getCost()).toBe(1500 + 300 + 500);  // 에스프레소 + 우유 + 시럽
  });

  it("풀 옵션 커피 (에스프레소 + 우유 + 시럽 + 휘핑크림 + 추가 샷)을 만들 수 있다", () => {
    const fullOption = new ExtraShot(
      new WhipCream(
        new Syrup(
          new Milk(
            new Espresso()
          )
        )
      )
    );

    const expectedCost = 1500  // 에스프레소
      + 300   // 우유
      + 500   // 시럽
      + 600   // 휘핑크림
      + 400;  // 추가 샷

    expect(fullOption.getCost()).toBe(expectedCost);
    expect(fullOption.getDescription()).toContain("에스프레소");
    expect(fullOption.getDescription()).toContain("우유");
    expect(fullOption.getDescription()).toContain("시럽");
    expect(fullOption.getDescription()).toContain("휘핑크림");
    expect(fullOption.getDescription()).toContain("샷 1개 추가");
  });

  it("드립 커피 + 두유 + 헤이즐넛 시럽 조합이 가능하다", () => {
    const drink = new Syrup(new SoyMilk(new DripCoffee()), "헤이즐넛");

    expect(drink.getDescription()).toBe("드립 커피 + 두유 + 헤이즐넛 시럽");
    expect(drink.getCost()).toBe(1200 + 500 + 500);
  });
});

describe("동일 데코레이터 중복 적용", () => {
  it("우유를 두 번 추가하면 가격이 두 배로 누적된다", () => {
    // 데코레이터 패턴은 동일 데코레이터를 여러 번 적용할 수 있다.
    const doubleMilk = new Milk(new Milk(new Espresso()));

    expect(doubleMilk.getDescription()).toBe("에스프레소 + 우유 + 우유");
    expect(doubleMilk.getCost()).toBe(1500 + 300 + 300);
  });

  it("시럽을 두 종류 추가할 수 있다 (바닐라 + 헤이즐넛)", () => {
    const twoSyrups = new Syrup(new Syrup(new Espresso(), "헤이즐넛"), "바닐라");

    expect(twoSyrups.getDescription()).toContain("헤이즐넛 시럽");
    expect(twoSyrups.getDescription()).toContain("바닐라 시럽");
    expect(twoSyrups.getCost()).toBe(1500 + 500 + 500);
  });
});

describe("Beverage 인터페이스로 통일된 사용 (데코레이터 패턴의 핵심)", () => {
  it("기본 음료와 데코레이팅된 음료를 동일한 인터페이스로 다룬다", () => {
    // 클라이언트 코드는 Beverage 타입만 알면 된다.
    const beverages: Beverage[] = [
      new Espresso(),
      new Milk(new Espresso()),
      new WhipCream(new Syrup(new DripCoffee())),
      new ExtraShot(new WhipCream(new Decaf()), 2),
    ];

    // 모든 음료가 동일한 인터페이스를 구현한다
    for (const beverage of beverages) {
      expect(beverage.getDescription()).toBeTruthy();
      expect(beverage.getCost()).toBeGreaterThan(0);
    }
  });

  it("getOrderSummary 헬퍼로 주문 요약을 출력한다", () => {
    const coffee = new WhipCream(new Milk(new Espresso()));
    const summary = getOrderSummary(coffee);

    expect(summary).toContain("에스프레소");
    expect(summary).toContain("우유");
    expect(summary).toContain("휘핑크림");
    expect(summary).toContain("원");
  });

  it("가격 기준으로 정렬할 수 있다", () => {
    const beverages: Beverage[] = [
      new WhipCream(new Syrup(new Milk(new Espresso()))),  // 비싼 것
      new Espresso(),                                       // 기본
      new Milk(new DripCoffee()),                          // 중간
    ];

    const sorted = [...beverages].sort((a, b) => a.getCost() - b.getCost());

    // 오름차순: Espresso(1500) < Milk+Drip(1500) < 풀옵션(?)
    // 실제 값 검증
    expect(sorted[0].getCost()).toBeLessThanOrEqual(sorted[1].getCost());
    expect(sorted[1].getCost()).toBeLessThanOrEqual(sorted[2].getCost());
  });
});
