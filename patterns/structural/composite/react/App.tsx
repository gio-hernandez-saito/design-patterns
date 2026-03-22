/**
 * Composite 패턴 — React 구현
 *
 * React에서의 역할 매핑:
 * - Component (FileSystemItem 인터페이스) → FileNode 타입 (공통 데이터 구조)
 * - Leaf (File 클래스)                   → FileItem 컴포넌트 (자식 없는 파일)
 * - Composite (Folder 클래스)            → FolderItem 컴포넌트 (자식을 가진 폴더, 재귀 렌더)
 *
 * 왜 재귀 컴포넌트인가?
 * - TS에서 Folder.display()가 자식들의 display()를 재귀 호출했듯이,
 *   React에서는 FolderItem이 자신의 children을 재귀적으로 FileTreeNode로 렌더한다.
 * - 트리 깊이와 관계없이 동일한 컴포넌트가 처리한다 — Composite의 핵심.
 * - 클라이언트(FileExplorer)는 파일인지 폴더인지 구분하지 않고 FileTreeNode를 호출한다.
 */

import { useState } from 'react'

// ─────────────────────────────────────────────
// Component 타입 — Leaf와 Composite 공통 데이터 구조
// ─────────────────────────────────────────────

interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  size?: number           // 파일이면 바이트 크기
  children?: FileNode[]   // 폴더이면 자식 목록
}

// ─────────────────────────────────────────────
// 유틸 함수
// ─────────────────────────────────────────────

/**
 * 노드의 전체 크기를 재귀적으로 계산한다.
 * Composite.getSize()의 React 버전 — 폴더면 자식들의 크기를 합산한다.
 */
function getTotalSize(node: FileNode): number {
  if (node.type === 'file') return node.size ?? 0
  // Composite: 자식들에게 위임해 합산
  return (node.children ?? []).reduce((sum, child) => sum + getTotalSize(child), 0)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// ─────────────────────────────────────────────
// Leaf 컴포넌트 — 자식이 없는 파일
// ─────────────────────────────────────────────

/**
 * FileItem: Leaf 역할 — 파일 노드를 렌더한다.
 * 자식을 렌더하는 로직이 없다. 자신의 데이터만 표시한다.
 */
function FileItem({ node, depth, selected, onSelect }: {
  node: FileNode
  depth: number
  selected: string | null
  onSelect: (id: string) => void
}) {
  const ext = node.name.split('.').pop() ?? ''
  const icon = ext === 'ts' || ext === 'tsx' ? '🔷'
    : ext === 'json' ? '🟡'
    : ext === 'md' ? '📝'
    : ext === 'css' ? '🎨'
    : '📄'

  return (
    <div
      onClick={() => onSelect(node.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        paddingLeft: depth * 20 + 8, paddingTop: 4, paddingBottom: 4,
        cursor: 'pointer',
        background: selected === node.id ? '#e3f2fd' : 'transparent',
        borderRadius: 4,
      }}
    >
      <span>{icon}</span>
      <span style={{ fontSize: 13 }}>{node.name}</span>
      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#999', paddingRight: 8 }}>
        {formatSize(node.size ?? 0)}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────
// Composite 컴포넌트 — 자식을 가진 폴더 (재귀 렌더)
// ─────────────────────────────────────────────

/**
 * FolderItem: Composite 역할 — 폴더 노드를 렌더한다.
 *
 * 핵심: 자식들을 렌더할 때 FileTreeNode를 재귀 호출한다.
 * FileTreeNode가 다시 FileItem이나 FolderItem을 결정한다.
 * 이 재귀 구조 덕분에 트리 깊이에 관계없이 자동으로 처리된다.
 */
function FolderItem({ node, depth, selected, onSelect }: {
  node: FileNode
  depth: number
  selected: string | null
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(depth < 1) // 최상위 폴더는 기본 열림
  const totalSize = getTotalSize(node)

  return (
    <div>
      <div
        onClick={() => { setOpen(o => !o); onSelect(node.id) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          paddingLeft: depth * 20 + 8, paddingTop: 4, paddingBottom: 4,
          cursor: 'pointer',
          background: selected === node.id ? '#e8f5e9' : 'transparent',
          borderRadius: 4,
          fontWeight: 'bold',
        }}
      >
        <span style={{ fontSize: 11, width: 12 }}>{open ? '▼' : '▶'}</span>
        <span>📁</span>
        <span style={{ fontSize: 13 }}>{node.name}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#999', paddingRight: 8 }}>
          {formatSize(totalSize)} | {(node.children ?? []).length}개 항목
        </span>
      </div>

      {/* 열려있을 때만 자식을 재귀적으로 렌더한다 */}
      {open && (
        <div>
          {(node.children ?? []).map(child => (
            /* FileTreeNode 재귀 호출 — Composite.display()의 재귀 호출과 동일 */
            <FileTreeNode key={child.id} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 통합 컴포넌트 — 파일/폴더를 구분해 적절한 컴포넌트로 라우팅
// ─────────────────────────────────────────────

/**
 * FileTreeNode: 클라이언트가 직접 사용하는 컴포넌트.
 * FileItem인지 FolderItem인지 결정한다.
 *
 * TS의 클라이언트 코드가 FileSystemItem 인터페이스만 사용했듯이,
 * 여기서는 FileNode 타입만 알면 되고 내부 타입 분기는 이 함수가 처리한다.
 */
function FileTreeNode({ node, depth = 0, selected, onSelect }: {
  node: FileNode
  depth?: number
  selected: string | null
  onSelect: (id: string) => void
}) {
  // Leaf vs Composite 분기 — 클라이언트는 이 분기를 신경 쓸 필요가 없다
  if (node.type === 'file') {
    return <FileItem node={node} depth={depth} selected={selected} onSelect={onSelect} />
  }
  return <FolderItem node={node} depth={depth} selected={selected} onSelect={onSelect} />
}

// ─────────────────────────────────────────────
// 샘플 파일 트리 데이터
// ─────────────────────────────────────────────

const initialTree: FileNode = {
  id: 'root', name: 'my-project', type: 'folder',
  children: [
    {
      id: 'src', name: 'src', type: 'folder',
      children: [
        {
          id: 'components', name: 'components', type: 'folder',
          children: [
            { id: 'app', name: 'App.tsx', type: 'file', size: 4096 },
            { id: 'header', name: 'Header.tsx', type: 'file', size: 2048 },
            { id: 'footer', name: 'Footer.tsx', type: 'file', size: 1536 },
          ]
        },
        {
          id: 'hooks', name: 'hooks', type: 'folder',
          children: [
            { id: 'useAuth', name: 'useAuth.ts', type: 'file', size: 3072 },
            { id: 'useFetch', name: 'useFetch.ts', type: 'file', size: 2560 },
          ]
        },
        { id: 'index', name: 'index.tsx', type: 'file', size: 512 },
        { id: 'styles', name: 'styles.css', type: 'file', size: 8192 },
      ]
    },
    {
      id: 'public', name: 'public', type: 'folder',
      children: [
        { id: 'favicon', name: 'favicon.ico', type: 'file', size: 1024 },
        { id: 'logo', name: 'logo.png', type: 'file', size: 51200 },
      ]
    },
    { id: 'pkg', name: 'package.json', type: 'file', size: 768 },
    { id: 'readme', name: 'README.md', type: 'file', size: 3584 },
    { id: 'tsconfig', name: 'tsconfig.json', type: 'file', size: 512 },
  ]
}

// ─────────────────────────────────────────────
// 메인 App
// ─────────────────────────────────────────────

export default function App() {
  const [selected, setSelected] = useState<string | null>(null)
  const totalSize = getTotalSize(initialTree)

  // 선택된 노드 찾기 (재귀 탐색 — Folder.find()와 동일)
  function findNode(node: FileNode, id: string): FileNode | null {
    if (node.id === id) return node
    if (node.children) {
      for (const child of node.children) {
        const found = findNode(child, id)
        if (found) return found
      }
    }
    return null
  }

  const selectedNode = selected ? findNode(initialTree, selected) : null

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 750, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Composite 패턴 — React</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        재귀 컴포넌트 트리로 파일 탐색기를 구현합니다.<br />
        FileTreeNode는 파일/폴더를 구분하지 않고 동일하게 처리합니다.
      </p>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* 파일 트리 */}
        <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: 8, padding: 8, background: '#fafafa' }}>
          <div style={{ padding: '4px 8px 8px', fontWeight: 'bold', fontSize: 13, borderBottom: '1px solid #eee', marginBottom: 4 }}>
            파일 탐색기 | 총 {formatSize(totalSize)}
          </div>
          {/* 클라이언트: FileTreeNode만 알면 된다 — 파일/폴더 구분 불필요 */}
          <FileTreeNode node={initialTree} selected={selected} onSelect={setSelected} />
        </div>

        {/* 선택된 노드 정보 */}
        <div style={{ width: 220, border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>속성</div>
          {selectedNode ? (
            <div style={{ fontSize: 13 }}>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: '#888' }}>이름:</span><br />
                <strong>{selectedNode.name}</strong>
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: '#888' }}>타입:</span><br />
                <strong>{selectedNode.type === 'file' ? '📄 파일 (Leaf)' : '📁 폴더 (Composite)'}</strong>
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: '#888' }}>크기:</span><br />
                <strong>{formatSize(getTotalSize(selectedNode))}</strong>
                {selectedNode.type === 'folder' && (
                  <span style={{ fontSize: 11, color: '#888' }}> (하위 합계)</span>
                )}
              </div>
              {selectedNode.type === 'folder' && (
                <div>
                  <span style={{ color: '#888' }}>직속 자식:</span><br />
                  <strong>{(selectedNode.children ?? []).length}개</strong>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#aaa' }}>항목을 선택하세요</div>
          )}
        </div>
      </div>

      <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, fontSize: 13, marginTop: 16 }}>
        <strong>패턴 포인트:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li><code>FileTreeNode</code>가 통합 진입점 — 파일/폴더를 구분해 적절한 컴포넌트로 라우팅</li>
          <li><code>FolderItem</code>이 자식을 렌더할 때 <code>FileTreeNode</code>를 재귀 호출 — Composite.display() 재귀와 동일</li>
          <li><code>getTotalSize()</code>가 재귀적으로 크기를 합산 — 깊이와 관계없이 동작</li>
          <li>클라이언트는 <code>FileNode</code> 타입만 알면 되고, 파일/폴더 여부를 신경 쓰지 않는다</li>
        </ul>
      </div>
    </div>
  )
}
