<script setup lang="ts">
/**
 * Observer 패턴 — Vue 구현
 *
 * Vue에서의 역할 매핑:
 *   ref/reactive (반응형 상태)    → Subject: 상태가 변경되면 자동으로 알림을 보낸다
 *   watch / watchEffect           → Observer 등록: 상태 변화를 감지해 자동으로 실행
 *   useNewsAgency() composable    → ConcreteSubject: 뉴스 발행 로직
 *   구독자 배열 + watch            → ConcreteObserver: 변화에 반응하는 구독자들
 *
 * 왜 이렇게 구현하는가?
 *   Vue의 반응형 시스템 자체가 Observer 패턴이다.
 *   ref/reactive가 Subject이고, watch/watchEffect가 Observer를 등록하는 방법이다.
 *   TypeScript 버전의 수동 subscribe/notify 대신,
 *   Vue가 의존성을 자동 추적해서 변경 시 Observer(watch 콜백)를 자동 호출한다.
 *
 *   추가로, 수동 Observer 패턴(composable 기반)도 함께 구현해 비교한다.
 */

import { ref, reactive, watch, watchEffect } from 'vue'

// ─── 방법 1: Vue 반응형 시스템 활용 (watch/watchEffect) ───────────────────────
// Vue의 반응형 시스템이 곧 Observer 패턴이다.
// ref 상태가 Subject이고, watch()로 등록한 콜백이 Observer다.

/** Subject: 뉴스 상태 (ref가 Subject 역할) */
const currentNews = reactive({ headline: '', body: '', publishedAt: '' })

/** 구독자들의 수신 기록 */
const emailInbox = ref<Array<{ headline: string; body: string; time: string }>>([])
const mobileInbox = ref<Array<{ headline: string; body: string; time: string }>>([])
const logInbox = ref<Array<{ headline: string; body: string; time: string }>>([])

/**
 * Observer 1: 이메일 구독자 — watch()로 등록
 * currentNews가 변경될 때마다 자동으로 호출된다.
 * TypeScript 버전의 EmailSubscriber.update()와 동일한 역할.
 */
watch(currentNews, (news) => {
  if (!news.headline) return
  emailInbox.value.unshift({ headline: news.headline, body: news.body, time: news.publishedAt })
})

/**
 * Observer 2: 모바일 구독자 — watch()로 등록
 * 같은 Subject를 다른 Observer가 구독한다.
 */
watch(currentNews, (news) => {
  if (!news.headline) return
  mobileInbox.value.unshift({ headline: news.headline, body: news.body, time: news.publishedAt })
})

/**
 * Observer 3: 로그 구독자 — watchEffect()로 등록
 * watchEffect는 내부에서 사용한 모든 반응형 값을 자동으로 추적한다.
 * 별도의 watch 의존성 선언 없이 currentNews.headline을 읽는 것만으로 등록된다.
 */
watchEffect(() => {
  if (!currentNews.headline) return
  logInbox.value.unshift({
    headline: currentNews.headline,
    body: `[LOG] ${currentNews.body}`,
    time: currentNews.publishedAt,
  })
})

// ─── 방법 2: 수동 Observer 패턴 (구독/해제 가능한 composable) ─────────────────
/**
 * useNewsAgency: Subject composable
 * TypeScript 버전의 NewsAgency처럼 subscribe/unsubscribe/notify를 직접 구현한다.
 * Vue의 자동 추적 대신 명시적 구독 관리가 필요한 경우에 사용한다.
 */
function useNewsAgency() {
  type Subscriber = (headline: string, body: string) => void
  // 구독자 목록 (Set으로 중복 방지)
  const subscribers = new Set<Subscriber>()
  const publishedCount = ref(0)

  function subscribe(fn: Subscriber) {
    subscribers.add(fn)
    return () => subscribers.delete(fn) // 해제 함수 반환
  }

  function publish(headline: string, body: string) {
    publishedCount.value++
    // 모든 구독자에게 알림
    subscribers.forEach(fn => fn(headline, body))
  }

  return { subscribe, publish, publishedCount, subscriberCount: computed(() => subscribers.size) }
}

import { computed } from 'vue'

const agency = useNewsAgency()

// 수동 구독자 수신 기록
const manualSubscribers = ref<Array<{ name: string; messages: Array<{ headline: string }> }>>([
  { name: '구독자 A', messages: [] },
  { name: '구독자 B', messages: [] },
])
const unsubscribeFns: Array<() => void> = []

// 구독자 A, B 등록
manualSubscribers.value.forEach((sub, i) => {
  const unsubscribe = agency.subscribe((headline) => {
    manualSubscribers.value[i].messages.unshift({ headline })
  })
  unsubscribeFns.push(unsubscribe)
})

const subscribedFlags = ref([true, true])

function toggleSubscription(i: number) {
  if (subscribedFlags.value[i]) {
    // 구독 해제
    unsubscribeFns[i]()
    subscribedFlags.value[i] = false
  } else {
    // 재구독
    const unsub = agency.subscribe((headline) => {
      manualSubscribers.value[i].messages.unshift({ headline })
    })
    unsubscribeFns[i] = unsub
    subscribedFlags.value[i] = true
  }
}

// ─── 발행 UI 상태 ─────────────────────────────────────────────────────────────
const headline = ref('Vue 3.5 출시!')
const body = ref('Composition API와 반응형 시스템이 더욱 강력해졌습니다.')

function publishNews() {
  if (!headline.value.trim()) return
  const time = new Date().toLocaleTimeString()
  // Subject 상태 변경 → watch/watchEffect Observer들이 자동 호출됨
  currentNews.headline = headline.value
  currentNews.body = body.value
  currentNews.publishedAt = time
  // 수동 Observer도 동시에 발행
  agency.publish(headline.value, body.value)
}
</script>

<template>
  <div style="font-family: sans-serif; max-width: 750px; margin: 2rem auto; padding: 0 1rem;">
    <h1 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">Observer 패턴</h1>
    <p style="color: #555;">
      Vue의 반응형 시스템(<code>watch/watchEffect</code>)이 Observer 패턴 자체다.
      <code>ref/reactive</code>가 Subject이고, <code>watch()</code>로 등록한 콜백이 Observer다.
      아래에서 자동 추적 방식과 수동 구독 방식을 함께 확인할 수 있다.
    </p>

    <!-- 발행 폼 (ConcreteSubject) -->
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
      <h3 style="margin-top: 0;">뉴스 발행 (Subject 상태 변경)</h3>
      <input v-model="headline" placeholder="헤드라인" style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 0.5rem;" />
      <textarea v-model="body" placeholder="본문" rows="2" style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 0.5rem; resize: vertical;" />
      <button @click="publishNews" style="background: #2b6cb0; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-size: 1rem;">
        발행 (notify all observers)
      </button>
    </div>

    <!-- 방법 1: watch/watchEffect 자동 Observer -->
    <h3>방법 1: watch/watchEffect (Vue 자동 Observer)</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
      <div v-for="(inbox, label) in [
        { data: emailInbox, label: '📧 이메일', color: '#e8f4fd', border: '#bee3f8' },
        { data: mobileInbox, label: '📱 모바일', color: '#f0fff4', border: '#9ae6b4' },
        { data: logInbox, label: '📋 로그', color: '#faf5ff', border: '#d6bcfa' },
      ]" :key="inbox.label"
        :style="{ border: `1px solid ${inbox.border}`, borderRadius: '8px', padding: '0.75rem', background: inbox.color }">
        <div style="font-weight: bold; font-size: 0.9rem; margin-bottom: 0.5rem;">{{ inbox.label }}</div>
        <div v-if="!inbox.data.value.length" style="color: #888; font-size: 0.8rem; font-style: italic;">수신 없음</div>
        <div v-for="(msg, i) in inbox.data.value" :key="i" style="font-size: 0.78rem; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 4px; margin-top: 4px;">
          <div style="font-weight: bold;">{{ msg.headline }}</div>
          <div style="color: #555;">{{ msg.body.length > 40 ? msg.body.slice(0,40)+'...' : msg.body }}</div>
          <div style="color: #aaa;">{{ msg.time }}</div>
        </div>
      </div>
    </div>

    <!-- 방법 2: 수동 subscribe/unsubscribe -->
    <h3>방법 2: 수동 subscribe/unsubscribe composable</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
      <div v-for="(sub, i) in manualSubscribers" :key="sub.name"
        :style="{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.75rem', background: subscribedFlags[i] ? '#fff' : '#f5f5f5' }">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="font-weight: bold; font-size: 0.9rem;">{{ sub.name }}</span>
          <button @click="toggleSubscription(i)"
            :style="{ padding: '3px 10px', cursor: 'pointer', borderRadius: '4px', border: '1px solid', borderColor: subscribedFlags[i] ? '#fc8181' : '#9ae6b4', background: subscribedFlags[i] ? '#fff5f5' : '#f0fff4', fontSize: '0.8rem' }">
            {{ subscribedFlags[i] ? '구독 해제' : '재구독' }}
          </button>
        </div>
        <div style="font-size: 0.8rem; color: subscribedFlags[i] ? '#276749' : '#c53030'; margin-bottom: 0.5rem;">
          {{ subscribedFlags[i] ? '✓ 구독 중' : '✗ 구독 해제됨' }}
        </div>
        <div v-if="!sub.messages.length" style="color: #888; font-size: 0.8rem; font-style: italic;">수신 없음</div>
        <div v-for="(msg, j) in sub.messages" :key="j" style="font-size: 0.78rem; border-top: 1px solid #eee; padding-top: 4px; margin-top: 4px;">
          {{ msg.headline }}
        </div>
      </div>
    </div>
  </div>
</template>
