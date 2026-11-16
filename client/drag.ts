/**
 * 세로 탭 드래그 위치 보정.
 * Paseo는 탭을 놓을 자리를 끌고 있는 탭과 대상 탭의 가로 중심(X)만 비교해 정한다(computeTabDropPreview).
 * 세로 탭에선 모든 탭의 X가 같아 위/아래가 사실상 무작위가 된다. 그래서 탭 위에서 끄는 동안 pointermove의
 * clientX를 "포인터가 대상 탭 위쪽 절반이면 중심보다 왼쪽, 아래쪽 절반이면 오른쪽"이 되게 바꿔 다시 보낸다.
 * 탭 밖(창 분할 드롭 등)에서는 원래 이벤트를 그대로 둔다.
 */

/** 포인터 Y가 탭의 아래쪽 절반이면 뒤(아래)에 놓는다. */
export function dropAfter(pointerY: number, tab: { top: number; height: number }): boolean {
  return pointerY >= tab.top + tab.height / 2;
}

/**
 * Paseo가 보는 끄는 탭의 중심 X = 시작 탭 중심 + (포인터 X - 시작 포인터 X).
 * 이 값이 대상 탭 중심보다 크거나 같으면 뒤, 작으면 앞이므로 그렇게 되는 포인터 X를 고른다.
 * 대상 탭 안에 머물러야 Paseo가 그 탭 위로 판정하므로 탭 가로 범위로 자른다.
 */
export function rewriteX(
  input: { startX: number; startCenter: number; after: boolean },
  tab: { left: number; width: number },
): number {
  // 크게 밀어야 Paseo가 재는 칸(정렬 래퍼)과 탭 rect의 작은 차이에도 판정이 안 뒤집힌다.
  const nudge = tab.width / 4;
  const want = tab.left + tab.width / 2 + (input.after ? nudge : -nudge);
  const x = input.startX + want - input.startCenter;
  return Math.min(tab.left + tab.width - 1, Math.max(tab.left + 1, x));
}

/** Paseo PointerSensor activationConstraint.distance(workspace-tab-drag-scope.web.tsx)보다 약간 크게. */
const DRAG_START_PX = 10;

/** 반환값은 해제 함수. enabled가 false면(가로 모드) 아무것도 하지 않는다. */
export function enableVerticalDrop(enabled: () => boolean, tabSelector: string, rowSelector: () => string): () => void {
  const win = globalThis.window;
  const doc = globalThis.document;
  if (!win || !doc) return () => {};
  let drag: { startX: number; startY: number; startCenter: number; active: boolean } | null = null;

  const tabAt = (x: number, y: number): Element | undefined =>
    // 끌려 다니는 복제 탭(DragOverlay)이 맨 위에 있으므로 elementsFromPoint로 그 아래 실제 탭을 찾는다.
    doc.elementsFromPoint(x, y).map((el) => el.closest(tabSelector)).find((el) => !!el && !!el.closest(rowSelector())) ?? undefined;

  const onDown = (e: PointerEvent) => {
    drag = null;
    if (e.button !== 0 || !enabled() || !(e.target instanceof Element)) return;
    const tab = e.target.closest(tabSelector);
    if (!tab || !tab.closest(rowSelector())) return;
    const r = tab.getBoundingClientRect();
    drag = { startX: e.clientX, startY: e.clientY, startCenter: r.left + r.width / 2, active: false };
  };
  const onMove = (e: PointerEvent) => {
    if (!drag || !e.isTrusted || !enabled()) return;
    if (!(e.buttons & 1)) {
      drag = null; // pointerup을 놓친 경우
      return;
    }
    // Paseo 드래그 시작 거리(8px) 전에는 원래 이벤트 그대로: 클릭 흔들림을 드래그로 만들지 않는다.
    drag.active ||= Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_START_PX;
    if (!drag.active) return;
    const tab = tabAt(e.clientX, e.clientY);
    // shortcut: 탭 사이 틈·목록 아래 빈 곳은 보정하지 않음(그 순간만 원래 판정). 문제 되면 가장 가까운 탭으로 보정.
    if (!tab) return;
    const r = tab.getBoundingClientRect();
    const x = rewriteX({ ...drag, after: dropAfter(e.clientY, r) }, r);
    if (x === e.clientX) return;
    e.stopImmediatePropagation();
    (e.target ?? doc).dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        isPrimary: e.isPrimary,
        button: e.button,
        buttons: e.buttons,
        clientX: x,
        clientY: e.clientY,
        screenX: e.screenX + (x - e.clientX),
        screenY: e.screenY,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      }),
    );
  };
  const onUp = () => {
    drag = null;
  };
  // window 캡처 단계라 Paseo(dnd-kit, document 리스너)보다 먼저 받는다. 우리가 다시 보낸 이벤트는 isTrusted=false라 통과.
  win.addEventListener("pointerdown", onDown, true);
  win.addEventListener("pointermove", onMove, true);
  win.addEventListener("pointerup", onUp, true);
  win.addEventListener("pointercancel", onUp, true);
  return () => {
    win.removeEventListener("pointerdown", onDown, true);
    win.removeEventListener("pointermove", onMove, true);
    win.removeEventListener("pointerup", onUp, true);
    win.removeEventListener("pointercancel", onUp, true);
  };
}
