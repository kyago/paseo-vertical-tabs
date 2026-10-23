import type { PluginButtonRegistration, PluginClientContext } from "@getpaseo/plugin/client";
import { acquire, isCollapsed, isOn, setCollapsed, snapshot, toggle } from "./client/layout";
import { domDumpRpc } from "./shared/contracts";

const TITLE = "세로 탭";

function button(on: boolean) {
  return { title: on ? "가로 탭으로 전환" : "세로 탭으로 전환", icon: on ? "PanelTop" : "PanelLeft" };
}

export default function contribute(client: PluginClientContext) {
  const buttons = new Map<string, PluginButtonRegistration>();
  const release = acquire((on) => {
    for (const b of buttons.values()) b.update(button(on));
  });
  const toggleCollapse = () => setCollapsed(!isCollapsed());

  // 워크스페이스 헤더마다 토글 버튼. 새 워크스페이스는 구독으로 따라간다.
  const ensure = (workspaceId: string) => {
    if (buttons.has(workspaceId)) return;
    buttons.set(workspaceId, client.addHeaderButton({ id: `toggle-${workspaceId}`, workspaceId, button: { ...button(isOn()), behavior: { kind: "action", onPress: toggle } } }));
  };
  void client.paseo.workspaces.list({}).then((r) => r.entries.forEach((w) => ensure(w.id))).catch(() => {});
  const unsubscribe = client.paseo.workspaces.subscribe((u) => {
    if (u.kind === "upsert") ensure(u.workspace.id);
  });

  client.addCommandCenterItem({ id: "toggle", title: `${TITLE} 전환`, icon: "PanelLeft", context: "workspace", onSelect: toggle });
  client.addCommandCenterItem({ id: "collapse", title: `${TITLE} 접기/펼치기`, icon: "PanelLeftClose", context: "workspace", onSelect: toggleCollapse });
  client.addCommandCenterItem({
    id: "dump",
    title: `${TITLE} DOM 덤프(개발용)`,
    icon: "Bug",
    context: "workspace",
    async onSelect({ rpc }) {
      const html = snapshot();
      if (html) await rpc(domDumpRpc, { name: "tabs", html });
    },
  });

  return () => {
    unsubscribe();
    for (const b of buttons.values()) b.remove();
    release();
  };
}
