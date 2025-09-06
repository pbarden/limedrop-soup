# Limedrop Web‑OS (Browser‑only)
Developer guide for maintaining and extending the project without altering current behavior or appearance.

---

## 1) Local run
1. Download the project files into a single folder. Keep `index.html`, `styles.css`, and the `js/` directory together.
2. Open the folder in your file explorer.
3. Double‑click `index.html` to launch in your default browser. If you prefer a specific browser, open it and use **File → Open File…** and select `index.html`.
4. Do **not** start a server. The app is self‑contained and designed to run from `file://` URLs.

**Tip:** If your browser blocks some features when using `file://` (rare), start a simple local server and open `http://localhost:8000`:
```bash
# Python 3 built‑in
python -m http.server 8000
```

---

## 2) Project layout
```
index.html
styles.css
js/
  core/
    event-bus.js
  ui/
    icon-picker.js
    modal-manager.js
    notification-manager.js
  windows/
    window-manager.js
  fs/
    file-system.js
  apps/
    app-runtime.js
    app-builder.js
    file-manager.js
    settings.js
    app-registry.js
  boot.js
original/
  script.js        (backup of the pre-split monolithic file)
split_manifest.json
```

The split preserves global scope and load order to avoid regressions.

---

## 3) Script load order
The following tags are placed **just before** `</body>` in this exact order. Maintain this order when you add or move files.

```html
<script src="js/core/event-bus.js"></script>
<script src="js/ui/icon-picker.js"></script>
<script src="js/ui/modal-manager.js"></script>
<script src="js/ui/notification-manager.js"></script>
<script src="js/windows/window-manager.js"></script>
<script src="js/fs/file-system.js"></script>
<script src="js/apps/app-runtime.js"></script>
<script src="js/apps/app-builder.js"></script>
<script src="js/apps/file-manager.js"></script>
<script src="js/apps/settings.js"></script>
<script src="js/apps/app-registry.js"></script>
<script src="js/boot.js"></script>
```

**Rule:** no `type="module"`. Each file defines globals (classes/singletons) relied upon by later files.

---

## 4) Boot sequence
1. All class definitions are loaded into the global scope by the ordered `<script>` tags.
2. `boot.js` runs last. It initializes managers, wires event listeners, and performs the same startup actions as the monolithic script’s “Initialize System” section.
3. The desktop UI and built‑in apps are available after `DOMContentLoaded` completes.

If you change startup behavior, edit **only** `js/boot.js` and keep the public API of managers/apps unchanged.

---

## 5) Managers and responsibilities
Open each file and read the constructor and public methods. Follow existing patterns.

- **Event Bus:** `js/core/event-bus.js`  
  Central pub/sub. Search for `emit`/`on`/`off` to locate event names and handlers.

- **Modal / Notification Managers:** `js/ui/modal-manager.js`, `js/ui/notification-manager.js`  
  Centralized UI helpers for blocking dialogs, prompts, and transient toasts.

- **Window Manager:** `js/windows/window-manager.js`  
  Creates, focuses, minimizes, maximizes, and z‑orders windows. All app windows should be created through this manager.

- **File System:** `js/fs/file-system.js`  
  Handles JSON persistence, import/export helpers, and any pseudo‑type validation. To understand expected shapes, search for its method calls inside `js/apps/file-manager.js` and other apps.

- **App Runtime / Builder / Registry / Built‑in Apps:** `js/apps/*.js`  
  App execution (runtime), authoring (builder), system apps (file manager, settings), and registration (registry).

**Do not** rename classes or change method signatures without updating the call sites across the repo.

---

## 6) Add a new App (without breaking anything)
Follow the existing “small app” pattern. Do not introduce modules or bundlers.

1. **Duplicate an existing app** file (e.g., copy `js/apps/file-manager.js` to `js/apps/my-tool.js`). Keep the class pattern and public methods intact.
2. **Rename the class** inside your new file to a unique name (e.g., `class MyTool { ... }`). Keep it global (no IIFE that hides it).
3. **Register the app** by mirroring an existing entry in `js/apps/app-registry.js`. Copy an existing registration block and change:
   - `id`: stable string (no spaces)
   - `name`: label shown in the UI
   - `icon`: match one that your icon picker supports, or add a new icon asset if applicable
   - `create` or constructor reference: point it to your new class
4. **Load order:** add a new `<script>` tag for your app **before** `js/apps/app-registry.js` and **after** its dependencies. Example (insert near other app files):
   ```html
   <script src="js/apps/my-tool.js"></script>
   ```
5. **Window creation:** when your app needs a window, call the Window Manager following the pattern used by other apps. Reuse the same data‑attributes and classes to inherit existing styles/behaviors.
6. **Persistence:** use File System helpers exactly like other apps. Copy the import/export code paths and keep the same JSON structure keys if you want compatibility with the File Manager.

**Test:** launch, open the app from wherever it is exposed (dock/menu), create a window, interact, save/load/import/export if applicable.

---

## 7) Add or modify a Manager
1. Create your file under the correct namespace folder, e.g., `js/ui/tooltip-manager.js`.
2. Implement a **single global class** (e.g., `class TooltipManager { ... }`). Keep public API minimal and consistent.
3. Insert a `<script>` tag for this manager **before** any app that uses it and **before** `boot.js`.
4. If it must be initialized at startup, add the instantiation in `js/boot.js` and wire it into the rest of the system via the event bus or direct references (mirror how other managers are initialized).

---

## 8) File System pseudo‑types
If you enforce pseudo‑types on JSON objects (e.g., `type: "canvas" | "chart" | "rich-text"`):
1. Define or extend the type validation logic inside `js/fs/file-system.js` (follow current validator helpers; do not change call signatures).
2. Ensure import/export functions read and write `{ type, name, updatedAt, data }` consistently (match existing keys used by built‑in apps).
3. When introducing a new pseudo‑type, update any UI that filters by type (e.g., File Manager). Copy an existing filter path and adjust the string literal.

---

## 9) Coding rules for this project
- **No modules.** Use plain `<script>` tags. Keep constructors/classes global.
- **No bundlers.** Do not introduce Webpack, Vite, etc.
- **Script order is contract.** Changing the order causes runtime errors. If you add a dependency, move its tag **above** the consumer.
- **CSS is single‑file.** Add styles to `styles.css`. Reuse existing class names/data‑attributes so you do not alter the UI.
- **Do not rename DOM data‑attributes** used by managers or apps (`data-*` selectors are part of the runtime contract).

---

## 10) Manual regression checklist (run each time you change JS order)
1. Launch `index.html`.
2. Open and move multiple windows; verify focus stacking, minimize, maximize, and restore.
3. Open the App Builder; verify creation and editing flows render inside a managed window and do not overlap other windows incorrectly.
4. Open the File Manager; verify list/grid views, open/import/export actions.
5. Trigger modals and notifications; verify they appear above windows and dismiss correctly.
6. Resize the browser; verify windows remain usable and responsive.
7. Refresh; confirm state that should persist still persists (if applicable).

Record failures with the exact steps and the console error text.

---

## 11) Troubleshooting
**Error: `Identifier 'XYZ' has already been declared`**  
Cause: the same class or function loaded twice, or two files define the same identifier.  
Fix:
- Search all `<script>` tags for duplicates.
- Ensure you did not keep `script.js` alongside the split files in the live page.
- Check for accidental copy of a class into two different files under different names.

**Error: `Cannot access 'foo' before initialization`**  
Cause: using a `const`/`let`/class before the defining `<script>` tag.  
Fix: move the dependency’s `<script>` tag **above** the consumer. Do not change to `var` to hide the issue.

**Error: `root is not defined` or `s is not defined`**  
Cause: a function depends on a variable passed by the caller in other files.  
Fix: trace the call chain. Compare with the working app’s call site. Ensure you pass the same arguments and that the function signature matches the existing pattern.

**Overlapping windows or z‑index issues**  
Cause: bypassing Window Manager or altering required classes/data‑attributes.  
Fix: create windows **only** through Window Manager APIs and reuse the same markup structure as existing windows.

---

## 12) Adding images, icons, and assets
- If you introduce new icons for apps, keep them where the icon picker expects them or expand the picker’s lookup in `js/ui/icon-picker.js`.
- Do not change existing icon names that other apps reference.

---

## 13) Versioning and packaging
1. Keep the original monolithic `original/script.js` for reference.
2. When you change the split files, rebuild a distribution zip containing:
   - `index.html`
   - `styles.css`
   - `js/` (all subfolders and files)
   - `original/script.js` (unchanged)
   - Optionally: `README.md`
3. Test the zip by extracting it to a clean folder and launching `index.html`.

---

## 14) Safe patterns to copy
- Copy a small app file and modify class name + registry entry.
- Copy a File System import/export handler and change only the JSON keys you must change.
- Copy a Window Manager window template and only replace the inner content.

Keep selectors, data attributes, and method names identical unless you also update every usage.
