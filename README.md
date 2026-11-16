# paseo-vertical-tabs

A Paseo plugin that turns the workspace's horizontal tab bar into vertical tabs on the left. Tabs stack in a resizable column on the left, and the session sits on the right.

- **Toggle horizontal/vertical:** ⌘K `Toggle vertical tabs`, or Settings → Plugins → Vertical Tabs. Saved per device; on by default after install.
- **Collapse/expand:** the `‹`/`›` button at the top of the column, ⌘K `Collapse/expand vertical tabs`, or the settings screen. Collapsed, a 36px rail keeps the tab icons (status dots), and clicking still switches tabs.
- **Width:** drag the column's right edge (140–600px, saved); it highlights on hover, and a double-click resets it to 220px. Presets are also in the settings screen.
- **Reorder by drag:** drop on the top half of a tab to place before it, the bottom half to place after it. A horizontal line shows where the tab will land.
- **Languages:** English and Korean, following the app language.
- **Only on its own host:** when the app is connected to several hosts, vertical tabs apply only to workspaces of the host where the plugin is installed. Workspaces of other hosts keep Paseo's horizontal tabs.

## Limits

- Desktop and web only. Paseo's plugin SDK has no layout API, so the plugin injects CSS that targets the app DOM (`data-testid`). iOS and Android keep horizontal tabs.
- A Paseo update can change that DOM. The plugin checks the layout once tabs are on screen; if the session doesn't sit to the right of the tabs, it falls back to horizontal tabs for that run and shows a notice. Your setting is kept, so vertical tabs return once a compatible version is installed.
- Paseo decides where a dragged tab lands from horizontal positions only. While you drag over a tab, the plugin adjusts the pointer's horizontal position so the drop follows the top/bottom half of the tab. Outside the tab column (for example, dropping onto a pane to split it), events pass through unchanged.

## Development

```sh
npm install
npm run typecheck
node --experimental-strip-types client/drag.check.mjs
node --experimental-strip-types client/layout.check.mjs
paseo plugin install /path/to/paseo-vertical-tabs
```

If the layout breaks after a Paseo update, run `localStorage.setItem("paseo-vertical-tabs:debug", "1")` in the developer console and reload. ⌘K `Vertical tabs: dump DOM (debug)` then saves the tab area markup to `~/.paseo/vertical-tabs/tabs.html` for realigning the selectors.

Tested with Paseo 0.15.4 (Electron).
