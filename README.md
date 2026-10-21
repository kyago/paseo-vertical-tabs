# paseo-vertical-tabs

A Paseo plugin that turns the workspace's horizontal tab bar into vertical tabs on the left. Tabs stack in a 220px column on the left, and the session (agent) view sits on the right.

- Toggle horizontal/vertical: the `가로 탭으로 전환` / `세로 탭으로 전환` (switch to horizontal / vertical tabs) button in the workspace header, or ⌘K `세로 탭 전환` (toggle vertical tabs). The state is saved in the app's localStorage and is on by default right after install.
- How it works: the SDK has no layout API, so the plugin injects CSS targeting the app DOM (`data-testid`) through a `<style>` element. Desktop and web only, and it can break when a Paseo update changes the DOM. When that happens, run ⌘K `세로 탭 DOM 덤프(개발용)` (vertical tabs DOM dump, for development) to save `~/.paseo/vertical-tabs/tabs.html`, then realign the selectors.
- Collapse/expand: the `‹`/`›` button at the top of the panel, or ⌘K `세로 탭 접기/펼치기` (collapse/expand vertical tabs). When collapsed, only the tab icons (status dots) remain in a 36px rail, and clicking still switches tabs.
- Width: drag the right edge of the vertical tab column to resize it (140–600px, saved).
- The plugin can't touch the tab row's `...` (split/maximize menu), so a header button is used instead.

```sh
npm install
npm run typecheck
paseo plugin install /path/to/paseo-vertical-tabs
```

Tested with Paseo 0.12.0 (Electron 44).
