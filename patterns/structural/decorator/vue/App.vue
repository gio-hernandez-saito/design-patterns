<script setup lang="ts">
/**
 * Decorator 패턴 — Vue 구현
 *
 * Vue에서의 역할 매핑:
 *   useBeverage()         → Component 인터페이스: description과 cost를 제공하는 기반
 *   withMilk/withSyrup 등 → Decorator composable: 기존 composable을 감싸 기능을 추가
 *   computed 체이닝       → 데코레이터 중첩: computed가 다른 computed를 참조해 값을 누적
 *   선택 체크박스 UI       → 런타임에 동적으로 데코레이터를 적용/해제
 *
 * 왜 이렇게 구현하는가?
 *   TypeScript 버전에서는 Beverage 객체를 새 객체로 감싸는(wrapping) 방식을 사용했지만,
 *   Vue에서는 reactive + computed를 체이닝해 동일한 효과를 달성한다.
 *   선택된 토핑 목록을 기반으로 computed가 description/cost를 누적 계산하므로
 *   추가/제거가 자동으로 반응형으로 반영된다.
 */

import { ref, computed } from 'vue'

// ─── 음료 기본 타입 (Component 인터페이스) ────────────────────────────────────
interface BeverageConfig {
  name: string    // 기본 음료 이름
  baseCost: number
}

// ─── 토핑 정의 (ConcreteDecorator 목록) ──────────────────────────────────────
// 각 토핑은 description에 추가할 이름과 가격 기여분을 가진다.
// TypeScript 버전의 Milk, Syrup, WhipCream 클래스를 데이터로 표현한 것이다.
interface Topping {
  id: string
  label: string   // UI 표시용
  addDesc: string // description에 추가할 문자열
  addCost: number // cost에 추가할 금액
}

const toppingOptions: Topping[] = [
  { id: 'milk',      label: '우유',       addDesc: '+ 우유',          addCost: 300 },
  { id: 'soymilk',   label: '두유',       addDesc: '+ 두유',          addCost: 500 },
  { id: 'vanilla',   label: '바닐라 시럽', addDesc: '+ 바닐라 시럽',  addCost: 500 },
  { id: 'caramel',   label: '카라멜 시럽', addDesc: '+ 카라멜 시럽',  addCost: 500 },
  { id: 'whip',      label: '휘핑크림',    addDesc: '+ 휘핑크림',     addCost: 600 },
  { id: 'extrashot', label: '샷 추가',     addDesc: '+ 샷 1개 추가',  addCost: 400 },
]

// ─── 기본 음료 선택 (ConcreteComponent) ──────────────────────────────────────
const beverageOptions: BeverageConfig[] = [
  { name: '에스프레소', baseCost: 1500 },
  { name: '드립 커피',  baseCost: 1200 },
  { name: '디카페인',   baseCost: 1700 },
]

const selectedBeverage = ref<BeverageConfig>(beverageOptions[0])
// 선택된 토핑 ID 목록 — 여기에 추가/제거하면 computed가 자동으로 재계산된다
const selectedToppings = ref<Set<string>>(new Set())

function toggleTopping(id: string) {
  if (selectedToppings.value.has(id)) {
    selectedToppings.value.delete(id)
  } else {
    selectedToppings.value.add(id)
  }
  // Vue 반응성을 트리거하기 위해 Set을 새로 할당
  selectedToppings.value = new Set(selectedToppings.value)
}

// ─── Decorator 체이닝: computed로 구현 ────────────────────────────────────────
// TypeScript 버전: new Milk(new Syrup(new Espresso()))처럼 객체를 감쌌다면
// Vue 버전: 선택된 토핑을 순서대로 reduce하여 description/cost를 누적한다.
// 결과는 동일하다: 각 데코레이터가 이전 값에 자신의 기여분을 더한다.

const decoratedDescription = computed(() => {
  // 기본 음료 description에서 시작
  let desc = selectedBeverage.value.name

  // 선택된 토핑을 순서대로 "감싸며" description을 누적한다.
  // TypeScript: this.beverage.getDescription() + " + 우유" 와 동일한 패턴
  for (const topping of toppingOptions) {
    if (selectedToppings.value.has(topping.id)) {
      desc = desc + ' ' + topping.addDesc
    }
  }
  return desc
})

const decoratedCost = computed(() => {
  // 기본 음료 가격에서 시작
  let cost = selectedBeverage.value.baseCost

  // 선택된 토핑의 가격을 순서대로 누적한다.
  // TypeScript: this.beverage.getCost() + 300 과 동일한 패턴
  for (const topping of toppingOptions) {
    if (selectedToppings.value.has(topping.id)) {
      cost += topping.addCost
    }
  }
  return cost
})

// 주문 내역
const orders = ref<Array<{ description: string; cost: number }>>([])

function placeOrder() {
  orders.value.unshift({
    description: decoratedDescription.value,
    cost: decoratedCost.value,
  })
}
</script>

<template>
  <div style="font-family: sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem;">
    <h1 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">Decorator 패턴</h1>
    <p style="color: #555;">
      토핑 체크박스를 선택하면 <code>computed</code>가 description과 cost를 누적 계산한다.
      TypeScript 버전의 <code>new Milk(new Syrup(new Espresso()))</code> 객체 감싸기를
      Vue에서는 <code>computed</code> 체이닝으로 표현한다.
    </p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
      <!-- 왼쪽: 기본 음료 + 토핑 선택 -->
      <div>
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <h3 style="margin-top: 0;">기본 음료 (ConcreteComponent)</h3>
          <div v-for="bev in beverageOptions" :key="bev.name">
            <label style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem; padding: 4px 0;">
              <input
                type="radio"
                :value="bev"
                v-model="selectedBeverage"
              />
              <span>{{ bev.name }}</span>
              <span style="margin-left: auto; color: #888; font-size: 0.85rem;">{{ bev.baseCost.toLocaleString() }}원</span>
            </label>
          </div>
        </div>

        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem;">
          <h3 style="margin-top: 0;">토핑 선택 (Decorator 적용)</h3>
          <div v-for="topping in toppingOptions" :key="topping.id">
            <label style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem; padding: 4px 0;">
              <input
                type="checkbox"
                :checked="selectedToppings.has(topping.id)"
                @change="toggleTopping(topping.id)"
              />
              <span>{{ topping.label }}</span>
              <span style="margin-left: auto; color: #888; font-size: 0.85rem;">+{{ topping.addCost.toLocaleString() }}원</span>
            </label>
          </div>
        </div>
      </div>

      <!-- 오른쪽: 실시간 주문 미리보기 -->
      <div>
        <div style="border: 2px solid #d69e2e; border-radius: 8px; padding: 1.5rem; background: #fffff0;">
          <h3 style="margin-top: 0; color: #744210;">주문 미리보기</h3>

          <!-- Decorator 체인 시각화 -->
          <div style="font-size: 0.85rem; color: #555; margin-bottom: 1rem;">
            <div style="font-weight: bold; margin-bottom: 0.5rem;">적용된 Decorator 체인:</div>
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <div style="padding: 4px 8px; background: #e6fffa; border-radius: 4px; border-left: 3px solid #38b2ac;">
                {{ selectedBeverage.name }} (기본)
              </div>
              <template v-for="topping in toppingOptions" :key="topping.id">
                <div
                  v-if="selectedToppings.has(topping.id)"
                  style="padding: 4px 8px; background: #faf5ff; border-radius: 4px; border-left: 3px solid #805ad5; margin-left: 0.5rem;"
                >
                  {{ topping.label }} 데코레이터
                </div>
              </template>
            </div>
          </div>

          <div style="border-top: 1px solid #e2c97a; padding-top: 1rem; margin-top: 0.5rem;">
            <div style="font-weight: bold; font-size: 0.9rem; color: #553c9a; margin-bottom: 0.5rem;">
              최종 설명:
            </div>
            <div style="font-size: 0.95rem; word-break: break-word;">{{ decoratedDescription }}</div>
          </div>

          <div style="border-top: 1px solid #e2c97a; padding-top: 1rem; margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold;">총 가격:</span>
            <span style="font-size: 1.3rem; font-weight: bold; color: #c05621;">
              {{ decoratedCost.toLocaleString() }}원
            </span>
          </div>

          <button
            @click="placeOrder"
            style="width: 100%; margin-top: 1rem; padding: 10px; background: #744210; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;"
          >
            주문하기
          </button>
        </div>
      </div>
    </div>

    <!-- 주문 내역 -->
    <div v-if="orders.length" style="margin-top: 1.5rem;">
      <h3>주문 내역</h3>
      <div v-for="(order, i) in orders" :key="i" style="border: 1px solid #ddd; border-radius: 6px; padding: 0.75rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem;">
        <span>{{ order.description }}</span>
        <strong>{{ order.cost.toLocaleString() }}원</strong>
      </div>
    </div>
  </div>
</template>
