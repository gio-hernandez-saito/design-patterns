<script setup lang="ts">
/**
 * FileTreeNode — 재귀 컴포넌트 (Composite 패턴의 핵심)
 *
 * Vue에서의 역할 매핑:
 *   FileTreeNode (이 컴포넌트) → Composite + Leaf 양쪽 모두 처리
 *   node.type === 'folder'     → Composite: 자식 목록을 재귀 렌더링
 *   node.type === 'file'       → Leaf: 자식 없이 자신의 데이터만 표시
 *
 * 왜 재귀 컴포넌트인가?
 *   Composite 패턴에서 Composite는 Component(자기 자신)를 자식으로 가진다.
 *   Vue에서 이를 자연스럽게 표현하면 "자기 자신을 렌더링하는 재귀 컴포넌트"가 된다.
 *   깊이가 얼마나 깊든 동일한 컴포넌트가 처리하므로 클라이언트 코드는 트리 구조를 몰라도 된다.
 */

import { ref, computed } from 'vue'

export interface FileNode {
  name: string
  type: 'file' | 'folder'
  size?: number          // 파일이면 바이트 단위 크기
  children?: FileNode[]  // 폴더이면 자식 목록
}

const props = defineProps<{ node: FileNode; depth?: number }>()
const depth = props.depth ?? 0

// 폴더 열림/닫힘 상태 (Composite 노드만 사용)
const isOpen = ref(depth < 2) // 2단계까지는 기본으로 열려있음

// 재귀적으로 크기를 계산한다.
// 폴더면 자식들의 getSize()를 합산 — TypeScript 버전의 Folder.getSize()와 동일 로직
const totalSize = computed(() => {
  if (props.node.type === 'file') return props.node.size ?? 0
  return (props.node.children ?? []).reduce((acc, child) => acc + getNodeSize(child), 0)
})

/** 재귀적으로 노드의 크기를 계산하는 헬퍼 */
function getNodeSize(node: FileNode): number {
  if (node.type === 'file') return node.size ?? 0
  return (node.children ?? []).reduce((acc, child) => acc + getNodeSize(child), 0)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function toggle() {
  if (props.node.type === 'folder') isOpen.value = !isOpen.value
}
</script>

<template>
  <div :style="{ paddingLeft: depth > 0 ? '1.25rem' : '0' }">
    <!-- 노드 자체 표시 (Leaf든 Composite든 동일한 방식으로 표시) -->
    <div
      @click="toggle"
      :style="{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '3px 6px',
        borderRadius: '4px',
        cursor: node.type === 'folder' ? 'pointer' : 'default',
        userSelect: 'none',
      }"
      style="transition: background 0.1s;"
      @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = '#f0f4f8'"
      @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'"
    >
      <!-- 폴더 열림/닫힘 화살표 -->
      <span v-if="node.type === 'folder'" style="font-size: 0.7rem; color: #888; width: 1rem;">
        {{ isOpen ? '▼' : '▶' }}
      </span>
      <span v-else style="width: 1rem;" />

      <!-- 아이콘 -->
      <span>{{ node.type === 'folder' ? (isOpen ? '📂' : '📁') : '📄' }}</span>

      <!-- 이름 -->
      <span :style="{ fontWeight: node.type === 'folder' ? 'bold' : 'normal' }">
        {{ node.name }}
      </span>

      <!-- 크기 (폴더면 합산 크기) -->
      <span style="margin-left: auto; font-size: 0.8rem; color: #888;">
        {{ formatSize(totalSize) }}
      </span>
    </div>

    <!-- 자식 렌더링 — 재귀 컴포넌트 호출 (Composite의 핵심) -->
    <!-- 폴더이고 열려있을 때만 자식을 렌더링한다 -->
    <!-- 자식이 File이든 Folder든 동일하게 FileTreeNode를 사용한다 -->
    <template v-if="node.type === 'folder' && isOpen">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.name"
        :node="child"
        :depth="depth + 1"
      />
    </template>
  </div>
</template>
