// 호스트 2개 = 인스턴스 2개 시나리오. 실행: node --experimental-strip-types client/layout.check.mjs
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
const byId = new Map();
const listeners = new Map();
const classList = { toggle() {}, add() {}, remove() {} };
globalThis.document = {
  getElementById: (id) => byId.get(id) ?? null,
  createElement: () => ({ id: "", textContent: "", remove() { byId.delete(this.id); } }),
  head: { appendChild: (el) => byId.set(el.id, el) },
  body: { classList },
  documentElement: { classList, style: { setProperty() {}, getPropertyValue: () => "" } },
  addEventListener: (t) => listeners.set(t, (listeners.get(t) ?? 0) + 1),
  removeEventListener: (t) => listeners.set(t, listeners.get(t) - 1),
};

const { acquire, toggle, isOn } = await import("./layout.ts");
const styled = () => byId.has("paseo-vertical-tabs");

const seen = [[], []];
const local = acquire((on) => seen[0].push(on), () => {});
local.setHost("srv_local");
const releaseLocal = local.release;
const remote = acquire((on) => seen[1].push(on), () => {});
remote.setHost("srv_remote");
const releaseRemote = remote.release;
assert.ok(styled());
assert.equal(listeners.get("pointerdown"), 1, "포인터 핸들러는 한 번만");

releaseRemote(); // 원격 호스트 끊김
assert.ok(styled(), "다른 인스턴스가 나가도 스타일 유지");

const againInst = acquire((on) => seen[1].push(on), () => {}); // 원격 재연결
againInst.setHost("srv_remote");
const again = againInst.release;
toggle();
assert.equal(isOn(), false);
assert.equal(store.get("paseo-vertical-tabs:on:v2"), "0");
assert.ok(!styled());
assert.deepEqual([seen[0].at(-1), seen[1].at(-1)], [false, false], "전환은 모든 인스턴스 버튼에 반영");
toggle();
assert.ok(styled());

again();
releaseLocal();
assert.ok(!styled(), "마지막 인스턴스가 나가면 스타일 제거");
assert.equal(listeners.get("pointerdown"), 0);
assert.equal(store.get("paseo-vertical-tabs:on:v2"), "1", "cleanup은 저장값을 건드리지 않음");
console.log("ok");

// 예전 버전 번들이 공유 객체를 먼저 만든 경우(호스트별 버전 차이): 새 코드가 던지지 않아야 한다.
globalThis.__paseoVerticalTabs = { on: true, listeners: new Set(), disablePointer() {} };
const releaseNew = acquire(() => {}, () => {}).release;
toggle();
toggle();
releaseNew();
console.log("ok (old shared state)");

// 호스트 격리: 등록된 호스트의 워크스페이스에만 CSS 범위가 걸린다.
const { hostScope, css } = await import("./layout.ts");
assert.equal(hostScope([]), "", "호스트가 없으면 범위 없음");
const scope = hostScope(["srv_a"]);
assert.ok(scope.includes('[data-testid^="workspace-deck-entry-srv_a:"]'));
for (const line of css(scope).split("\n").filter((l) => l.includes("{") && !l.startsWith("body.") && !l.startsWith("/*"))) {
  assert.ok(line.includes("workspace-deck-entry-srv_a:"), `범위 없는 규칙: ${line.slice(0, 80)}`);
}
const inst = acquire(() => {}, () => {});
assert.ok(!styled(), "호스트 등록 전엔 스타일 없음");
inst.setHost("srv_a");
assert.ok(styled() && byId.get("paseo-vertical-tabs").textContent.includes("srv_a:"), "등록 후 그 호스트 범위로 적용");
const other = acquire(() => {}, () => {});
other.setHost("srv_b");
assert.ok(byId.get("paseo-vertical-tabs").textContent.includes("srv_b:"));
other.release();
assert.ok(!byId.get("paseo-vertical-tabs").textContent.includes("srv_b:"), "호스트가 나가면 범위에서 빠짐");
inst.release();
assert.ok(!styled());
console.log("ok (host scope)");
