import type { PluginServerContext } from "@getpaseo/plugin/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { domDumpRpc, hostIdRpc } from "./shared/contracts";

const HOME = process.env.PASEO_HOME ?? join(homedir(), ".paseo");
const DIR = join(HOME, "vertical-tabs");

export default function contribute(server: PluginServerContext) {
  // 데몬이 PASEO_HOME/server-id에 둔 값이 앱 경로의 serverId와 같다.
  server.handle(hostIdRpc, async () => ({ serverId: (await readFile(join(HOME, "server-id"), "utf8")).trim() }));
  server.handle(domDumpRpc, async ({ name, html }) => {
    await mkdir(DIR, { recursive: true });
    const path = join(DIR, `${name.replace(/[^\w.-]/g, "_")}.html`);
    await writeFile(path, html);
    return { path };
  });
  return () => {};
}
