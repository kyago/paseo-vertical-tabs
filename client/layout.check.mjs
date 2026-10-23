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
const releaseLocal = acquire((on) => seen[0].push(on));
const releaseRemote = acquire((on) => seen[1].push(on));
assert.ok(styled());
assert.equal(listeners.get("pointerdown"), 1, "포인터 핸들러는 한 번만");

releaseRemote(); // 원격 호스트 끊김
assert.ok(styled(), "다른 인스턴스가 나가도 스타일 유지");

const again = acquire((on) => seen[1].push(on)); // 원격 재연결
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
