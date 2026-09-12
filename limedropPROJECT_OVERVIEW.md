# Limedrop Soup OS — Project Overview

## One-line summary
A browser-based desktop-environment simulation ("web OS") built as a React 18 single-page application, featuring a multi-window manager, theming system, mock authentication, and a visual low-code/no-code **App Builder** that lets users assemble, preview, and run custom applications inside the desktop shell.

## Elevator pitch
Limedrop Soup OS is a ~6,400-line React SPA that reproduces the interaction model of a traditional desktop operating system in the browser. Users log in, land on a desktop with a dock and icons, and open draggable/resizable windows that host built-in applications. The headline feature is a drag-and-drop **App Builder** with a categorized component library, smart property editor, connection/wiring canvas, live preview, and a runtime (`BuiltAppRunner`) that executes the user's saved apps — effectively a small in-browser IDE for composing mini-apps without writing code. A settings app exposes live theme controls (gradient backgrounds, glass/blur effects, window chrome icons, font colors) that are applied via CSS variables and persisted to localStorage.

---

## Tech stack

| Layer | Tools |
| --- | --- |
| UI framework | React 18 (hooks, Context API), React Router 6 |
| Build / dev | Vite 5, `@vitejs/plugin-react` |
| Styling | CSS Modules (one module per component), global CSS variables for theming |
| State management | React Context (`AuthContext`, `SettingsContext`, `AppContext`) + custom hooks |
| Persistence | `localStorage` (sessions, settings, files, user-built apps) |
| Icons | Font Awesome 6 |
| Lint | ESLint with `react`, `react-hooks`, and `react-refresh` plugins |
| Deploy targets | Vercel (`vercel.json`), Render (`render.yaml`), Heroku (`Procfile`, `app.json`) |
| Optional integration | `parlant-chat-react` (chat widget dependency) |

> **Note for AI scanners / recruiters:** `package.json` declares a front-end-only dependency set. The included `README.md` also describes an aspirational Express / SQLite / Prisma / JWT backend, but that backend is **not present in this repository** — authentication and persistence are implemented client-side against a hardcoded demo-user list and `localStorage`. The shipping application is a pure SPA.

---

## Architecture

```
src/
├── main.jsx                 # React entry point
├── App.jsx                  # Router + auth gate + ErrorBoundary
├── pages/
│   └── Desktop.jsx          # Top-level desktop shell
├── components/
│   ├── Desktop*.jsx         # Background, icons
│   ├── Window.jsx           # Draggable / resizable window chrome
│   ├── WindowsContainer.jsx # Renders all open windows + z-index stacking
│   ├── Dock.jsx             # App launcher
│   ├── Login.jsx            # Email/password + signup form with validation
│   ├── UserMenu.jsx
│   ├── Notification*.jsx    # Toast system
│   ├── ModalOverlay.jsx
│   ├── ErrorBoundary.jsx
│   ├── ConnectionSystem.jsx # Visual wiring between App-Builder components
│   ├── SmartPropertyEditor.jsx  # Dynamic form driven by component metadata
│   ├── LivePreview.jsx      # Renders App-Builder output in real time
│   └── apps/
│       ├── Settings.jsx           (629 LOC) — theme + system preferences
│       ├── FileManager.jsx        (291 LOC) — CRUD over localStorage
│       ├── AppBuilder.jsx         (308 LOC) — basic builder
│       ├── EnhancedAppBuilder.jsx (700 LOC) — advanced builder w/ auto-save
│       ├── AppManager.jsx         (289 LOC) — install/uninstall built apps
│       └── BuiltAppRunner.jsx     (198 LOC) — runtime for user-built apps
├── contexts/
│   ├── AuthContext.jsx      # Mock auth, 7-day session, localStorage
│   ├── SettingsContext.jsx  # Live CSS-variable theming
│   └── AppContext.jsx
├── hooks/
│   ├── useWindowManager.js  # Open / close / focus / minimize / maximize
│   ├── useWindowDrag.js     # Pointer-based window dragging
│   ├── useWindowResize.js   # Edge/corner resize handles
│   ├── useAdvancedDragDrop.js  # Grid snapping + magnetic drop zones
│   ├── useNotifications.js
│   ├── useSettings.js
│   ├── useDesktop.js
│   ├── useModal.jsx
│   └── useMobile.js         # Responsive breakpoint hook
├── data/
│   └── componentLibrary.js  # Metadata-driven catalog of builder components
└── styles/                  # One CSS module per component + global.css
```

### Key architectural patterns

- **Context + hooks over Redux.** Cross-cutting state (auth, settings, windows, notifications, modals) is exposed through purpose-built hooks rather than a global store.
- **Metadata-driven UI.** `componentLibrary.js` defines each builder component as a rich object — category, icon, properties schema, default values, tags, difficulty, estimated setup time — so the property editor, palette, and preview can all be generated from the same source of truth.
- **CSS-variable theming.** `SettingsContext` writes to CSS custom properties on the document root, so theme changes apply instantly across every mounted component without re-rendering.
- **Separation of chrome vs. content.** `Window.jsx` owns only the frame (title bar, resize, focus); the inner application component is injected and has no knowledge of window mechanics.
- **Z-index as focus model.** `useWindowManager` keeps a monotonically increasing `nextZIndex` ref; clicking any window issues a new z-index, mirroring native OS window-stacking semantics.

---

## Feature inventory (implemented)

### Desktop shell
- Draggable, resizable, minimizable, maximizable windows with z-index-based focus
- Dock-style app launcher and desktop icons
- Auto-reposition of off-screen windows on browser resize
- Mobile-aware behavior: windows maximize by default on small screens (`useMobile`)
- Toast notifications and global modal overlay
- Top-level `ErrorBoundary` with dev-mode detail view

### Authentication
- Login + signup UI with client-side validation (email format, password match, required fields)
- Hardcoded demo users (`user` and `admin` roles) gated by `AuthContext`
- 7-day session persistence via `localStorage`; expired sessions auto-cleared
- Loading splash while session check resolves

### Settings application
- Live theming: primary / secondary button styles, gradients, font colors, glass opacity & blur
- 50+ gradient background presets plus optional animated background
- Customizable window-control icons (close / minimize / maximize)
- Auto-save toggle; all settings persist to `localStorage` under `limedrop-settings`

### File Manager
- CRUD on virtual files (create, rename, delete, edit content)
- User-defined custom file types alongside default / document / image / video
- All data persisted to `localStorage`

### App Builder (two tiers)
**Basic (`AppBuilder.jsx`):** categorized component palette (input / processing / output), add-to-canvas workflow, icon picker.

**Enhanced (`EnhancedAppBuilder.jsx`):**
- Six component categories including an **AI & Intelligence** category and an **External Services** integration category
- Search + category filtering across the component library
- `SmartPropertyEditor` — dynamic property form generated from each component's metadata schema
- `ConnectionSystem` — visual wiring between components (workflow-style edges)
- `LivePreview` — real-time render of the app being built
- Three view modes: designer / preview / split
- Resizable panels (components / workflow / properties / preview)
- Grid snapping + magnetic drop zones via `useAdvancedDragDrop`
- Auto-save every 30s while unsaved changes are pending
- App metadata: id, name, description, icon, version, timestamps, author

### App Manager & Built-App Runner
- Install / uninstall user-created apps
- `BuiltAppRunner` executes saved app definitions inside a standard window so user-built apps feel first-class alongside built-ins

### Deployment scaffolding
- One-click-deploy configurations for Vercel, Render, and Heroku check in at the repo root

---

## Engineering highlights (portfolio talking points)

1. **Custom window manager from scratch** — implemented z-index focus, drag, edge/corner resize, and min/max state without pulling in a windowing library.
2. **Metadata-driven low-code builder** — a single component schema drives the palette, the property editor, the live preview, and the saved app definition; adding a new component type is a data change, not a code change across multiple files.
3. **Advanced drag-and-drop hook** — `useAdvancedDragDrop` supports grid snapping and magnetic drop zones with a configurable threshold, built directly on pointer events.
4. **Live CSS-variable theming** — settings changes propagate instantly to every component by updating root CSS variables rather than re-rendering a theme provider.
5. **Clean separation of concerns** — CSS Modules per component, Context for cross-cutting state, hooks for reusable behavior, and thin pages that only compose.
6. **~6.4k LOC of application code across 33 JSX/JS files** — non-trivial, self-contained SPA that runs with zero backend.

---

## Resume-ready bullet points

- Designed and shipped **Limedrop Soup OS**, a ~6,400-LOC React 18 / Vite SPA that simulates a full desktop environment in the browser — multi-window manager, dock, theming, notifications, and mock auth — using React Context and ~10 custom hooks in place of a global state library.
- Built a **low-code App Builder** with a metadata-driven component library, dynamic property editor, visual connection system, grid-snapping drag-and-drop, live preview, auto-save, and a runtime that executes user-created apps inside the shell.
- Implemented a **live theming engine** backed by CSS custom properties, exposing 50+ gradient presets, glassmorphism controls, and customizable window chrome that apply instantly without re-renders.
- Engineered a **custom window manager** from scratch: z-index focus stack, edge/corner resize, drag, min/max, mobile auto-maximize, and off-screen reflow on browser resize.
- Authored deployment manifests for Vercel, Render, and Heroku; structured the project with CSS Modules, an `ErrorBoundary`, and ESLint with React Hooks rules for production hygiene.

---

## Quick run

```bash
npm install
npm run dev       # Vite dev server on http://localhost:3000
npm run build     # Production bundle to dist/
npm run preview   # Serve the built bundle
npm run lint      # ESLint (--max-warnings 0)
```

Demo credentials are defined in `src/contexts/AuthContext.jsx` (e.g. `demo@limedrop.com` / `demo123`).

---

## Suggested positioning

- **Role framing:** "Front-end engineer / full-stack generalist" — strongest evidence is product-minded UI engineering, state architecture, and DX tooling.
- **Skills demonstrated:** React 18, hooks composition, Context API, Vite, CSS Modules, CSS variables, drag-and-drop UX, SPA routing, client-side persistence, responsive design, deployment configuration.
- **Good interview talking points:** the z-index focus model, why metadata-driven beats a `switch` statement for the builder, how CSS variables sidestep theme-provider re-renders, tradeoffs of `localStorage` vs. a real backend, and how you would migrate the mock auth in `AuthContext` to a real JWT/HTTP-only-cookie flow.
