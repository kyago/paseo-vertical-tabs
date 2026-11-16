import { useEffect } from "react";
import { defineTranslations, type PluginClientContext } from "@getpaseo/plugin/client";
import { useToast } from "@getpaseo/plugin/client/react-native";
import { acquire, isCollapsed, setCollapsed, snapshot, toggle } from "./client/layout";
import { createSettingsScreen } from "./client/settings-screen";
import { domDumpRpc, hostIdRpc } from "./shared/contracts";

const text = defineTranslations({
  resources: {
    en: {
      toggle: "Toggle vertical tabs",
      collapse: "Collapse/expand vertical tabs",
      dump: "Vertical tabs: dump DOM (debug)",
      unsupported: "Vertical tabs don't support this Paseo version yet, so horizontal tabs are shown.",
      toastBridge: "Vertical tabs notifications",
      settingsTitle: "Vertical tabs",
      useVertical: "Use vertical tabs",
      useVerticalHint: "Show workspace tabs in a column on the left. Saved on this device.",
      collapsed: "Collapse to icons",
      collapsedHint: "Keep only tab icons in a narrow rail. Also the ‹ / › button at the top of the column.",
      width: "Column width",
      widthHint: "You can also drag the column's right edge; double-click it to reset.",
      widthDefault: "default",
      webOnly: "Vertical tabs work on desktop and web only.",
    },
    ko: {
      toggle: "세로 탭 전환",
      collapse: "세로 탭 접기/펼치기",
      dump: "세로 탭 DOM 덤프(디버그)",
      unsupported: "세로 탭이 아직 이 Paseo 버전을 지원하지 않아 가로 탭으로 표시합니다.",
      toastBridge: "세로 탭 알림",
      settingsTitle: "세로 탭",
      useVertical: "세로 탭 사용",
      useVerticalHint: "워크스페이스 탭을 왼쪽 세로 컬럼으로 표시합니다. 이 기기에 저장됩니다.",
      collapsed: "아이콘만 보기(접기)",
      collapsedHint: "좁은 레일에 탭 아이콘만 남깁니다. 컬럼 맨 위 ‹ / › 버튼으로도 바꿀 수 있습니다.",
      width: "컬럼 너비",
      widthHint: "컬럼 오른쪽 경계를 드래그해도 바뀌고, 더블클릭하면 기본값으로 돌아갑니다.",
      widthDefault: "기본",
      webOnly: "세로 탭은 데스크톱·웹에서만 동작합니다.",
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

function debugEnabled(): boolean {
  try {
    return localStorage.getItem(DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

export default function contribute(client: PluginClientContext) {
  const { release, setHost } = acquire(
    () => {},
    () => shared.__paseoVerticalTabsToast?.error(client.i18n.t(text, "unsupported")),
  );
  // 이 호스트의 워크스페이스에만 적용한다. serverId를 모르면(조회 실패) 아무 데도 적용하지 않는다.
  void client
    .rpc(hostIdRpc, {})
    .then(({ serverId }) => setHost(serverId))
    .catch((error) => console.warn("[vertical-tabs] host id unavailable; vertical tabs stay off for this host", error));
  const toggleCollapse = () => setCollapsed(!isCollapsed());

  // 켜기/끄기는 ⌘K와 설정 화면, 접기는 컬럼 맨 위 버튼과 ⌘K. 헤더 버튼은 두지 않는다(좁은 창에서 헤더가 붐빔).
  const cleanups = [
    client.addSidebarFooterItem({ id: "toast-bridge", title: text.message("toastBridge"), Component: ToastBridge }),
    client.addSettingsScreen({ id: "settings", title: text.message("settingsTitle"), icon: "PanelLeft", Component: createSettingsScreen(text) }),
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
    for (const cleanup of cleanups) cleanup();
    release();
  };
}
