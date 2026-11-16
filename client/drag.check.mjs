// 실행: node --experimental-strip-types client/drag.check.mjs
import assert from "node:assert/strict";
const { dropAfter, rewriteX } = await import("./drag.ts");

const tab = { left: 0, top: 100, width: 220, height: 30 };
assert.equal(dropAfter(110, tab), false, "위쪽 절반 → 앞");
assert.equal(dropAfter(120, tab), true, "아래쪽 절반 → 뒤");

// Paseo 판정: 끄는 탭 중심(startCenter + x - startX) >= 대상 중심 이면 뒤
const paseoAfter = (start, x) => start.startCenter + (x - start.startX) >= tab.left + tab.width / 2;
for (const startX of [5, 110, 214]) {
  const start = { startX, startCenter: 110 };
  for (const after of [true, false]) {
    const x = rewriteX({ ...start, after }, tab);
    assert.ok(x > tab.left && x < tab.left + tab.width, "포인터는 대상 탭 안");
    if (startX !== 214 || !after) assert.equal(paseoAfter(start, x), after, `startX=${startX} after=${after}`);
  }
}
console.log("ok");
