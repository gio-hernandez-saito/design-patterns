<script setup lang="ts">
/**
 * Composite 패턴 — Vue 구현
 *
 * Vue에서의 역할 매핑:
 *   FileTreeNode (재귀 컴포넌트) → Component + Composite + Leaf 모두 담당
 *   type === 'folder'             → Composite: 자식을 가질 수 있는 복합 요소
 *   type === 'file'               → Leaf: 자식이 없는 최소 단위
 *   App.vue                       → Client: 트리 루트만 렌더링, 내부 구조를 신경 안 씀
 *
 * TypeScript 버전과의 차이:
 *   - TypeScript: File 클래스와 Folder 클래스를 각각 정의
 *   - Vue: 하나의 재귀 컴포넌트(FileTreeNode)가 두 역할을 모두 처리
 *   - 데이터(FileNode 인터페이스)가 구조를 정의하고, 컴포넌트는 재귀적으로 렌더링
 */

import { ref, computed } from 'vue'
import FileTreeNode, { type FileNode } from './FileTreeNode.vue'

// ─── 파일 시스템 트리 데이터 (Composite 구조) ─────────────────────────────────
// Folder(Composite)는 children을 가지고, File(Leaf)는 children이 없다.
// 클라이언트(App.vue)는 루트 노드만 알면 되고 깊이는 신경 쓰지 않는다.
const fileTree = ref<FileNode>({
  name: 'my-project',
  type: 'folder',
  children: [
    {
      name: 'src',
      type: 'folder',
      children: [
        {
          name: 'components',
          type: 'folder',
          children: [
            { name: 'Header.vue', type: 'file', size: 2048 },
            { name: 'Footer.vue', type: 'file', size: 1536 },
            { name: 'Button.vue', type: 'file', size: 4096 },
          ],
        },
        {
          name: 'composables',
          type: 'folder',
          children: [
            { name: 'useAuth.ts', type: 'file', size: 8192 },
            { name: 'useApi.ts', type: 'file', size: 12288 },
          ],
        },
        { name: 'App.vue', type: 'file', size: 5120 },
        { name: 'main.ts', type: 'file', size: 512 },
      ],
    },
    {
      name: 'public',
      type: 'folder',
      children: [
        { name: 'favicon.ico', type: 'file', size: 4096 },
        { name: 'logo.png', type: 'file', size: 1048576 },
      ],
    },
    { name: 'package.json', type: 'file', size: 1024 },
    { name: 'vite.config.ts', type: 'file', size: 768 },
    { name: 'README.md', type: 'file', size: 2048 },
  ],
})

// ─── 전체 통계 계산 (재귀적으로 파일 수와 크기 계산) ──────────────────────────
function countFiles(node: FileNode): number {
  if (node.type === 'file') return 1
  return (node.children ?? []).reduce((acc, child) => acc + countFiles(child), 0)
}

function getTotalSize(node: FileNode): number {
  if (node.type === 'file') return node.size ?? 0
  return (node.children ?? []).reduce((acc, child) => acc + getTotalSize(child), 0)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

const totalFiles = computed(() => countFiles(fileTree.value))
const totalSize = computed(() => formatSize(getTotalSize(fileTree.value)))

// ─── 파일 추가 기능 (Composite에 Leaf 추가) ────────────────────────────────────
const newFileName = ref('')
const newFileSize = ref(1024)

function addFileToRoot() {
  if (!newFileName.value.trim()) return
  if (!fileTree.value.children) fileTree.value.children = []
  fileTree.value.children.push({
    name: newFileName.value.trim(),
    type: 'file',
    size: newFileSize.value,
  })
  newFileName.value = ''
  newFileSize.value = 1024
}
</script>

<template>
  <div style="font-family: sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem;">
    <h1 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">Composite 패턴</h1>
    <p style="color: #555;">
      <code>FileTreeNode</code>는 재귀 컴포넌트다. 노드가 폴더이면 자식에게 자기 자신을 재귀 렌더링하고,
      파일이면 렌더링을 멈춘다. 클라이언트(App.vue)는 트리 깊이를 몰라도 루트 노드만 전달하면 된다.
    </p>

    <!-- 통계 -->
    <div style="display: flex; gap: 1.5rem; margin-bottom: 1.5rem; background: #f5f5f5; padding: 0.75rem 1rem; border-radius: 6px; font-size: 0.9rem;">
      <span>총 파일 수: <strong>{{ totalFiles }}개</strong></span>
      <span>총 크기: <strong>{{ totalSize }}</strong></span>
    </div>

    <!-- 파일 추가 -->
    <div style="border: 1px solid #ddd; border-radius: 6px; padding: 1rem; margin-bottom: 1.5rem; display: flex; gap: 0.5rem; align-items: flex-end; flex-wrap: wrap;">
      <div>
        <label style="font-size: 0.8rem; font-weight: bold; display: block; margin-bottom: 4px;">파일명</label>
        <input v-model="newFileName" placeholder="newfile.ts" style="padding: 6px; border: 1px solid #ccc; border-radius: 4px;" />
      </div>
      <div>
        <label style="font-size: 0.8rem; font-weight: bold; display: block; margin-bottom: 4px;">크기(bytes)</label>
        <input type="number" v-model="newFileSize" style="padding: 6px; border: 1px solid #ccc; border-radius: 4px; width: 100px;" />
      </div>
      <button @click="addFileToRoot" style="padding: 7px 14px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #f0f9ff;">
        루트에 파일 추가
      </button>
      <span style="font-size: 0.8rem; color: #888;">추가하면 총 크기와 파일 수가 즉시 반영됩니다</span>
    </div>

    <!-- 파일 트리 -->
    <!-- Client는 루트 노드만 전달한다. 내부 구조는 FileTreeNode가 재귀적으로 처리한다. -->
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; font-size: 0.9rem;">
      <FileTreeNode :node="fileTree" :depth="0" />
    </div>

    <div style="margin-top: 1rem; padding: 0.75rem; background: #fffbeb; border: 1px solid #f6e05e; border-radius: 6px; font-size: 0.85rem; color: #744210;">
      <strong>패턴 포인트:</strong> 폴더를 클릭해 펼치고 닫을 수 있습니다.
      폴더의 크기는 자식 파일/폴더 크기의 합산입니다 (재귀 계산).
      클라이언트는 트리 깊이나 파일/폴더 구분을 신경 쓰지 않아도 됩니다.
    </div>
  </div>
</template>
