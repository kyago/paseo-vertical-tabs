import { useReducer } from "react";
import { Platform } from "react-native";
import { type PluginTranslations, useTranslation } from "@getpaseo/plugin/client";
import { SettingsCard, SettingsRow, SettingsSection, SettingsSelect, SettingsSwitch } from "@getpaseo/plugin/client/ui";
import { DEFAULT_W, getWidth, isCollapsed, isOn, setCollapsed, setWidth, toggle } from "./layout.ts";

const PRESETS = [160, 200, DEFAULT_W, 280, 360];

type Keys = {
  settingsTitle: string;
  useVertical: string;
  useVerticalHint: string;
  collapsed: string;
  collapsedHint: string;
  width: string;
  widthHint: string;
  widthDefault: string;
  webOnly: string;
};

/** 이 기기 설정(localStorage). 호스트가 아니라 기기마다 다르게 둔다. 너비는 드래그로 바꾼 값도 그대로 보인다. */
export function createSettingsScreen(text: PluginTranslations<Keys>) {
  return function SettingsScreen() {
    const { t } = useTranslation(text);
    const [, refresh] = useReducer((n: number) => n + 1, 0);
    if (Platform.OS !== "web") {
      return (
        <SettingsSection title={t("settingsTitle")}>
          <SettingsCard>
            <SettingsRow label={t("useVertical")} hint={t("webOnly")} />
          </SettingsCard>
        </SettingsSection>
      );
    }
    const width = getWidth();
    const widths = PRESETS.includes(width) ? PRESETS : [...PRESETS, width].sort((a, b) => a - b);
    const run = (change: () => void) => {
      change();
      refresh();
    };
    return (
      <SettingsSection title={t("settingsTitle")}>
        <SettingsCard>
          <SettingsSwitch
            label={t("useVertical")}
            hint={t("useVerticalHint")}
            value={isOn()}
            onValueChange={(on) => run(() => on !== isOn() && toggle())}
          />
          <SettingsSwitch label={t("collapsed")} hint={t("collapsedHint")} value={isCollapsed()} onValueChange={(on) => run(() => setCollapsed(on))} />
          <SettingsSelect
            label={t("width")}
            hint={t("widthHint")}
            value={String(width)}
            options={widths.map((w) => ({ label: w === DEFAULT_W ? `${w}px (${t("widthDefault")})` : `${w}px`, value: String(w) }))}
            onValueChange={(w) => run(() => setWidth(Number(w), true))}
          />
        </SettingsCard>
      </SettingsSection>
    );
  };
}
