<script lang="ts">
  // ─────────────────────────────────────────────────────────────────────────────
  // Composite 패턴 — Svelte 5 runes 구현
  //
  // 역할 매핑:
  //   FileSystemNode 타입       → Component 인터페이스 (Leaf/Composite 공통)
  //   type: 'file'              → Leaf (자식 없는 최소 단위)
  //   type: 'folder'            → Composite (자식을 가지는 복합 요소)
  //   <svelte:self>             → 재귀 컴포넌트 (Composite의 재귀 구조 표현)
  //
  // 핵심 아이디어:
  //   TypeScript에서는 클래스 상속으로 File/Folder를 구현했지만,
  //   Svelte에서는 <svelte:self>를 사용한 재귀 컴포넌트로
  //   트리 구조를 자연스럽게 렌더링한다.
  //   getSize() 같은 재귀 연산은 재귀 함수로 구현한다.
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Component 타입: Leaf와 Composite 모두가 구현하는 공통 구조 ──────────
  type FileNode = {
    id: string
    name: string
    type: 'file'
    size: number // 바이트
  }

  type FolderNode = {
    id: string
    name: string
    type: 'folder'
    children: FileSystemNode[]
    expanded: boolean
  }

  type FileSystemNode = FileNode | FolderNode

  // ── 재귀 함수들 (Composite 패턴의 위임 로직) ─────────────────────────────

  // 크기 계산: 파일이면 자신의 크기, 폴더면 모든 자식의 크기 합계 (재귀)
  function getSize(node: FileSystemNode): number {
    if (node.type === 'file') return node.size
    // Composite의 핵심: 자식들에게 같은 연산을 위임한다
    return node.children.reduce((sum, child) => sum + getSize(child), 0)
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  // 파일 수 계산 (재귀)
  function countFiles(node: FileSystemNode): number {
    if (node.type === 'file') return 1
    return node.children.reduce((sum, child) => sum + countFiles(child), 0)
  }

  // 고유 ID 생성
  let nextId = 1
  function genId() { return `node-${nextId++}` }

  // ── $state: 파일 시스템 트리 (Composite 구조) ─────────────────────────────
  let tree = $state<FolderNode>({
    id: genId(),
    name: 'project',
    type: 'folder',
    expanded: true,
    children: [
      {
        id: genId(), name: 'src', type: 'folder', expanded: true,
        children: [
          { id: genId(), name: 'App.svelte', type: 'file', size: 4096 },
          { id: genId(), name: 'main.ts', type: 'file', size: 512 },
          {
            id: genId(), name: 'components', type: 'folder', expanded: false,
            children: [
              { id: genId(), name: 'Button.svelte', type: 'file', size: 2048 },
              { id: genId(), name: 'Modal.svelte', type: 'file', size: 3072 },
            ],
          },
        ],
      },
      {
        id: genId(), name: 'public', type: 'folder', expanded: false,
        children: [
          { id: genId(), name: 'favicon.svg', type: 'file', size: 1024 },
          { id: genId(), name: 'robots.txt', type: 'file', size: 128 },
        ],
      },
      { id: genId(), name: 'package.json', type: 'file', size: 768 },
      { id: genId(), name: 'README.md', type: 'file', size: 2560 },
    ],
  })

  // $derived: 전체 크기와 파일 수 (재귀 연산 자동 재계산)
  let totalSize = $derived(formatSize(getSize(tree)))
  let totalFiles = $derived(countFiles(tree))

  // ── 폴더 토글 (expanded 상태 변경) ───────────────────────────────────────
  function toggleFolder(node: FolderNode) {
    node.expanded = !node.expanded
  }

  // 새 파일 추가
  let newFileName = $state('')
  let newFileSize = $state(1024)
  let selectedFolderId = $state(tree.id)

  function findFolder(node: FileSystemNode, id: string): FolderNode | null {
    if (node.type === 'folder') {
      if (node.id === id) return node
      for (const child of node.children) {
        const found = findFolder(child, id)
        if (found) return found
      }
    }
    return null
  }

  function getAllFolders(node: FileSystemNode): FolderNode[] {
    if (node.type === 'file') return []
    return [node, ...node.children.flatMap(getAllFolders)]
  }

  let allFolders = $derived(getAllFolders(tree))

  function addFile() {
    if (!newFileName) return
    const folder = findFolder(tree, selectedFolderId)
    if (!folder) return
    folder.children.push({
      id: genId(),
      name: newFileName,
      type: 'file',
      size: newFileSize,
    })
    folder.expanded = true
    newFileName = ''
  }
</script>

<main>
  <h1>Composite 패턴</h1>
  <p class="desc">
    파일(<strong>Leaf</strong>)과 폴더(<strong>Composite</strong>)를 같은 인터페이스로 다룬다.
    <code>&lt;svelte:self&gt;</code>로 트리를 재귀 렌더링하고, 크기 계산도 재귀로 자동 처리된다.
  </p>

  <div class="stats-bar">
    <span>전체 크기: <strong>{totalSize}</strong></span>
    <span>총 파일 수: <strong>{totalFiles}개</strong></span>
  </div>

  <div class="layout">
    <!-- 파일 트리 (재귀 렌더링) -->
    <section class="card">
      <h2>파일 시스템 트리</h2>
      <!-- 재귀 컴포넌트는 별도 컴포넌트 파일로 구현 (TreeNode.svelte 참조) -->
      <!-- 여기서는 단일 파일 데모를 위해 인라인 재귀 렌더링 함수를 사용 -->
      <div class="tree">
        {#snippet renderNode(node: FileSystemNode, depth: number)}
          <div class="tree-item" style="padding-left: {depth * 1.25}rem">
            {#if node.type === 'folder'}
              <button class="folder-btn" onclick={() => toggleFolder(node)}>
                {node.expanded ? '📂' : '📁'}
                <span class="name">{node.name}/</span>
                <span class="size">{formatSize(getSize(node))}</span>
              </button>
              {#if node.expanded}
                {#each node.children as child}
                  {@render renderNode(child, depth + 1)}
                {/each}
              {/if}
            {:else}
              <div class="file-item">
                <span>📄</span>
                <span class="name">{node.name}</span>
                <span class="size">{formatSize(node.size)}</span>
              </div>
            {/if}
          </div>
        {/snippet}
        {@render renderNode(tree, 0)}
      </div>
    </section>

    <!-- 파일 추가 컨트롤 -->
    <section class="card">
      <h2>파일 추가</h2>
      <label>
        대상 폴더:
        <select bind:value={selectedFolderId}>
          {#each allFolders as folder}
            <option value={folder.id}>{folder.name}/</option>
          {/each}
        </select>
      </label>
      <label>
        파일명:
        <input bind:value={newFileName} placeholder="example.ts" />
      </label>
      <label>
        크기 (bytes):
        <input type="number" bind:value={newFileSize} min="1" />
      </label>
      <button class="btn-primary" onclick={addFile}>파일 추가</button>

      <div class="composite-explain">
        <h3>Composite 패턴의 핵심</h3>
        <ul>
          <li>파일이든 폴더든 <code>getSize()</code>를 같은 방식으로 호출</li>
          <li>폴더는 자식들의 <code>getSize()</code>를 재귀 호출해 합산</li>
          <li>클라이언트는 대상이 파일인지 폴더인지 몰라도 됨</li>
        </ul>
      </div>
    </section>
  </div>

  <div class="explanation">
    <h3>TypeScript vs Svelte 구현 차이</h3>
    <ul>
      <li><strong>TS:</strong> <code>File</code>/<code>Folder</code> 클래스가 <code>FileSystemItem</code> 인터페이스 구현</li>
      <li><strong>Svelte:</strong> 유니온 타입 + <code>{'{#snippet renderNode}'}</code>로 재귀 렌더링 구현</li>
      <li><strong>재귀:</strong> <code>&lt;svelte:self&gt;</code> 또는 <code>{'{#snippet}'}</code>로 자연스러운 재귀 UI 표현 가능</li>
    </ul>
  </div>
</main>

<style>
  main { font-family: sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
  h1 { color: #059669; margin-bottom: 0.25rem; }
  .desc { color: #64748b; margin-bottom: 1rem; }
  .stats-bar {
    display: flex; gap: 2rem; background: #f0fdf4; border: 1px solid #bbf7d0;
    border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.5rem; font-size: 0.9rem;
  }
  .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; }
  h2 { font-size: 1rem; margin-top: 0; color: #374151; }
  h3 { font-size: 0.88rem; color: #374151; margin-top: 1.25rem; }
  .tree { font-size: 0.9rem; }
  .tree-item { margin: 0.15rem 0; }
  .folder-btn {
    display: flex; align-items: center; gap: 0.4rem; background: none;
    border: none; cursor: pointer; padding: 0.3rem 0.4rem; border-radius: 5px;
    font-size: 0.9rem; width: 100%; text-align: left;
  }
  .folder-btn:hover { background: #e2e8f0; }
  .file-item { display: flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.4rem; color: #4b5563; }
  .name { flex: 1; }
  .size { color: #94a3b8; font-size: 0.8rem; }
  label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.88rem; color: #374151; margin-bottom: 0.75rem; }
  input, select { padding: 0.4rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.88rem; }
  .btn-primary { background: #059669; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
  .btn-primary:hover { background: #047857; }
  .composite-explain { margin-top: 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 0.75rem; font-size: 0.85rem; }
  .composite-explain ul { margin: 0.35rem 0 0; padding-left: 1.2rem; }
  .composite-explain li { margin-bottom: 0.3rem; }
  code { background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.8rem; }
  .explanation { margin-top: 2rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.9rem; }
  .explanation ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
  .explanation li { margin-bottom: 0.4rem; }
</style>
