import type { PluginServerContext } from "@getpaseo/plugin/server";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { domDumpRpc } from "./shared/contracts";

const DIR = join(process.env.PASEO_HOME ?? join(homedir(), ".paseo"), "vertical-tabs");

export default function contribute(server: PluginServerContext) {
  server.handle(domDumpRpc, async ({ name, html }) => {
    await mkdir(DIR, { recursive: true });
    const path = join(DIR, `${name.replace(/[^\w.-]/g, "_")}.html`);
    await writeFile(path, html);
    return { path };
  });
  return () => {};
}
