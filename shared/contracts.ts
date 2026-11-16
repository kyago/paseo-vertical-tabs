import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/** 개발용: 앱 DOM 조각을 데몬 쪽 파일로 남긴다(레이아웃 CSS 셀렉터 확인용). */
export const domDumpRpc = defineRpc({
  name: "dom.dump",
  input: z.object({ name: z.string(), html: z.string() }),
  output: z.object({ path: z.string() }),
});

/** 이 플러그인이 설치된 호스트의 serverId(앱 경로 /h/<serverId>/…와 같은 값). 세로 탭을 이 호스트 워크스페이스에만 적용하는 데 쓴다. */
export const hostIdRpc = defineRpc({
  name: "host.id",
  input: z.object({}),
  output: z.object({ serverId: z.string().min(1) }),
});
