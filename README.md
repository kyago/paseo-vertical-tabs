# paseo-vertical-tabs

Paseo 워크스페이스의 가로 탭 바를 왼쪽 세로 탭으로 바꾸는 플러그인. 왼쪽 220px 컬럼에 탭이 세로로 쌓이고 오른쪽에 세션(agent) 창이 보인다.

- 가로/세로 전환: 워크스페이스 헤더의 `가로 탭으로 전환`/`세로 탭으로 전환` 버튼, 또는 ⌘K `세로 탭 전환`. 상태는 앱 localStorage에 저장되며 설치 직후 기본 켜짐.
- 동작 원리: SDK에 레이아웃 API가 없어서 앱 DOM(`data-testid`)을 겨냥한 CSS를 `<style>`로 주입한다. 데스크톱/웹 전용이며 paseo 업데이트로 DOM이 바뀌면 깨질 수 있다. 그때는 ⌘K `세로 탭 DOM 덤프(개발용)`로 `~/.paseo/vertical-tabs/tabs.html`을 남겨 셀렉터를 다시 맞춘다.
- 접기/펼치기: 패널 맨 위 `‹`/`›` 버튼 또는 ⌘K `세로 탭 접기/펼치기`. 접으면 36px 레일에 탭 아이콘(상태 점)만 남고 클릭 전환은 그대로 된다.
- 너비: 세로 탭 컬럼의 오른쪽 경계를 드래그해 조절(140~600px, 저장됨).
- 탭 줄의 `...`(분할/최대화 메뉴)는 플러그인이 건드릴 수 없어 헤더 버튼으로 대신한다.

```sh
npm install
npm run typecheck
paseo plugin install /path/to/paseo-vertical-tabs
```

검증 기준: paseo 0.12.0 (Electron 44).
