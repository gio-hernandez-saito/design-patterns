import { describe, it, expect, beforeEach } from "vitest";
import { File, Folder, type FileSystemItem } from "./composite.js";

// =============================================================================
// 컴포지트 패턴 테스트
// 핵심 검증 사항:
// 1. 파일과 폴더를 동일한 인터페이스로 다룰 수 있는지
// 2. 재귀 순회가 올바르게 동작하는지
// 3. 전체 크기 계산 (Leaf들의 합산)이 정확한지
// =============================================================================

describe("Leaf: File", () => {
  it("파일 이름과 크기를 올바르게 반환한다", () => {
    const file = new File("README.md", 1024);

    expect(file.getName()).toBe("README.md");
    expect(file.getSize()).toBe(1024);
    expect(file.getType()).toBe("file");
  });

  it("display()가 파일 아이콘과 이름을 포함한 문자열을 반환한다", () => {
    const file = new File("index.ts", 512);
    const display = file.display();

    expect(display).toContain("📄");
    expect(display).toContain("index.ts");
  });

  it("display()에 들여쓰기 depth가 적용된다", () => {
    const file = new File("test.ts", 100);

    const depth0 = file.display(0);
    const depth2 = file.display(2);

    // depth 2는 depth 0보다 앞에 공백이 더 많다
    expect(depth2.length).toBeGreaterThan(depth0.length);
    expect(depth2.startsWith("    ")).toBe(true);  // 2×2 = 4 공백
  });
});

describe("Composite: Folder", () => {
  let folder: Folder;

  beforeEach(() => {
    folder = new Folder("src");
  });

  it("빈 폴더의 크기는 0이다", () => {
    expect(folder.getSize()).toBe(0);
    expect(folder.getChildCount()).toBe(0);
  });

  it("폴더 타입은 'folder'이다", () => {
    expect(folder.getType()).toBe("folder");
  });

  it("파일을 추가하면 크기가 누적된다", () => {
    folder.add(new File("a.ts", 1000));
    folder.add(new File("b.ts", 2000));

    expect(folder.getSize()).toBe(3000);
    expect(folder.getChildCount()).toBe(2);
  });

  it("add()가 this를 반환하여 메서드 체이닝을 지원한다", () => {
    const result = folder
      .add(new File("a.ts", 100))
      .add(new File("b.ts", 200));

    expect(result).toBe(folder);
    expect(folder.getChildCount()).toBe(2);
  });

  it("자식 항목을 제거할 수 있다", () => {
    const file = new File("temp.ts", 500);
    folder.add(file);
    expect(folder.getChildCount()).toBe(1);

    const removed = folder.remove(file);
    expect(removed).toBe(true);
    expect(folder.getChildCount()).toBe(0);
    expect(folder.getSize()).toBe(0);
  });

  it("존재하지 않는 항목 제거 시 false를 반환한다", () => {
    const file = new File("ghost.ts", 0);
    const result = folder.remove(file);
    expect(result).toBe(false);
  });

  it("getChildren()은 자식 배열의 복사본을 반환한다", () => {
    folder.add(new File("a.ts", 100));
    const children = folder.getChildren();

    // 복사본이므로 수정해도 원본에 영향 없다
    children.pop();
    expect(folder.getChildCount()).toBe(1);
  });

  it("display()가 폴더 아이콘을 포함한다", () => {
    const display = folder.display();
    expect(display).toContain("📁");
    expect(display).toContain("src/");
  });
});

describe("재귀 구조: 중첩된 폴더 트리", () => {
  let root: Folder;

  beforeEach(() => {
    // 다음 구조를 만든다:
    // root/ (3KB)
    // ├── 📄 package.json (1KB)
    // └── src/ (2KB)
    //     ├── 📄 index.ts (1KB)
    //     └── 📄 utils.ts (1KB)
    root = new Folder("root");
    const src = new Folder("src");

    src.add(new File("index.ts", 1024));
    src.add(new File("utils.ts", 1024));

    root.add(new File("package.json", 1024));
    root.add(src);
  });

  it("루트 폴더의 크기는 모든 하위 파일 크기의 합이다", () => {
    // package.json(1KB) + index.ts(1KB) + utils.ts(1KB) = 3KB
    expect(root.getSize()).toBe(3072);
  });

  it("중간 폴더의 크기는 그 안의 파일 크기만 합산한다", () => {
    const src = root.getChildren()[1] as Folder;
    // index.ts(1KB) + utils.ts(1KB) = 2KB
    expect(src.getSize()).toBe(2048);
  });

  it("display()가 트리 구조를 들여쓰기로 표현한다", () => {
    const display = root.display();

    // 루트는 들여쓰기 없음
    expect(display).toContain("📁 root/");
    // 자식들은 들여쓰기 있음
    expect(display).toContain("  📄 package.json");
    expect(display).toContain("  📁 src/");
    // 손자들은 들여쓰기 2단계
    expect(display).toContain("    📄 index.ts");
  });

  it("find()로 이름으로 항목을 재귀 검색한다", () => {
    const found = root.find("utils.ts");

    expect(found).not.toBeNull();
    expect(found!.getName()).toBe("utils.ts");
  });

  it("존재하지 않는 항목 검색 시 null을 반환한다", () => {
    const found = root.find("nonexistent.ts");
    expect(found).toBeNull();
  });

  it("countFiles()로 재귀적으로 모든 파일 수를 센다", () => {
    // root: package.json + src/(index.ts + utils.ts) = 총 3개
    expect(root.countFiles()).toBe(3);
  });
});

describe("깊은 중첩 구조 테스트", () => {
  it("4단계 이상 중첩도 올바르게 크기를 계산한다", () => {
    // deep/a/b/c/file.txt 구조
    const deep = new Folder("deep");
    const a = new Folder("a");
    const b = new Folder("b");
    const c = new Folder("c");
    const file = new File("file.txt", 5000);

    c.add(file);
    b.add(c);
    a.add(b);
    deep.add(a);

    expect(deep.getSize()).toBe(5000);
    expect(a.getSize()).toBe(5000);
    expect(b.getSize()).toBe(5000);
    expect(c.getSize()).toBe(5000);
  });
});

describe("클라이언트 코드: File과 Folder를 동일하게 다루기", () => {
  it("FileSystemItem 인터페이스로 File과 Folder를 동일하게 사용할 수 있다", () => {
    // 클라이언트는 File인지 Folder인지 구별하지 않아도 된다.
    const items: FileSystemItem[] = [
      new File("README.md", 1000),
      new Folder("src").add(new File("index.ts", 2000)),
    ];

    const totalSize = items.reduce((sum, item) => sum + item.getSize(), 0);

    expect(totalSize).toBe(3000);
  });

  it("getSize()를 통해 전체 디렉토리 크기를 쉽게 계산할 수 있다", () => {
    const project = new Folder("project");
    const assets = new Folder("assets");
    const images = new Folder("images");

    images.add(new File("logo.png", 50 * 1024));
    images.add(new File("banner.jpg", 200 * 1024));
    assets.add(images);
    assets.add(new File("style.css", 10 * 1024));
    project.add(assets);
    project.add(new File("index.html", 5 * 1024));

    // 재귀 합산: logo.png + banner.jpg + style.css + index.html
    const expected = (50 + 200 + 10 + 5) * 1024;
    expect(project.getSize()).toBe(expected);
  });
});
