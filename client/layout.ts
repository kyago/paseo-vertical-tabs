import { enableVerticalDrop } from "./drag.ts";

/** 가로 탭 바를 왼쪽 세로 탭으로 바꾸는 CSS. 앱 DOM(testID → data-testid)에 의존하므로 paseo 업데이트 시 깨질 수 있다. */
const STYLE_ID = "paseo-vertical-tabs";
const KEY = "paseo-vertical-tabs:on:v2";
const WIDTH_KEY = "paseo-vertical-tabs:width";
const COLLAPSED_KEY = "paseo-vertical-tabs:collapsed";
const COLLAPSED_CLASS = "paseo-vertical-tabs-collapsed";
const RAIL_W = 36;
const TOGGLE = 24; // 패널 맨 위 접기/펼치기 버튼(::before) 한 변
const TOGGLE_INSET = 4;
const VAR = "--paseo-vertical-tabs-width";
const MIN_W = 140;
const MAX_W = 600;
export const DEFAULT_W = 220;
const HANDLE = 6;
const HANDLE_ATTR = "data-pvt-handle-hover";
// 오른쪽 파일 탐색기(workspace-explorer-sidebar) 안은 제외: 그쪽 탭(파일/변경 사항)은 가로 유지.
const NOT_EXPLORER = ':not([data-testid="workspace-explorer-sidebar"] *)';
// :has() 안에서 쓰는 탭 행(범위 없음). :has(범위 행)은 "자손 중 범위 요소"라 뜻이 달라진다.
const ROW_ANY = `[data-testid="workspace-tabs-row"]${NOT_EXPLORER}`;
const TAB = '[data-testid^="workspace-tab-"]:not([data-testid^="workspace-tab-switcher"])';
const NEW_TAB = '[data-testid="workspace-new-tab-button"]';
const TOOLS = '[data-testid="workspace-split-pane-menu"], [data-testid="workspace-maximize-pane"], [data-testid="workspace-restore-pane"]';
const TOOL_W = 20; // 툴바 아이콘 버튼 한 변(smallIconButtonChromeFrameSize)

/**
 * 플러그인을 설치한 호스트의 워크스페이스에만 적용한다. 앱은 워크스페이스 화면마다
 * `workspace-deck-entry-<serverId>:<workspaceId>`로 감싸므로(0.15·0.16) 그 접두어로 범위를 건다.
 */
export function hostScope(hosts: Iterable<string>): string {
  const ids = [...hosts].map((id) => `[data-testid^=${JSON.stringify(`workspace-deck-entry-${id}:`)}]`);
  return ids.length ? `:is(${ids.join(", ")})` : "";
}

/** 범위(scope) 안의 셀렉터들. scope가 빈 문자열이면 아무 데도 적용하지 않는다(:not(*)). */
function selectors(scope: string) {
  const root = scope || ":not(*)";
  const PANE = `${root} [data-testid^="workspace-pane-"]${NOT_EXPLORER}`;
  const ROW = `${root} ${ROW_ANY}`;
  const SCROLL = `${ROW} [data-testid="workspace-tabs-scroll"]`;
  return {
    PANE,
    ROW,
    SCROLL,
    // 탭 컬럼(A). 0.15: pane > A, 0.16: pane > W(헤더 + A). 둘 다 지원.
    COLUMN: `:is(${PANE} > div, ${PANE} > div > div):has(> ${ROW_ANY})`,
    WRAP: `${PANE} > div:has(> div > ${ROW_ANY})`,
    // 세션 내용(B): 탭 행이 없는 pane 직계 자식
    CONTENT: `${PANE}:has(${ROW_ANY}) > div:not(:has(${ROW_ANY}))`,
    // 탭 한 칸: slot > (드롭 표시선?, hoverFrame > TAB + 닫기, 드롭 표시선?)
    SLOT: `${SCROLL} div:has(> div > ${TAB})`,
    // 탭이 가로 한 줄에 다 들어가면(requiresHorizontalScrollFallback=false) Paseo는 +를 탭 목록 끝에 두고 툴바(…)에서 뺀다.
    INLINE: `html:not(.${COLLAPSED_CLASS}) ${ROW}:has([data-testid="workspace-tabs-scroll"] ${NEW_TAB}):has(${TOOLS})`,
  };
}

const current = () => selectors(hostScope(g[SHARED]?.hosts?.keys() ?? []));

/*
 DOM(0.12~0.15): pane > [A: div > (bg, drag, ROW)] + [B: 세션 내용]
 DOM(0.16): pane > [W: div > (헤더?, A)] + [B]  — 헤더가 W 안이라 pane을 가로로 못 돌린다.
 → A를 pane 기준 absolute(top은 헤더 아래, CSS 앵커)로 왼쪽에 붙이고 B에 왼쪽 여백을 준다.
 ROW > (measure, scrollContainer > SCROLL > content > tabSlot* + newTab?, toolbar(newTab?, maximize?, splitMenu))
*/
export function css(scope: string): string {
  const { PANE, ROW, COLUMN, WRAP, CONTENT, SCROLL, SLOT, INLINE } = selectors(scope);
  const w = `var(${VAR}, ${DEFAULT_W}px)`;
  return `
/* W는 static으로 둬 A의 기준을 pane으로. A의 top은 W 안 헤더 아래(앵커), 헤더가 없으면 0. */
${PANE} { anchor-scope: --pvt-head; }
${WRAP} { position: static !important; }
${WRAP} > div:not(:has(> ${ROW_ANY})) { anchor-name: --pvt-head; }
${COLUMN} { position: absolute !important; left: 0; bottom: 0; top: anchor(--pvt-head bottom, 0px); width: ${w}; min-width: ${w}; max-width: ${w}; height: auto !important; }
${CONTENT} { margin-left: ${w} !important; }
/* 탭 바 밑의 창 드래그 배경은 없앤다. 컬럼이 drag 영역이면 탭·손잡이·토글이 포인터 이벤트를 못 받는다. */
${COLUMN} > div[style*="app-region: drag"] { display: none !important; }
${COLUMN}::after { content: ""; position: absolute; top: 0; bottom: 0; right: -${HANDLE / 2}px; width: ${HANDLE}px; cursor: col-resize; z-index: 50; app-region: no-drag; -webkit-app-region: no-drag; background: linear-gradient(var(--pvt-handle, transparent), var(--pvt-handle, transparent)) center / 2px 100% no-repeat; }
/* 손잡이 위·크기 조절 중(속성은 끝날 때까지 유지): 경계선을 강조색으로(더블클릭하면 기본 너비) */
${COLUMN}[${HANDLE_ATTR}] { --pvt-handle: var(--colors-accent, #3b82f6); }
${ROW} {
  position: relative;
  flex-direction: column !important; align-items: stretch !important; flex: 1 1 auto !important;
  height: 100% !important; min-height: 0 !important;
  border-bottom-width: 0 !important; border-right-width: 1px !important; border-right-style: solid !important;
}
${ROW} > div { width: 100% !important; min-width: 0 !important; flex-direction: column !important; align-items: stretch !important; }
/* 탭 목록은 내용 높이만큼만 차지해서, 그 바로 아래에 하단 액션(새 탭)이 붙게 한다. 넘치면 목록만 스크롤. */
${ROW} > div:has(> [data-testid="workspace-tabs-scroll"]) { flex: 0 1 auto !important; min-height: 0 !important; }
${SCROLL} { flex-direction: column !important; overflow-x: hidden !important; overflow-y: auto !important; width: 100% !important; flex: 0 1 auto !important; }
${SCROLL} > div { flex-direction: column !important; align-items: stretch !important; width: 100% !important; max-width: none !important; padding: 4px !important; gap: 2px; /* 아래 4px: 마지막 탭 아래 드롭 표시선이 스크롤 영역에 잘리지 않게 */ }
${SCROLL} > div > div, ${SCROLL} > div > div > div, ${SCROLL} > div > div > div > div { width: 100% !important; max-width: none !important; min-width: 0 !important; margin-left: 0 !important; margin-right: 0 !important; }
${ROW} ${TAB} { width: 100% !important; min-width: 0 !important; max-width: none !important; justify-content: flex-start !important; }
${ROW} [data-testid^="workspace-tabs-scroll-shade"] { display: none !important; }
/* 하단 액션: 새 탭 버튼은 꽉 찬 너비(+ 아이콘만), 분할 메뉴(…)는 오른쪽에 작게 */
${ROW} > div:last-child { flex-direction: row !important; align-items: center !important; padding: 2px 4px 4px !important; margin: 0 !important; gap: 2px; }
${ROW} [data-testid="workspace-new-tab-button"] { flex: 1 1 0% !important; width: auto !important; height: 28px !important; flex-direction: row !important; justify-content: center !important; gap: 6px; border-radius: 6px; border: 1px dashed var(--colors-border, currentColor); }
${ROW} [data-testid="workspace-new-tab-button"]:hover { background: var(--colors-surface1, rgba(127,127,127,.15)); }
/* +가 탭 목록 끝에 있을 때: 툴바를 + 오른쪽에 앵커로 붙여 탭이 많을 때와 같은 한 줄 모양으로 맞춘다. */
${INLINE} { anchor-scope: --pvt-new-tab; --pvt-tools-w: ${TOOL_W}px; }
${INLINE}:has([data-testid="workspace-split-pane-menu"]):has([data-testid="workspace-maximize-pane"], [data-testid="workspace-restore-pane"]) { --pvt-tools-w: ${TOOL_W * 2 + 2}px; }
${INLINE} [data-testid="workspace-tabs-scroll"] ${NEW_TAB} { anchor-name: --pvt-new-tab; margin-right: calc(var(--pvt-tools-w) + 2px) !important; }
${INLINE} > div:last-child:not(:has(> [data-testid="workspace-tabs-scroll"])) { position: absolute !important; position-anchor: --pvt-new-tab; top: anchor(top); height: anchor-size(height); left: calc(anchor(right) + 2px); width: auto !important; padding: 0 !important; }
/* 드래그 드롭 표시선: Paseo는 탭 좌우의 세로 막대로 그린다 → 탭 위/아래 가로선으로. 위치 판정은 drag.ts. */
${SLOT} > div:empty:first-child, ${SLOT} > div:empty:last-child { left: 6px !important; right: 6px !important; width: auto !important; height: 3px !important; }
${SLOT} > div:empty:first-child { top: -2.5px !important; bottom: auto !important; }
${SLOT} > div:empty:last-child { top: auto !important; bottom: -2.5px !important; }
/* 맨 위 접기/펼치기 버튼. 가짜 요소라 클릭은 enablePointer가 좌표로 판정한다. */
${ROW}::before { content: "‹"; position: absolute; top: ${TOGGLE_INSET}px; right: ${TOGGLE_INSET}px; width: ${TOGGLE}px; height: ${TOGGLE}px; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 18px; line-height: 1; color: var(--colors-foreground-muted, currentColor); cursor: pointer; z-index: 50; }
${ROW}:hover::before { background: var(--colors-surface1, rgba(127,127,127,.15)); }
${ROW} > div:has(> [data-testid="workspace-tabs-scroll"]) { margin-top: ${TOGGLE + TOGGLE_INSET * 2}px !important; }
/* 접힘: 36px 레일. 아이콘(상태 점)만 남기고 라벨·닫기 버튼·너비 손잡이는 숨긴다. */
html.${COLLAPSED_CLASS} ${COLUMN} { width: ${RAIL_W}px !important; min-width: ${RAIL_W}px !important; max-width: ${RAIL_W}px !important; }
html.${COLLAPSED_CLASS} ${COLUMN}::after { display: none; }
html.${COLLAPSED_CLASS} ${CONTENT} { margin-left: ${RAIL_W}px !important; }
html.${COLLAPSED_CLASS} ${ROW}::before { content: "›"; }
html.${COLLAPSED_CLASS} ${ROW} ${TAB} { padding: 0 !important; justify-content: center !important; }
html.${COLLAPSED_CLASS} ${ROW} ${TAB} div[dir="auto"] { display: none !important; }
/* 버튼 안의 tabHandle(flex:1, 왼쪽 정렬)이 폭을 다 차지하므로 그 안에서 아이콘을 가운데로 */
html.${COLLAPSED_CLASS} ${ROW} ${TAB} > div { flex: none !important; width: 100% !important; justify-content: center !important; gap: 0 !important; }
html.${COLLAPSED_CLASS} ${ROW} ${TAB} + div { display: none !important; }
html.${COLLAPSED_CLASS} ${ROW} > div:last-child { flex-direction: column !important; }
html.${COLLAPSED_CLASS} ${ROW} [data-testid="workspace-new-tab-button"] { width: 100% !important; flex: none !important; }
body.paseo-vertical-tabs-resizing, body.paseo-vertical-tabs-resizing * { cursor: col-resize !important; user-select: none !important; }
`;
}


function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

// 연결된 호스트마다 이 플러그인 인스턴스가 하나씩 같은 window에서 돈다. 스타일·포인터 핸들러·on 상태는 window에 하나뿐이라
// 인스턴스끼리 공유하고 마지막 인스턴스가 나갈 때만 걷는다. (예전엔 한 호스트가 끊기면 그 인스턴스 cleanup이 스타일을 지워 전부 가로로 돌아갔다)
const SHARED = "__paseoVerticalTabs";
type Shared = {
  on: boolean;
  listeners: Set<(on: boolean) => void>;
  disablePointer: () => void;
  // 아래는 예전 버전 번들이 만든 객체엔 없을 수 있다.
  /** 이 window에 플러그인이 로드된 호스트(serverId)와 등록 수. 이 호스트들의 워크스페이스에만 적용한다. */
  hosts?: Map<string, number>;
  disableDrag?: () => void;
  stopWatch?: () => void;
  onUnsupported?: () => void;
};
const g = globalThis as { [SHARED]?: Shared };

/** 인스턴스 등록. onChange는 전환 때 모든 인스턴스에 불린다(헤더 버튼 갱신). 반환값은 해제 함수. */
export function acquire(onChange: (on: boolean) => void, onUnsupported: () => void): {
  release: () => void;
  /** 이 인스턴스의 호스트 serverId를 알게 되면 등록한다. 등록 전엔 아무 데도 적용되지 않는다. */
  setHost: (serverId: string) => void;
} {
  let s = g[SHARED];
  if (!s) {
    s = g[SHARED] = { on: isOn(), listeners: new Set(), disablePointer: () => {} } as Shared;
    s.disablePointer = enablePointer(() => setCollapsed(!isCollapsed()));
  }
  // 호스트마다 플러그인 버전이 다를 수 있다(예: 한쪽만 업데이트). 예전 번들이 만든 공유 객체엔 아래 필드가 없으므로 채운다.
  // 키 이름은 바꾸지 않는다: 공유 객체가 둘이면 접기 핸들러도 둘이라 한 번 클릭에 두 번 토글된다.
  s.onUnsupported ??= onUnsupported;
  s.hosts ??= new Map();
  s.disableDrag ??= enableVerticalDrop(() => !!globalThis.document?.getElementById(STYLE_ID), TAB, () => current().ROW);
  if (!s.stopWatch) s.stopWatch = s.on ? watchSupport(s) : () => {};
  const shared = s;
  shared.listeners.add(onChange);
  apply(shared.on); // 나중에 로드된 번들의 CSS로 갈아끼운다
  const hosts = (shared.hosts ??= new Map());
  let host: string | null = null;
  return {
    setHost(serverId) {
      if (host !== null || !shared.listeners.has(onChange)) return;
      host = serverId;
      hosts.set(serverId, (hosts.get(serverId) ?? 0) + 1);
      apply(shared.on);
    },
    release() {
      if (host !== null) {
        const left = (hosts.get(host) ?? 1) - 1;
        if (left > 0) hosts.set(host, left);
        else hosts.delete(host);
        host = null;
      }
      if (!shared.listeners.delete(onChange)) return;
      if (shared.listeners.size) {
        apply(shared.on); // 이 호스트만 범위에서 뺀다
        return;
      }
      shared.disablePointer();
      shared.disableDrag?.();
      shared.stopWatch?.();
      apply(false);
      delete g[SHARED];
    },
  };
}

export function toggle(): void {
  const s = g[SHARED];
  if (!s) return;
  s.on = !s.on;
  setOn(s.on);
  apply(s.on);
  s.stopWatch?.();
  s.stopWatch = s.on ? watchSupport(s) : () => {};
  for (const l of s.listeners) l(s.on);
}

/**
 * 세로 배치가 실제로 걸렸는지: 세션 내용이 탭 컬럼 오른쪽에 있어야 한다.
 * Paseo 업데이트로 DOM이 바뀌면 탭이 내용 위에 쌓이는데(0.16 때 실제 발생), 그걸 잡는다. null = 아직 판단 불가(탭 행이 안 보임).
 */
export function layoutWorks(): boolean | null {
  const doc = globalThis.document;
  if (!doc?.getElementById(STYLE_ID)) return null;
  const row = [...doc.querySelectorAll(current().ROW)].find((e) => e.getBoundingClientRect().width > 0);
  const pane = row?.closest('[data-testid^="workspace-pane-"]');
  if (!row || !pane) return null;
  const content = pane.querySelector(':scope > div:not(:has([data-testid="workspace-tabs-row"]))');
  return !!content && content.getBoundingClientRect().left >= row.getBoundingClientRect().right - 2;
}

/** 켜진 뒤 탭 행이 보이면 한 번 판정하고, 안 맞으면 이번 실행 동안만 가로로 되돌린다(저장값은 그대로라 Paseo·플러그인이 고쳐지면 다시 켜짐). */
function watchSupport(s: Shared): () => void {
  let tries = 0;
  const timer = setInterval(() => {
    const ok = layoutWorks();
    if (ok === null && ++tries < 100) return;
    clearInterval(timer);
    if (ok !== false) return;
    s.on = false;
    apply(false);
    for (const l of s.listeners) l(false);
    s.onUnsupported?.();
  }, 3000);
  return () => clearInterval(timer);
}

export function isOn(): boolean {
  return g[SHARED]?.on ?? read(KEY) !== "0";
}

export function setOn(on: boolean): void {
  write(KEY, on ? "1" : "0");
}

export function isCollapsed(): boolean {
  return read(COLLAPSED_KEY) === "1";
}

export function setCollapsed(collapsed: boolean): void {
  write(COLLAPSED_KEY, collapsed ? "1" : "0");
  globalThis.document?.documentElement.classList.toggle(COLLAPSED_CLASS, collapsed);
}

function clampWidth(w: number): number {
  return Math.min(MAX_W, Math.max(MIN_W, Math.round(w)));
}

export function getWidth(): number {
  return clampWidth(Number(read(WIDTH_KEY)) || DEFAULT_W);
}

export function setWidth(w: number, persist: boolean): void {
  const px = clampWidth(w);
  globalThis.document?.documentElement.style.setProperty(VAR, `${px}px`);
  if (persist) write(WIDTH_KEY, String(px));
}

/** 스타일만 넣고 뺀다. 저장은 setOn. */
export function apply(on: boolean): void {
  const doc = globalThis.document;
  if (!doc) return;
  doc.getElementById(STYLE_ID)?.remove();
  if (!on) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  const scope = hostScope(g[SHARED]?.hosts?.keys() ?? []);
  if (!scope) return; // 아직 이 window의 어느 호스트도 등록 전
  style.textContent = css(scope);
  doc.head.appendChild(style);
  setWidth(Number(read(WIDTH_KEY)) || DEFAULT_W, false);
  doc.documentElement.classList.toggle(COLLAPSED_CLASS, isCollapsed());
}

/** 가짜 요소(::before/::after) 클릭 판정: 컬럼 경계 손잡이로 너비 조절, 탭 행 맨 위 버튼으로 접기/펼치기. 반환값은 해제 함수. */
export function enablePointer(onToggleCollapse: () => void): () => void {
  const doc = globalThis.document;
  if (!doc) return () => {};
  let column: HTMLElement | null = null;
  let hovered: HTMLElement | null = null;
  const setHovered = (el: HTMLElement | null) => {
    if (el === hovered) return;
    hovered?.removeAttribute(HANDLE_ATTR);
    hovered = el;
    el?.setAttribute(HANDLE_ATTR, "");
  };
  /** 포인터가 탭 컬럼 오른쪽 경계(::after 손잡이) 위에 있으면 그 컬럼. */
  const handleAt = (e: PointerEvent | MouseEvent): HTMLElement | null => {
    const target = e.target instanceof HTMLElement ? e.target : null;
    if (!target || !doc.getElementById(STYLE_ID) || isCollapsed() || !target.matches(current().COLUMN)) return null;
    return Math.abs(e.clientX - target.getBoundingClientRect().right) <= HANDLE ? target : null;
  };
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || !doc.getElementById(STYLE_ID)) return;
    const target = e.target instanceof HTMLElement ? e.target : null;
    if (!target) return;
    const { ROW, COLUMN } = current();
    if (target.matches(ROW)) {
      const r = target.getBoundingClientRect();
      const inX = e.clientX >= r.right - TOGGLE_INSET - TOGGLE && e.clientX <= r.right - TOGGLE_INSET;
      const inY = e.clientY >= r.top + TOGGLE_INSET && e.clientY <= r.top + TOGGLE_INSET + TOGGLE;
      if (inX && inY) {
        e.preventDefault();
        e.stopPropagation();
        onToggleCollapse();
      }
      return;
    }
    if (!target.matches(COLUMN) || !handleAt(e)) return; // ::after 손잡이 영역만
    column = target;
    doc.body.classList.add("paseo-vertical-tabs-resizing");
    e.preventDefault();
  };
  const onMove = (e: PointerEvent) => {
    if (!column) {
      setHovered(handleAt(e)); // 손잡이 위에 오면 경계선 강조
      return;
    }
    setWidth(e.clientX - column.getBoundingClientRect().left, false);
  };
  const onUp = () => {
    if (!column) return;
    const w = parseFloat(doc.documentElement.style.getPropertyValue(VAR)) || DEFAULT_W;
    setWidth(w, true);
    column = null;
    doc.body.classList.remove("paseo-vertical-tabs-resizing");
  };
  // 손잡이 더블클릭: 기본 너비로
  const onDblClick = (e: MouseEvent) => {
    if (!handleAt(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setWidth(DEFAULT_W, true);
  };
  doc.addEventListener("pointerdown", onDown, true);
  doc.addEventListener("pointermove", onMove, true);
  doc.addEventListener("pointerup", onUp, true);
  doc.addEventListener("pointercancel", onUp, true);
  doc.addEventListener("dblclick", onDblClick, true);
  return () => {
    doc.removeEventListener("dblclick", onDblClick, true);
    setHovered(null);
    doc.removeEventListener("pointerdown", onDown, true);
    doc.removeEventListener("pointermove", onMove, true);
    doc.removeEventListener("pointerup", onUp, true);
    doc.removeEventListener("pointercancel", onUp, true);
    doc.body.classList.remove("paseo-vertical-tabs-resizing");
  };
}

/** 탭 행 주변 마크업(svg 내부 제거) + 주요 노드의 계산된 레이아웃. 셀렉터 점검용. */
export function snapshot(): string | null {
  const doc = globalThis.document;
  // 여러 워크스페이스가 마운트돼 있을 수 있으니 화면에 보이는 탭 행을 고른다.
  const row = [...(doc?.querySelectorAll(current().ROW) ?? [])].find((e) => e.getBoundingClientRect().width > 0);
  const root = row?.closest('[data-testid^="workspace-pane-"]') ?? row?.parentElement;
  if (!doc || !row || !root) return null;
  const computed = (label: string, el: Element | null | undefined) => {
    if (!el) return `${label}: (none)`;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return `${label}: dir=${s.flexDirection} flex=${s.flex} w=${Math.round(r.width)} h=${Math.round(r.height)} ov=${s.overflowX}/${s.overflowY}`;
  };
  const scroll = row.querySelector('[data-testid="workspace-tabs-scroll"]');
  const panes = [...doc.querySelectorAll('[data-testid^="workspace-pane-"]')].map((p) => {
    const r = p.getBoundingClientRect();
    const rows = p.querySelectorAll(ROW_ANY).length;
    const inExplorer = !!p.closest('[data-testid="workspace-explorer-sidebar"]');
    return `  ${p.getAttribute("data-testid")} w=${Math.round(r.width)} rows=${rows} inExplorer=${inExplorer} dir=${getComputedStyle(p).flexDirection}`;
  });
  const summary = [
    computed("pane", root),
    computed("A", row.parentElement),
    computed("B", root.querySelector(":scope > div:not(:has([data-testid=\"workspace-tabs-row\"]))")),
    computed("row", row),
    computed("scrollContainer", scroll?.parentElement),
    computed("scroll", scroll),
    computed("content", scroll?.firstElementChild),
    computed("tab", row.querySelector(TAB)),
    `A.matches(COLUMN)=${row.parentElement?.matches(current().COLUMN)} dragBgH=${Math.round(row.parentElement?.firstElementChild?.getBoundingClientRect().height ?? -1)} var=${getComputedStyle(doc.documentElement).getPropertyValue(VAR)} border=${getComputedStyle(doc.documentElement).getPropertyValue("--colors-border")} muted=${getComputedStyle(doc.documentElement).getPropertyValue("--colors-foreground-muted")}`,
    computed("bottomActions", row.lastElementChild),
    computed("newTab", row.querySelector('[data-testid="workspace-new-tab-button"]')),
    `newTabParentIsBottom=${row.querySelector('[data-testid="workspace-new-tab-button"]')?.parentElement === row.lastElementChild}`,
    "panes:",
    ...panes,
  ].join("\n");
  return `<!--\n${summary}\n-->\n` + root.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, "<svg/>").replace(/<path[^>]*>/g, "");
}
