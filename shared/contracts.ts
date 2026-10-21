import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/** 개발용: 앱 DOM 조각을 데몬 쪽 파일로 남긴다(레이아웃 CSS 셀렉터 확인용). */
export const domDumpRpc = defineRpc({
  name: "dom.dump",
  input: z.object({ name: z.string(), html: z.string() }),
  output: z.object({ path: z.string() }),
});
