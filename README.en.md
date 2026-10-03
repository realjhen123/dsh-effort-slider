# dsh-effort-slider

[简体中文](README.md) | **English**

> A **sci-fi reasoning-effort slider** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH).
> A glowing core sits in the composer; click it and a floating energy bar opens — click a tick, drag, or use the arrow keys to switch the model's reasoning level.

<p align="center"><img src="docs/images/panel-ultra.png" alt="Reasoning effort panel" width="620"></p>

---

## What it is

DSH ships a plain dropdown for reasoning effort. This plugin replaces it with an **energy slider**: levels are marked by ticks and each has its own visual feedback (rail glow, star trails, incandescent core). The level names and count follow the current model's real `reasoningEffort` list; when a model has none, the control hides itself.

It does exactly one thing: **switch the reasoning level**. It writes back a level id that really exists in the model directory — it injects no prompt, registers no host routes, and reads no session history.

| Capability | Description |
| --- | --- |
| **Level slider** | Click a tick / drag / arrow keys; writes the model's real `reasoningEffort`; a failed commit reverts and shows a hint |
| **Ultra stop** | One extra stop above the highest level. Selecting it pins the reasoning effort to that model's **highest real level (MAX)** |
| **Three skins** | `holo` (hologram) / `chrome` (liquid metal) / `fluid` (fluid, default, with a particle engine) |
| **Lightning button** | A decorative button in the panel's top-right: it only flips its own lit/unlit look, with **no actual effect** |

## Screenshots

| | |
| --- | --- |
| ![Panel](docs/images/panel-ultra.png) | ![Skins](docs/images/skins.png) |
| Expanded: rail + ticks + readout | Skin switching |

## Details

### Switching levels
- Shown levels = the model's real levels **plus one appended `Ultra` stop**.
- Selecting Ultra writes the **highest real level (MAX)** id back into the model directory — `Ultra` itself never appears in the model directory.
- Invariant: **whenever the UI rests on Ultra, the real reasoning effort is MAX**. Drag release, tick click and arrow keys all go through the same write path.
- A failed commit reverts to the previous level and shows the same hint in both the panel description and the collapsed tooltip.
- A commit that has not landed within 10 seconds stops waiting (**the host operation is not cancelled**); a later host success still wins because the real directory state is authoritative.
- UI copy is **English only**: level names prefer the model directory's own text, but only if it is pure ASCII; otherwise they fall back to the built-in English ladder (`Low / Medium / High / Very High / Max / Full`).

### The Ultra stop
- The 6th stop (the one after the real levels). It is a display-only stop, not a level the model owns.
- Clicking it / dragging to the far right and releasing / arrowing onto it all do the same thing: write the reasoning effort to MAX.
- The level is spelled **`Ultra`** (not all-caps `ULTRA`).

### Lightning button (decorative)
- The expanded panel keeps a lightning button (inline SVG stroke) in the top-right corner.
- Clicking it **only** flips its own lit/unlit look: it calls no host endpoint, injects no prompt, and does not affect the reasoning level.
- Its `aria-label` / `title` explicitly say decorative.

### Skins
- `holo`: hologram; `chrome`: liquid metal; `fluid`: fluid (**default**, with a particle fluid engine and a top-level star trail).
- `nebula` (interstellar) is **retired**: it is only commented out of the skin array, while `SKIN_LABELS` and all its CSS rules remain. To restore it, put `"nebula"` back in `client.js` and adjust `DEFAULT_SKIN` if you like.
- The skin preference is cached both in the host preference file and in browser `localStorage`, so it survives reloads.

## Install

Requires **DSH Desktop ≥ 2.0.9**. A prebuilt `lib/client.js` ships in the repo — install and go, **no build step needed**.

```bash
# From GitHub (this fork)
dsh plugin add github:realjhen123/dsh-effort-slider
```

Manual install: copy the repo directory into `<DSH_HOME>/plugins/` (on Windows: `C:\Users\<you>\.dsh\plugins\`), then restart DSH. The bundled `cordis.patch.yml` is picked up automatically by the profile bundle mechanism.

Uninstall: delete that directory (and the entry in your profile's `dsh.profile.bundles`, if you registered one there), then restart DSH.

## How to use

- **Open / close**: click the core in the composer. Click outside the panel or press `Esc` to close.
- **Switch levels**: click a tick, drag the knob, or use `←` `→` (`↑` `↓` do the same).
- **Change skin**: the three skin buttons at the bottom of the panel.

## How it works

Two halves: client and host.

**Client** (`client.js` + `effort-slider.css`)
- Registers through `window.__ModuleLoader__.load({ id, factory })`; React comes from `require('react')` (peer dependency, not bundled).
- Mounts into the composer tool row's slot `conversation.input.right`.
- Level data goes straight to the host's real model directory store: `ctx.modelDirectories.directoryFor(sessionId).store`, writing `reasoningEffort`.
- Sources are not read by the host directly: `node build.mjs` inlines the CSS into `lib/client.js` and asserts the inlined CSS is **byte-identical** to `effort-slider.css`.
- Any render error is trapped by an error boundary inside the control: it hides itself rather than bubbling up and taking the host UI down.

**Host** (`index.mjs`)
- `GET/POST /plugins/dsh-effort-slider/preferences`: read/write the skin preference and receive client startup heartbeats.
- Heartbeats report per phase (`apply → resolveReact → slotRegistered → inject → mount`) so we can tell whether the UI actually appeared; a verdict is only drawn from real observations, and an error report is never counted as success.
- Preference file: `<DSH_HOME>/storages/effort-slider.json`, containing `{ skin }`; writes are read-modify-write with a unique temp file and an atomic rename.
- All of `apply()` is wrapped in a fallback: a host-side problem degrades the feature but never blocks plugin-tree loading.

## Data & privacy

- Reads and writes only that one local JSON preference file (plus one skin cache in browser `localStorage`).
- **Makes no outbound network requests** — no telemetry, no reporting.
- **Injects no prompt, reads no session history, registers no extra routes.**

## Build & test

Node ≥ 22 only (zero runtime dependencies).

```bash
node build.mjs              # inline CSS -> lib/client.js, with byte-level + artifact-shape assertions
npm test                    # all offline suites below
node smoke-test.mjs         # client: loader shape, component render, skin/boundary regressions
node test/host.test.mjs     # host: preference endpoint, preference file, heartbeat verdict, no exception escape
node test/fluid.test.mjs    # fluid engine: particle density / column coverage / colour semantics / top-level speedup
node test/client-lifecycle.test.mjs # client: level commits, timeout rollback, session switching, decorative button
```

The skin list and default skin in the tests are read from `client.js` rather than hard-coded, so retiring a skin or changing the default keeps the tests in sync with the source.

## Layout

```
client.js            client: UI + fluid engine + level read/write + decorative lightning button
effort-slider.css    all styles (including the retired nebula)
build.mjs            client.js + CSS -> lib/client.js
lib/client.js        build artifact (committed; install-ready)
index.mjs            host: preference endpoint + heartbeat verdict (fail-open)
cordis.patch.yml     plugin mount declaration
test/                offline test suites
preview/             preview page for the fluid skin
skills/              bundled upstream superpowers skills (unrelated to runtime; safe to delete)
docs/images/         README screenshots
THIRD-PARTY.md       third-party credits and licences
```

## Known limits

- Updated plugin files take effect when the host next loads the plugin; running processes keep their loaded version.
- **Package name = runtime identity**: `dsh-effort-slider` is simultaneously the npm package name, the client bundle registration id (`WebBootEntry.id`), the endpoint prefix (`/plugins/dsh-effort-slider/...`) and the `data-effort-slider` attribute. Renaming it means syncing **four places**: `package.json` `name`, `cordis.patch.yml` `name`, the profile's `dsh.profile.bundles` entry, and the junction pointing at the plugin directory under `profiles/<profile>/node_modules`. Any mismatch makes DSH throw `package identity is invalid for <name>` during profile assembly and refuse to start.
- Skin `nebula` is retired but its code remains; `DEFAULT_SKIN` and the skin allowlists (`client.js` and `index.mjs`) must change together — a test checks this consistency.
- The lightning button's lit glow animation relies on CSS `@property`; hosts without it fall back to a static gradient.
- Screenshots in this repo come from a verification bench (real artifact + real React); grey captions outside the widget are bench annotations, not part of the plugin.

## Credits

The plugin's **code** is original. Third-party sources and licences are in [`THIRD-PARTY.md`](THIRD-PARTY.md): React (peer dependency), the Feather Icons `zap` outline (the decorative lightning button's path string), and the optional upstream playbooks under `skills/`.

Zero runtime dependencies, no network, no telemetry.
