# Limedrop Soup OS

A browser-based desktop environment where the main application is a visual, AI-enhanced workflow builder. You wire components together on a node canvas, run the graph, and the result becomes a real app with its own icon on the desktop and its own window in the dock.

Everything runs client-side. There is no backend, no build step beyond Vite, and no account to create — state lives in `localStorage`.

> **Status: beta.** Authentication is a mock gate over a hardcoded demo-user list. Treat it as a prototype, not a multi-user product.

---

## The idea

Most low-code builders give you a canvas that produces a *mock-up*. This one produces something that executes:

1. **Design** — drag components onto the workflow canvas and connect an output port to an input port.
2. **Configure** — each component's properties panel is generated from its metadata schema.
3. **Run** — the dataflow engine topologically sorts the graph and executes it, level by level, feeding each node's outputs into whatever is wired downstream.
4. **Keep** — the app is saved, installed to the desktop and dock, and opens in its own window like any built-in app.

The AI components are ordinary nodes in that graph. An `AI Prompt` node takes whatever is wired into it, substitutes it into a prompt template, calls Claude, and passes the response downstream — so a workflow can mix a file read, a transform, a model call, and a chart without leaving the canvas.

---

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Then open `http://localhost:3000`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production bundle to `dist/` |
| `npm run preview` | Serve the built bundle on port 8080 |
| `npm run start:prod` | Same, with the port passed explicitly |
| `npm run lint` | ESLint over `src/` |

### Demo sign-in

The login screen has one-click buttons for the first two. All three are defined in `src/contexts/AuthContext.jsx`.

| Email | Password | Role |
| --- | --- | --- |
| `demo@limedrop.com` | `demo123` | user |
| `admin@limedrop.com` | `admin123` | admin |
| `user@example.com` | `password` | user |

### Enabling the AI components

Open **Settings → AI** and paste an Anthropic API key. Without one, the AI nodes fail with a clear error and the rest of the workflow still runs.

Models available: Claude Opus 5, Claude Sonnet 5, Claude Haiku 4.5.

**How the key is handled:** it is stored in `localStorage` under `limedrop-ai-credentials` and used to call the Anthropic API directly from the browser (`dangerouslyAllowBrowser`). The key never goes to any server of ours — because there is no server — but it *is* readable by anything running on the page's origin. That tradeoff is fine for a personal workspace on your own machine and is not appropriate for a shared or public deployment.

---

## The App Builder

Open it from the dock or the desktop icon. Three view modes: **Designer**, **Preview**, **Split**.

**Workflow canvas**
- Pan by dragging empty space or scrolling; `Ctrl`/`Cmd` + scroll zooms about the pointer
- Zoom controls and fit-to-view in the canvas toolbar
- Drag a component from the palette onto the canvas, or click it to drop one in the next free slot
- Drag from any port to any compatible port to wire it up; ports that the in-flight wire cannot legally reach dim out
- Click a wire to select it, then `Delete` or the × button to remove it
- Nodes carry inline validation badges (cycles, missing inputs, unimplemented types)

**Properties panel** — generated from each component's metadata schema. Supports text, number, boolean, select, multiselect, slider, colour, code, and array editors, with per-field validation.

**Live preview** — mounts the real runtime at a chosen device size, so the preview runs the same code path the installed app does.

Keyboard: `Ctrl+S` save, `Ctrl+N` new, `Ctrl+O` open, `Delete` remove the selected node, `Esc` deselect. Unsaved work auto-saves 30 seconds after the last edit.

---

## Component library

15 components across 6 categories, defined as metadata in `src/data/componentLibrary.js` and implemented in `src/runtime/executors.js`. Adding one is a data change plus an executor — the palette, property editor, ports, and validation all derive from the same definition.

### Input & Data
| Component | What it does |
| --- | --- |
| Smart Text Input | Text entry with validation (email/phone/URL/regex) and formatting (currency/date/phone) |
| Advanced File Upload | Drag-and-drop upload; text files are read as text, everything else as a data URL |
| Interactive Data Table | Editable grid with per-column type checking |
| Read File | Pull a file out of the File Manager, optionally parsing it as JSON/CSV/XML/YAML |

### Logic & Processing
| Component | What it does |
| --- | --- |
| Advanced Data Transformer | Parse, transform with your own JS, and re-serialize between formats |
| Smart Condition Gate | Multi-criteria conditions with AND/OR/NOT; can halt everything downstream |

### AI & Intelligence
| Component | What it does |
| --- | --- |
| AI Text Processor | Sentiment, translation, and summarization, with a confidence threshold |
| AI Prompt | Freeform prompt to Claude with `{{input}}` substitution, plus system prompt, model, and effort controls |

### Display & Output
| Component | What it does |
| --- | --- |
| Interactive Chart Suite | Renders incoming rows as a chart |
| Adaptive Dashboard | Widget layout driven by the incoming data |
| Display | Shows the incoming value as text or formatted JSON |
| Export / Download | Offers the value as a downloadable JSON/CSV/XML/YAML file |
| Write File | Saves the value back into the File Manager |

### User Interaction
| Component | What it does |
| --- | --- |
| Action Button | Gates the workflow until clicked — nothing downstream runs before then |

### External Services
| Component | What it does |
| --- | --- |
| HTTP Request | `fetch` against a URL. The target must send CORS headers; browser-origin requests cannot bypass that. |

---

## Execution model

`src/runtime/engine.js` is a small dataflow engine.

- A connection is `{ from, fromPort, to, toPort }`. Each input port takes exactly one value — wiring a new source into an occupied port replaces the old wire.
- `planExecution` runs Kahn's algorithm to produce *levels* of nodes with no unmet dependencies. Nodes in a level run concurrently via `Promise.all`; the next level waits, so a node always sees finished upstream values.
- Nodes left over after the sort are in a cycle and are reported as errors rather than run.
- A failed node marks everything downstream as skipped, so one broken branch doesn't cascade into confusing secondary failures.
- `validateApp` runs the same analysis statically, which is what feeds the badges in the builder and disables **Run** when the graph can't execute.
- Executors return `{ outputs, display }` — `outputs` flows downstream, `display` is what the runner renders for that node.

**Security note:** the Data Transformer and Condition Gate execute user-authored JavaScript via `new Function`. That is the point of those components, but it is *not* a sandbox — the code has full access to the page. Don't load app definitions from sources you don't trust.

---

## Architecture

React 18 + Vite 5, CSS Modules, React Context for cross-cutting state. No state library, no CSS framework.

```
src/
├── main.jsx                  Entry point
├── App.jsx                   Router + auth gate + ErrorBoundary
├── pages/Desktop.jsx         Desktop shell
├── components/
│   ├── Window.jsx            Window chrome (drag, resize, focus)
│   ├── WindowsContainer.jsx  Renders open windows, z-index stacking
│   ├── Dock.jsx              Launcher + running-app indicators
│   ├── DesktopIcons.jsx      Desktop shortcuts
│   ├── Login.jsx             Mock auth UI
│   ├── SmartPropertyEditor.jsx   Schema-driven property form
│   ├── LivePreview.jsx       Mounts the real runtime at a device size
│   ├── workflow/
│   │   ├── WorkflowCanvas.jsx    Pan/zoom canvas: nodes, ports, wires
│   │   └── geometry.js           Node/port/edge geometry
│   ├── runtime/              Chart, dashboard, data-table renderers
│   └── apps/
│       ├── EnhancedAppBuilder.jsx  The main builder
│       ├── AppBuilder.jsx          Earlier, simpler builder (still registered)
│       ├── BuiltAppRunner.jsx      Executes a saved app in a window
│       ├── AppManager.jsx          Install / uninstall / remove
│       ├── FileManager.jsx         Virtual files in localStorage
│       └── Settings.jsx            Theming + AI credentials
├── contexts/                 Auth, Settings, App (windows/modals/toasts)
├── hooks/                    Window manager, drag, resize, modals, toasts
├── runtime/
│   ├── engine.js             Topological scheduler + validation
│   ├── executors.js          One implementation per component type
│   ├── aiClient.js           Anthropic SDK wrapper
│   └── formats.js            JSON / CSV / XML / YAML
├── storage/                  appStore, fileStore (localStorage)
├── data/componentLibrary.js  Component metadata
└── styles/                   global.css tokens + one module per component
```
---

## Theming

`SettingsContext` writes CSS custom properties onto the document root, so changes apply instantly without re-rendering a provider. Settings cover font colours, primary/secondary button colours, glass opacity and blur, window-control icons, desktop icon colour and size, and 50+ gradient backgrounds with an optional animation.

Every themed colour also gets an `r, g, b` companion variable (`--font-color` → `--font-color-rgb`) for rules that need a translucent version.

---

## Storage

All state is `localStorage` on the page's origin. Clearing site data resets the workspace.

| Key | Contents |
| --- | --- |
| `limedrop-session` | Signed-in user, 7-day expiry |
| `limedrop-settings` | Theme and system preferences |
| `limedrop-apps` | User-built app definitions |
| `limedrop-files` | File Manager contents |
| `limedrop-ai-credentials` | Anthropic API key and model choice |

`appStore` migrates older `limedrop-built-apps` / `limedrop-enhanced-apps` entries into `limedrop-apps` on first load, keeps a `.backup` copy of each, and records that it has done so under `limedrop-apps-migrated`.

---

## Deployment

The production build is a static bundle — any static host will serve it:

```bash
npm run build
```

Serve `dist/` with a rewrite sending unknown paths to `index.html`, so client-side routing works on a hard refresh.

⚠️ **Every deploy manifest in the repo is stale.** `vercel.json`, `render.yaml`, `Procfile`, and `app.json` were all written for an Express/SQLite/Prisma backend that is not in this repository:

- `vercel.json` routes every request to `server/index.js` and builds with `@vercel/node` — there is no `server/`, so nothing would be served.
- `render.yaml` declares `env: docker` (there is no Dockerfile) and `startCommand: npm start` (there is no `start` script).
- `Procfile` runs `npx http-server`, which isn't a declared dependency and so would be fetched, unpinned, at every boot.
- All of them set `JWT_SECRET` / `ADMIN_TOKEN` / `DATABASE_URL`, which nothing reads.

They need rewriting as plain static-site configs, or deleting. `.env.example` is leftover in the same way — Vite only exposes `VITE_`-prefixed variables to the client, and none of the keys it lists are read anywhere in `src/`.

---

## License

No license file is currently present in this repository.
