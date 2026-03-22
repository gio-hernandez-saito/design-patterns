<script setup lang="ts">
/**
 * Facade 패턴 — Vue 구현
 *
 * Vue에서의 역할 매핑:
 *   useTV() / useAmplifier() / useStreamingBox() / useLights() → 서브시스템 composables
 *   useHomeTheater() (Facade composable)                        → 복잡한 서브시스템을 하나로 통합
 *   <template>의 버튼들                                          → Client: 퍼사드 메서드만 호출
 *
 * 왜 이렇게 구현하는가?
 *   TypeScript 버전의 HomeTheaterFacade 클래스를 Vue에서는 composable로 표현한다.
 *   각 서브시스템도 개별 composable로 분리해 "복잡한 내부 시스템"을 표현한다.
 *   클라이언트(template)는 watchMovie() 같은 단순 메서드만 호출하면 되고,
 *   내부에서 TV/앰프/스트리밍/조명을 올바른 순서로 제어하는 복잡함은 숨겨진다.
 */

import { reactive, computed } from 'vue'

// ─── 서브시스템 composables ───────────────────────────────────────────────────
// 각각은 자체적으로 복잡한 상태와 API를 가진다.
// 클라이언트가 직접 다루기 어려운 "내부 시스템"이다.

/** TV 서브시스템 */
function useTV() {
  const state = reactive({ isOn: false, input: 'HDMI1', brightness: 80, mode: '일반' })

  return {
    state,
    turnOn() { state.isOn = true },
    turnOff() { state.isOn = false },
    setInput(input: string) {
      if (!state.isOn) throw new Error('TV가 꺼져 있습니다')
      state.input = input
    },
    enableCinemaMode() { state.brightness = 60; state.mode = '시네마' },
    reset() { state.isOn = false; state.input = 'HDMI1'; state.brightness = 80; state.mode = '일반' },
  }
}

/** 앰프 서브시스템 */
function useAmplifier() {
  const state = reactive({ isOn: false, volume: 30, surroundMode: '스테레오' })

  return {
    state,
    turnOn() { state.isOn = true },
    turnOff() { state.isOn = false },
    setVolume(v: number) {
      if (!state.isOn) throw new Error('앰프가 꺼져 있습니다')
      state.volume = Math.max(0, Math.min(100, v))
    },
    setSurroundMode(mode: string) { state.surroundMode = mode },
    reset() { state.isOn = false; state.volume = 30; state.surroundMode = '스테레오' },
  }
}

/** 스트리밍 박스 서브시스템 */
function useStreamingBox() {
  const state = reactive({ isOn: false, app: '', content: '' })

  return {
    state,
    turnOn() { state.isOn = true },
    turnOff() { state.isOn = false; state.content = '' },
    launchApp(app: string) {
      if (!state.isOn) throw new Error('스트리밍 박스가 꺼져 있습니다')
      state.app = app
    },
    play(content: string) { state.content = content },
    stop() { state.content = '' },
    reset() { state.isOn = false; state.app = ''; state.content = '' },
  }
}

/** 스마트 조명 서브시스템 */
function useLights() {
  const state = reactive({ brightness: 100, color: '흰색', isOn: true })

  return {
    state,
    setScene(scene: '영화' | '독서' | '파티' | '수면' | '기본') {
      const scenes = {
        영화:  { brightness: 10,  color: '주황' },
        독서:  { brightness: 80,  color: '흰색' },
        파티:  { brightness: 60,  color: '보라' },
        수면:  { brightness: 0,   color: '흰색' },
        기본:  { brightness: 100, color: '흰색' },
      }
      const s = scenes[scene]
      state.brightness = s.brightness
      state.color = s.color
      state.isOn = s.brightness > 0
    },
    turnOn() { state.brightness = 100; state.isOn = true },
    turnOff() { state.brightness = 0; state.isOn = false },
  }
}

// ─── Facade composable ────────────────────────────────────────────────────────
/**
 * useHomeTheater: 홈시어터 퍼사드
 *
 * 복잡한 서브시스템 composable들을 내부에 보유하고
 * 클라이언트에게 단순한 메서드(watchMovie, endMovie 등)만 노출한다.
 * 서브시스템 간의 순서 의존성은 여기서 관리한다.
 */
function useHomeTheater() {
  const tv = useTV()
  const amp = useAmplifier()
  const streaming = useStreamingBox()
  const lights = useLights()

  // 실행 로그: 퍼사드가 내부적으로 어떤 단계를 수행하는지 시각화
  const log = reactive<string[]>([])

  function addLog(msg: string) { log.unshift(msg) }

  /**
   * 영화 보기: 여러 단계를 하나의 메서드로 통합
   * 클라이언트는 이 한 줄만 호출하면 된다.
   */
  function watchMovie(title: string, app = 'Netflix') {
    log.length = 0
    addLog(`▶ watchMovie("${title}") 시작`)
    // 1. 조명 설정
    lights.setScene('영화')
    addLog('  조명 → 영화 모드 (주황, 10%)')
    // 2. TV 설정 (순서 중요: 켜기 → 모드 → 입력)
    tv.turnOn()
    tv.enableCinemaMode()
    tv.setInput('HDMI1')
    addLog('  TV → 켜기, 시네마 모드, HDMI1 입력')
    // 3. 앰프 설정
    amp.turnOn()
    amp.setSurroundMode('돌비 애트모스')
    amp.setVolume(40)
    addLog('  앰프 → 켜기, 돌비 애트모스, 볼륨 40')
    // 4. 스트리밍
    streaming.turnOn()
    streaming.launchApp(app)
    streaming.play(title)
    addLog(`  스트리밍 → ${app} 실행, "${title}" 재생`)
    addLog(`✓ 영화 준비 완료!`)
  }

  /** 영화 종료: 역순으로 안전하게 끈다 */
  function endMovie() {
    log.length = 0
    addLog('■ endMovie() 시작')
    streaming.stop()
    streaming.turnOff()
    addLog('  스트리밍 → 정지 후 끄기')
    amp.turnOff()
    addLog('  앰프 → 끄기')
    tv.turnOff()
    addLog('  TV → 끄기')
    lights.setScene('기본')
    addLog('  조명 → 기본 모드 복귀')
    addLog('✓ 영화 종료 완료')
  }

  /** 음악 감상 모드 */
  function listenToMusic(playlist: string) {
    log.length = 0
    addLog(`♪ listenToMusic("${playlist}") 시작`)
    lights.setScene('파티')
    addLog('  조명 → 파티 모드')
    amp.turnOn()
    amp.setSurroundMode('스테레오')
    amp.setVolume(60)
    addLog('  앰프 → 켜기, 스테레오, 볼륨 60')
    streaming.turnOn()
    streaming.launchApp('Spotify')
    streaming.play(playlist)
    addLog(`  스트리밍 → Spotify, "${playlist}" 재생`)
    addLog('✓ 음악 재생 중!')
  }

  /** 전체 종료 */
  function shutdownAll() {
    log.length = 0
    addLog('⏻ shutdownAll() 시작')
    streaming.turnOff()
    amp.turnOff()
    tv.turnOff()
    lights.turnOff()
    addLog('  모든 기기 종료')
    addLog('✓ 시스템 전체 종료')
  }

  return { tv, amp, streaming, lights, log, watchMovie, endMovie, listenToMusic, shutdownAll }
}

// ─── 인스턴스화 ───────────────────────────────────────────────────────────────
const theater = useHomeTheater()
const movieTitle = { value: '인터스텔라' }
const playlist = { value: '팝 베스트 100' }
</script>

<template>
  <div style="font-family: sans-serif; max-width: 750px; margin: 2rem auto; padding: 0 1rem;">
    <h1 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">Facade 패턴</h1>
    <p style="color: #555;">
      <code>useHomeTheater()</code>가 퍼사드다. TV/앰프/스트리밍/조명 4개의 복잡한 서브시스템을 내부에 보유하고,
      클라이언트에게는 <code>watchMovie()</code> 같은 단순 메서드만 노출한다.
    </p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
      <!-- 클라이언트 컨트롤 (Facade 메서드만 사용) -->
      <div>
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <h3 style="margin-top: 0; color: #2b6cb0;">Client — 퍼사드 메서드 호출</h3>
          <div style="margin-bottom: 0.75rem;">
            <input v-model="movieTitle.value" placeholder="영화 제목" style="width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 6px;" />
            <button @click="theater.watchMovie(movieTitle.value)"
              style="width: 100%; padding: 8px; background: #2b6cb0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.95rem; margin-bottom: 4px;">
              🎬 watchMovie()
            </button>
            <button @click="theater.endMovie()"
              style="width: 100%; padding: 8px; background: #718096; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.95rem;">
              ⏹ endMovie()
            </button>
          </div>
          <div style="margin-bottom: 0.75rem;">
            <input v-model="playlist.value" placeholder="플레이리스트" style="width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 6px;" />
            <button @click="theater.listenToMusic(playlist.value)"
              style="width: 100%; padding: 8px; background: #276749; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.95rem;">
              🎵 listenToMusic()
            </button>
          </div>
          <button @click="theater.shutdownAll()"
            style="width: 100%; padding: 8px; background: #c53030; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.95rem;">
            ⏻ shutdownAll()
          </button>
        </div>

        <!-- 퍼사드 실행 로그 -->
        <div v-if="theater.log.length" style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem;">
          <h3 style="margin-top: 0; font-size: 0.9rem;">퍼사드 내부 실행 순서</h3>
          <div v-for="(entry, i) in [...theater.log].reverse()" :key="i"
            style="font-size: 0.8rem; font-family: monospace; padding: 2px 0; color: #333;">
            {{ entry }}
          </div>
        </div>
      </div>

      <!-- 서브시스템 상태 (복잡한 내부 — 클라이언트가 직접 다루지 않아도 됨) -->
      <div>
        <h3 style="margin-top: 0; color: #718096;">서브시스템 상태 (내부)</h3>

        <div v-for="(label, key) in {tv: 'TV', amp: '앰프', streaming: '스트리밍', lights: '조명'}" :key="key"
          :style="{
            border: '1px solid #ddd', borderRadius: '6px', padding: '0.75rem',
            marginBottom: '0.5rem',
            background: (theater as any)[key].state.isOn ? '#f0fff4' : '#f5f5f5',
          }">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <strong style="font-size: 0.9rem;">{{ label }}</strong>
            <span :style="{ fontSize: '0.8rem', color: (theater as any)[key].state.isOn ? '#276749' : '#718096' }">
              {{ (theater as any)[key].state.isOn ? '켜짐' : '꺼짐' }}
            </span>
          </div>
          <div style="font-size: 0.75rem; color: #555; font-family: monospace;">
            <template v-if="key === 'tv'">
              입력: {{ theater.tv.state.input }} | 밝기: {{ theater.tv.state.brightness }}% | {{ theater.tv.state.mode }}
            </template>
            <template v-else-if="key === 'amp'">
              볼륨: {{ theater.amp.state.volume }} | {{ theater.amp.state.surroundMode }}
            </template>
            <template v-else-if="key === 'streaming'">
              앱: {{ theater.streaming.state.app || '-' }} | 재생: {{ theater.streaming.state.content || '-' }}
            </template>
            <template v-else>
              밝기: {{ theater.lights.state.brightness }}% | {{ theater.lights.state.color }}
            </template>
          </div>
        </div>

        <div style="margin-top: 0.5rem; padding: 0.5rem; background: #fffbeb; border-radius: 4px; font-size: 0.8rem; color: #744210;">
          클라이언트는 이 4개의 서브시스템을 직접 다루지 않아도 됩니다.
          퍼사드 메서드 하나로 모든 설정이 완료됩니다.
        </div>
      </div>
    </div>
  </div>
</template>
