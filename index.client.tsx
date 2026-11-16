import { useEffect } from "react";
import { defineTranslations, type PluginButtonRegistration, type PluginClientContext } from "@getpaseo/plugin/client";
import { useToast } from "@getpaseo/plugin/client/react-native";
import { acquire, isCollapsed, isOn, setCollapsed, snapshot, toggle } from "./client/layout";
import { domDumpRpc, hostIdRpc } from "./shared/contracts";

const text = defineTranslations({
  resources: {
    en: {
      toHorizontal: "Switch to horizontal tabs",
      toVertical: "Switch to vertical tabs",
      toggle: "Toggle vertical tabs",
      collapse: "Collapse/expand vertical tabs",
      dump: "Vertical tabs: dump DOM (debug)",
      unsupported: "Vertical tabs don't support this Paseo version yet, so horizontal tabs are shown.",
      toastBridge: "Vertical tabs notifications",
    },
    ko: {
      toHorizontal: "가로 탭으로 전환",
      toVertical: "세로 탭으로 전환",
      toggle: "세로 탭 전환",
      collapse: "세로 탭 접기/펼치기",
      dump: "세로 탭 DOM 덤프(디버그)",
      unsupported: "세로 탭이 아직 이 Paseo 버전을 지원하지 않아 가로 탭으로 표시합니다.",
      toastBridge: "세로 탭 알림",
    },
  },
});

// 개발용 DOM 덤프 명령은 이 값이 "1"일 때만 보인다(개발자 도구 콘솔에서 localStorage.setItem 후 새로고침).
const DEBUG_KEY = "paseo-vertical-tabs:debug";

type Toast = ReturnType<typeof useToast>;
// 호스트가 여러 개여도 사이드바 항목은 플러그인당 하나만 렌더링되므로 toast를 globalThis로 나눠 쓴다.
const shared = globalThis as { __paseoVerticalTabsToast?: Toast };

/** 아무것도 그리지 않고, 훅인 toast를 React 밖(레이아웃 감시)에서 쓰도록 넘긴다. */
function ToastBridge() {
  const toast = useToast();
  useEffect(() => {
    shared.__paseoVerticalTabsToast = toast;
    return () => {
      if (shared.__paseoVerticalTabsToast === toast) delete shared.__paseoVerticalTabsToast;
    };
  }, [toast]);
  return null;
}

function button(on: boolean) {
  return { title: text.message(on ? "toHorizontal" : "toVertical"), icon: on ? "PanelTop" : "PanelLeft" };
}

function debugEnabled(): boolean {
  try {
    return localStorage.getItem(DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

export default function contribute(client: PluginClientContext) {
  const buttons = new Map<string, PluginButtonRegistration<ReturnType<typeof text.message>>>();
  const { release, setHost } = acquire(
    (on) => {
      for (const b of buttons.values()) b.update(button(on));
    },
    () => shared.__paseoVerticalTabsToast?.error(client.i18n.t(text, "unsupported")),
  );
  // 이 호스트의 워크스페이스에만 적용한다. serverId를 모르면(조회 실패) 아무 데도 적용하지 않는다.
  void client
    .rpc(hostIdRpc, {})
    .then(({ serverId }) => setHost(serverId))
    .catch((error) => console.warn("[vertical-tabs] host id unavailable; vertical tabs stay off for this host", error));
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

  const cleanups = [
    client.addSidebarFooterItem({ id: "toast-bridge", title: text.message("toastBridge"), Component: ToastBridge }),
    client.addCommandCenterItem({ id: "toggle", title: text.message("toggle"), icon: "PanelLeft", context: "workspace", onSelect: toggle }),
    client.addCommandCenterItem({ id: "collapse", title: text.message("collapse"), icon: "PanelLeftClose", context: "workspace", onSelect: toggleCollapse }),
  ];
  if (debugEnabled()) {
    cleanups.push(
      client.addCommandCenterItem({
        id: "dump",
        title: text.message("dump"),
        icon: "Bug",
        context: "workspace",
        async onSelect({ rpc }) {
          const html = snapshot();
          if (html) await rpc(domDumpRpc, { name: "tabs", html });
        },
      }),
    );
  }

  return () => {
    unsubscribe();
    for (const cleanup of cleanups) cleanup();
    for (const b of buttons.values()) b.remove();
    release();
  };
}
