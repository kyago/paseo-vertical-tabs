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
const DEFAULT_W = 220;
const HANDLE = 6;
// 오른쪽 파일 탐색기(workspace-explorer-sidebar) 안은 제외: 그쪽 탭(파일/변경 사항)은 가로 유지.
const NOT_EXPLORER = ':not([data-testid="workspace-explorer-sidebar"] *)';
const PANE = `[data-testid^="workspace-pane-"]${NOT_EXPLORER}`;
const ROW = `[data-testid="workspace-tabs-row"]${NOT_EXPLORER}`;
const COLUMN = `${PANE} > div:has(> ${ROW})`;
const SCROLL = `${ROW} [data-testid="workspace-tabs-scroll"]`;
const TAB = '[data-testid^="workspace-tab-"]:not([data-testid^="workspace-tab-switcher"])';
const NEW_TAB = '[data-testid="workspace-new-tab-button"]';
const TOOLS = '[data-testid="workspace-split-pane-menu"], [data-testid="workspace-maximize-pane"], [data-testid="workspace-restore-pane"]';
const TOOL_W = 20; // 툴바 아이콘 버튼 한 변(smallIconButtonChromeFrameSize)
// 탭이 가로 한 줄에 다 들어가면(requiresHorizontalScrollFallback=false) Paseo는 +를 탭 목록 끝에 두고 툴바(…)에서 뺀다.
const INLINE = `html:not(.${COLLAPSED_CLASS}) ${ROW}:has([data-testid="workspace-tabs-scroll"] ${NEW_TAB}):has(${TOOLS})`;

/*
 DOM(0.12.0):
 pane > [A: div > (bg, drag, ROW)] + [B: 세션 내용]
 ROW > (measure, scrollContainer > SCROLL > content > tabSlot* + newTab?, toolbar(newTab?, maximize?, splitMenu))
*/
export function css(): string {
  const w = `var(${VAR}, ${DEFAULT_W}px)`;
  return `
${PANE}:has(> div > ${ROW}) { flex-direction: row !important; }
${COLUMN} { position: relative; width: ${w}; min-width: ${w}; max-width: ${w}; flex: none !important; align-self: stretch; height: auto !important; }
/* 탭 바 밑의 창 드래그 배경은 없앤다. 컬럼이 drag 영역이면 탭·손잡이·토글이 포인터 이벤트를 못 받는다. */
${COLUMN} > div[style*="app-region: drag"] { display: none !important; }
${COLUMN}::after { content: ""; position: absolute; top: 0; bottom: 0; right: -${HANDLE / 2}px; width: ${HANDLE}px; cursor: col-resize; z-index: 50; app-region: no-drag; -webkit-app-region: no-drag; }
${COLUMN} ~ div { flex: 1 1 0% !important; min-width: 0 !important; }
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
${SCROLL} > div { flex-direction: column !important; align-items: stretch !important; width: 100% !important; max-width: none !important; padding: 4px 4px 0 !important; gap: 2px; }
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
/* 맨 위 접기/펼치기 버튼. 가짜 요소라 클릭은 enablePointer가 좌표로 판정한다. */
${ROW}::before { content: "‹"; position: absolute; top: ${TOGGLE_INSET}px; right: ${TOGGLE_INSET}px; width: ${TOGGLE}px; height: ${TOGGLE}px; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 18px; line-height: 1; color: var(--colors-foreground-muted, currentColor); cursor: pointer; z-index: 50; }
${ROW}:hover::before { background: var(--colors-surface1, rgba(127,127,127,.15)); }
${ROW} > div:has(> [data-testid="workspace-tabs-scroll"]) { margin-top: ${TOGGLE + TOGGLE_INSET * 2}px !important; }
/* 접힘: 36px 레일. 아이콘(상태 점)만 남기고 라벨·닫기 버튼·너비 손잡이는 숨긴다. */
html.${COLLAPSED_CLASS} ${COLUMN} { width: ${RAIL_W}px !important; min-width: ${RAIL_W}px !important; max-width: ${RAIL_W}px !important; }
html.${COLLAPSED_CLASS} ${COLUMN}::after { display: none; }
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
type Shared = { on: boolean; listeners: Set<(on: boolean) => void>; disablePointer: () => void };
const g = globalThis as { [SHARED]?: Shared };

/** 인스턴스 등록. onChange는 전환 때 모든 인스턴스에 불린다(헤더 버튼 갱신). 반환값은 해제 함수. */
export function acquire(onChange: (on: boolean) => void): () => void {
  let s = g[SHARED];
  if (!s) {
    s = g[SHARED] = { on: isOn(), listeners: new Set(), disablePointer: () => {} };
    s.disablePointer = enablePointer(() => setCollapsed(!isCollapsed()));
  }
  const shared = s;
  shared.listeners.add(onChange);
  apply(shared.on); // 나중에 로드된 번들의 CSS로 갈아끼운다
  return () => {
    if (!shared.listeners.delete(onChange) || shared.listeners.size) return;
    shared.disablePointer();
    apply(false);
    delete g[SHARED];
  };
}

export function toggle(): void {
  const s = g[SHARED];
  if (!s) return;
  s.on = !s.on;
  setOn(s.on);
  apply(s.on);
  for (const l of s.listeners) l(s.on);
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

function setWidth(w: number, persist: boolean): void {
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
  style.textContent = css();
  doc.head.appendChild(style);
  setWidth(Number(read(WIDTH_KEY)) || DEFAULT_W, false);
  doc.documentElement.classList.toggle(COLLAPSED_CLASS, isCollapsed());
}

/** 가짜 요소(::before/::after) 클릭 판정: 컬럼 경계 손잡이로 너비 조절, 탭 행 맨 위 버튼으로 접기/펼치기. 반환값은 해제 함수. */
export function enablePointer(onToggleCollapse: () => void): () => void {
  const doc = globalThis.document;
  if (!doc) return () => {};
  let column: HTMLElement | null = null;
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || !doc.getElementById(STYLE_ID)) return;
    const target = e.target instanceof HTMLElement ? e.target : null;
    if (!target) return;
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
    if (!target.matches(COLUMN) || isCollapsed()) return;
    const right = target.getBoundingClientRect().right;
    if (Math.abs(e.clientX - right) > HANDLE) return; // ::after 손잡이 영역만
    column = target;
    doc.body.classList.add("paseo-vertical-tabs-resizing");
    e.preventDefault();
  };
  const onMove = (e: PointerEvent) => {
    if (!column) return;
    setWidth(e.clientX - column.getBoundingClientRect().left, false);
  };
  const onUp = () => {
    if (!column) return;
    const w = parseFloat(doc.documentElement.style.getPropertyValue(VAR)) || DEFAULT_W;
    setWidth(w, true);
    column = null;
    doc.body.classList.remove("paseo-vertical-tabs-resizing");
  };
  doc.addEventListener("pointerdown", onDown, true);
  doc.addEventListener("pointermove", onMove, true);
  doc.addEventListener("pointerup", onUp, true);
  doc.addEventListener("pointercancel", onUp, true);
  return () => {
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
  const row = [...(doc?.querySelectorAll(ROW) ?? [])].find((e) => e.getBoundingClientRect().width > 0);
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
    const rows = p.querySelectorAll(ROW).length;
    const inExplorer = !!p.closest('[data-testid="workspace-explorer-sidebar"]');
    return `  ${p.getAttribute("data-testid")} w=${Math.round(r.width)} rows=${rows} inExplorer=${inExplorer} dir=${getComputedStyle(p).flexDirection}`;
  });
  const summary = [
    computed("pane", root),
    computed("A", row.parentElement),
    computed("B", row.parentElement?.nextElementSibling),
    computed("row", row),
    computed("scrollContainer", scroll?.parentElement),
    computed("scroll", scroll),
    computed("content", scroll?.firstElementChild),
    computed("tab", row.querySelector(TAB)),
    `A.matches(COLUMN)=${row.parentElement?.matches(COLUMN)} dragBgH=${Math.round(row.parentElement?.firstElementChild?.getBoundingClientRect().height ?? -1)} var=${getComputedStyle(doc.documentElement).getPropertyValue(VAR)} border=${getComputedStyle(doc.documentElement).getPropertyValue("--colors-border")} muted=${getComputedStyle(doc.documentElement).getPropertyValue("--colors-foreground-muted")}`,
    computed("bottomActions", row.lastElementChild),
    computed("newTab", row.querySelector('[data-testid="workspace-new-tab-button"]')),
    `newTabParentIsBottom=${row.querySelector('[data-testid="workspace-new-tab-button"]')?.parentElement === row.lastElementChild}`,
    "panes:",
    ...panes,
  ].join("\n");
  return `<!--\n${summary}\n-->\n` + root.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, "<svg/>").replace(/<path[^>]*>/g, "");
}
