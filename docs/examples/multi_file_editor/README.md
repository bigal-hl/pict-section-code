# Multi-File Editor — Sidebar-Tabbed Workspace on One Editor Instance

<!-- docuserve:example-launch:start -->
> **[&#9654; Launch the live app](examples/multi%5Ffile%5Feditor/index.html)** — runs in your browser, opens in a new tab.
<!-- docuserve:example-launch:end -->

A working multi-file code workspace: a left-rail file sidebar, a current-file
toolbar with a language badge, and a single `PictSectionCode` editor that
swaps between files. Adding a file, deleting one, renaming the active file's
language by extension — all without a per-file editor instance, all driven
by one `AppData.Files` map and one shared view.

This is the reference example for any feature that needs **multiple
documents on one editor** — a snippet library, a small in-app IDE, a query
manager, a configuration multi-pane. The pattern: keep the editor singleton,
keep documents in `AppData`, and use the framework's `setCode()` /
`setLanguage()` / `getCode()` to move content in and out of the singleton on
selection.

## What it demonstrates

| Capability | Where you see it |
|------------|------------------|
| Single editor instance, many documents | One `EditorView`; `AppData.Files` holds the content per filename |
| Save-on-switch lifecycle | `loadFile()` calls `saveCurrentFile()` before pointing at the new file |
| Filename-driven language detection | `detectLanguage()` maps `.js`, `.json`, `.html`, `.css`, `.sql` to highlighter keys |
| Runtime `setLanguage()` per switch | The same view re-binds its highlighter to match the loaded file |
| New-file workflow with per-language seed | `createNewFile()` writes a sensible starter snippet by extension |
| Delete-file workflow with active-file fallback | `deleteFile()` reloads the first remaining file when the active one is removed |
| Persistent file map in `AppData` | `DefaultAppData.Files` seeds the workspace; reads/writes flow through it |
| First-load guard against clobbering data | `_fileLoaded` flag prevents `saveCurrentFile()` from running before any file is opened |
| Inline sidebar rendering | `renderSidebar()` builds the file list from `AppData.Files` on every change |
| Toolbar reflects the current file | `updateToolbar()` writes filename + language badge after every switch |

## Key files

- `MultiFileEditor-Example-Application.js` — the application: one
  view configuration, plus the workspace logic (`loadFile`,
  `saveCurrentFile`, `createNewFile`, `deleteFile`, `renderSidebar`,
  `updateToolbar`, `updateSidebarActiveState`, `detectLanguage`).
- `html/index.html` — sidebar markup (`#FileSidebarList`, a "+ New"
  button), editor toolbar (`#CurrentFileName`, `#LanguageBadge`,
  a Save button), and the `#EditorContainer` target.
- `html/codejar.js` — the IIFE-wrapped CodeJar build; the editor
  view finds it on first render.

## The data model

The seed lives entirely in `DefaultAppData`:

```js
"DefaultAppData":
{
    "CurrentFile": "app.js",
    "CurrentFileContent": "",
    "Files":
    {
        "app.js":       { "Name": "app.js",       "Content": "..." },
        "config.json":  { "Name": "config.json",  "Content": "..." },
        "styles.css":   { "Name": "styles.css",   "Content": "..." },
        "index.html":   { "Name": "index.html",   "Content": "..." },
        "schema.sql":   { "Name": "schema.sql",   "Content": "..." }
    }
}
```

Three top-level slots:

- `AppData.Files` — the workspace map, keyed by filename. Each entry is
  `{ Name, Content }`. The Name is preserved for display (it could
  diverge from the key in a future rename feature; today they always
  match).
- `AppData.CurrentFile` — the filename of the currently open document.
- `AppData.CurrentFileContent` — the slot the editor view's
  `CodeDataAddress` points at. The application moves content in and
  out of this slot as the user switches files.

The editor itself binds to `CurrentFileContent`, not to a per-file
address. That's the trick that lets one view serve many files: the
"current document" is a sliding window over `Files`, and the editor
always points at the window.

## The view configuration

```js
const _EditorViewConfig = (
{
    "ViewIdentifier": "EditorView",
    "TargetElementAddress": "#EditorContainer",
    "CodeDataAddress": "AppData.CurrentFileContent",
    "Language": "javascript",
    "LineNumbers": true
});
```

`CodeDataAddress` is the active-document slot. `Language` is the
initial highlighter, swapped at every file switch.

---

## Feature 1 — One editor, many documents

The application registers a single `EditorView`:

```js
this.pict.addView('EditorView', _EditorViewConfig, ExampleMultiFileEditorView);
```

There is never a second editor. Every file in `AppData.Files` is
edited *through* the singleton — `loadFile()` and `saveCurrentFile()`
move text in and out:

```js
loadFile(pFileKey)
{
    let tmpFiles = this.pict.AppData.Files;
    let tmpView = this.pict.views.EditorView;

    if (!tmpFiles || !tmpFiles[pFileKey] || !tmpView)
    {
        return;
    }

    // Save the current file before switching
    this.saveCurrentFile();

    // Update current file pointer
    this.pict.AppData.CurrentFile = pFileKey;

    // Copy file content to the editor data address
    let tmpContent = tmpFiles[pFileKey].Content || '';
    this.pict.AppData.CurrentFileContent = tmpContent;

    // Detect language and update the editor
    let tmpLanguage = this.detectLanguage(pFileKey);
    tmpView.setLanguage(tmpLanguage);
    tmpView.setCode(tmpContent);

    // Mark that a file has been loaded (enables save on next switch)
    this._fileLoaded = true;

    // Update sidebar active state and toolbar
    this.updateSidebarActiveState();
    this.updateToolbar(pFileKey, tmpLanguage);
}
```

The flow is symmetric — every switch saves, every save updates the
map, every load updates the editor. The framework's
`setCode()` / `setLanguage()` are the only editor-touching calls;
everything else is host-managed state under `AppData`.

## Feature 2 — Save-on-switch

`loadFile()`'s first real act is to call `saveCurrentFile()`:

```js
saveCurrentFile()
{
    // Don't save if no file has been loaded into the editor yet
    if (!this._fileLoaded)
    {
        return;
    }

    let tmpCurrentFile = this.pict.AppData.CurrentFile;
    let tmpView = this.pict.views.EditorView;

    if (!tmpCurrentFile || !tmpView)
    {
        return;
    }

    let tmpFiles = this.pict.AppData.Files;
    if (tmpFiles && tmpFiles[tmpCurrentFile])
    {
        tmpFiles[tmpCurrentFile].Content = tmpView.getCode();
    }
}
```

The current editor contents (`tmpView.getCode()`) are written into the
*previous* file's slot before the new file is loaded. The "Save"
button in the toolbar calls this directly so a user who's worried
about losing work can flush without switching:

```html
<button type="button" onclick="saveFile()">Save</button>
```

```js
function saveFile()
{
    if (typeof(_Pict) !== 'undefined' && _Pict.PictApplication)
    {
        _Pict.PictApplication.saveCurrentFile();
    }
}
```

In a real application this is where you'd also push to a server, write
to localStorage, or fire any other persistence step. The in-memory
write is the foundation; the rest layers on.

## Feature 3 — The `_fileLoaded` guard

There is a subtle bootstrap problem: `saveCurrentFile()` reads
`tmpView.getCode()` and writes it back into
`AppData.Files[AppData.CurrentFile].Content`. On the very first call to
`loadFile()` — which happens at `onAfterInitialize()` for the seed file
— the editor doesn't yet contain the file's content, because we're
about to load it. If `saveCurrentFile()` ran unguarded, it would
overwrite `app.js`'s seed content with whatever the editor was
initialized with (typically empty).

The fix is a single instance flag:

```js
onAfterInitialize()
{
    super.onAfterInitialize();

    // Track whether a file has been loaded into the editor yet
    this._fileLoaded = false;

    let tmpView = this.pict.views.EditorView;
    if (tmpView)
    {
        tmpView.render();
    }

    this.renderSidebar();
    this.loadFile('app.js');
}
```

`_fileLoaded` starts false. `saveCurrentFile()` short-circuits while
the flag is false; `loadFile()` sets it true after the first successful
load. From the second `loadFile()` call onward, save-on-switch runs
normally.

This pattern — "the first load is special" — is broadly applicable to
any singleton-view-many-document workspace. Without the flag, the seed
state of the workspace is irreversibly clobbered the moment the user
opens any other file.

## Feature 4 — Filename-driven language detection

The sidebar shows files by name; the editor needs to know which
highlighter to use. `detectLanguage()` maps extensions to the
identifiers `pict-section-code` supports:

```js
detectLanguage(pFilename)
{
    if (typeof pFilename !== 'string')
    {
        return 'javascript';
    }

    let tmpExtension = pFilename.split('.').pop().toLowerCase();

    switch (tmpExtension)
    {
        case 'js':              return 'javascript';
        case 'json':            return 'json';
        case 'html':
        case 'htm':             return 'html';
        case 'css':             return 'css';
        case 'sql':             return 'sql';
        default:                return 'javascript';
    }
}
```

The five branches mirror the five entries in
`Pict-Code-Highlighter.js`'s `_LanguageDefinitions` map plus the
built-in aliases (`js` → `javascript`, `htm` → `html`). Adding support
for a new highlighter language would add one branch here and one entry
to the highlighter definitions; nothing else changes.

`loadFile()` calls `detectLanguage()` on every switch and passes the
result to the view's `setLanguage()`, which destroys and recreates the
CodeJar instance with the new highlight function (the existing code is
preserved across the swap; in our case we then call `setCode()` with
the loaded file's content immediately after).

## Feature 5 — New-file workflow with per-language seeds

The sidebar's "+ New" button prompts for a filename and calls
`createNewFile()`:

```js
function newFile()
{
    var tmpFilename = prompt('Enter a filename (e.g., utils.js):');
    if (tmpFilename && tmpFilename.trim())
    {
        if (typeof(_Pict) !== 'undefined' && _Pict.PictApplication)
        {
            _Pict.PictApplication.createNewFile(tmpFilename.trim());
        }
    }
}
```

`createNewFile()` is the place where the extension picks both the
highlighter *and* a sensible starter snippet:

```js
createNewFile(pFilename)
{
    if (!pFilename || typeof pFilename !== 'string') return;

    let tmpFiles = this.pict.AppData.Files;
    if (!tmpFiles)
    {
        this.pict.AppData.Files = {};
        tmpFiles = this.pict.AppData.Files;
    }

    if (tmpFiles[pFilename])
    {
        // File already exists, just load it
        this.loadFile(pFilename);
        return;
    }

    let tmpLanguage = this.detectLanguage(pFilename);
    let tmpDefaultContent = '// ' + pFilename + '\n';
    if (tmpLanguage === 'json')
    {
        tmpDefaultContent = '{\n\t\n}\n';
    }
    else if (tmpLanguage === 'html')
    {
        tmpDefaultContent = '<!DOCTYPE html>\n<html>\n<head>\n\t<title></title>\n</head>\n<body>\n\t\n</body>\n</html>\n';
    }
    else if (tmpLanguage === 'css')
    {
        tmpDefaultContent = '/* ' + pFilename + ' */\n';
    }
    else if (tmpLanguage === 'sql')
    {
        tmpDefaultContent = '-- ' + pFilename + '\n';
    }

    tmpFiles[pFilename] = { "Name": pFilename, "Content": tmpDefaultContent };

    this.renderSidebar();
    this.loadFile(pFilename);
}
```

A new `.html` file opens with a usable HTML skeleton; a `.json` file
opens with an empty object; a `.css` file gets the comment-style
"about" header. Re-creating an existing filename is a no-op load
(the file isn't overwritten). After the new entry is added, the
sidebar re-renders and `loadFile()` is called so the editor opens
on the new file.

## Feature 6 — Delete-file workflow with active-file fallback

```js
deleteFile(pFileKey)
{
    let tmpFiles = this.pict.AppData.Files;
    if (!tmpFiles || !tmpFiles[pFileKey]) return;

    delete tmpFiles[pFileKey];

    // If we deleted the current file, load the first available
    if (this.pict.AppData.CurrentFile === pFileKey)
    {
        let tmpKeys = Object.keys(tmpFiles);
        if (tmpKeys.length > 0)
        {
            this.renderSidebar();
            this.loadFile(tmpKeys[0]);
        }
        else
        {
            this.pict.AppData.CurrentFile = '';
            this.pict.AppData.CurrentFileContent = '';
            this.pict.views.EditorView.setCode('');
            this.renderSidebar();
            this.updateToolbar('', 'javascript');
        }
    }
    else
    {
        this.renderSidebar();
    }
}
```

Three branches:

1. The deleted file is not the active one — just re-render the
   sidebar so the entry disappears.
2. The deleted file is the active one *and* others remain — load the
   first remaining filename. The save-on-switch in `loadFile()` is a
   no-op here because the file we'd save *to* no longer exists, but
   the `_fileLoaded` flag is already true, so we'd write into a
   freshly-`delete`d key — harmless in JavaScript but worth noting.
3. The deleted file is the last one — clear the editor, blank the
   toolbar, and leave `CurrentFile` empty until the user creates
   another via "+ New".

The delete button is wired into each sidebar entry's HTML and stops
event propagation so it doesn't also fire the entry's `onclick`
(which would `loadFile()` the file we're about to delete):

```js
tmpHTML += '<button class="file-delete" onclick="event.stopPropagation(); deleteFile(\'' + tmpKey.replace(/'/g, "\\'") + '\')" title="Delete">&times;</button>';
```

## Feature 7 — The sidebar render loop

`renderSidebar()` rebuilds the file list from `AppData.Files` every
time anything changes (file added, file removed, file activated):

```js
renderSidebar()
{
    let tmpSidebar = document.getElementById('FileSidebarList');
    if (!tmpSidebar) return;

    let tmpFiles = this.pict.AppData.Files || {};
    let tmpCurrentFile = this.pict.AppData.CurrentFile || '';
    let tmpHTML = '';

    let tmpKeys = Object.keys(tmpFiles);
    for (let i = 0; i < tmpKeys.length; i++)
    {
        let tmpKey = tmpKeys[i];
        let tmpFile = tmpFiles[tmpKey];
        let tmpActiveClass = (tmpKey === tmpCurrentFile) ? ' active' : '';
        let tmpExtension = tmpKey.split('.').pop().toLowerCase();

        tmpHTML += '<div class="file-entry' + tmpActiveClass + '" onclick="loadFile(\'' + tmpKey.replace(/'/g, "\\'") + '\')">';
        tmpHTML += '<span class="file-name">' + tmpFile.Name + '</span>';
        tmpHTML += '<span class="file-ext">.' + tmpExtension + '</span>';
        tmpHTML += '<button class="file-delete" onclick="event.stopPropagation(); deleteFile(\'' + tmpKey.replace(/'/g, "\\'") + '\')" title="Delete">&times;</button>';
        tmpHTML += '</div>';
    }

    tmpSidebar.innerHTML = tmpHTML;
}
```

Single source of truth: `AppData.Files`. The rendered HTML is a
function of the map. Active-state is computed from `CurrentFile` — no
`active` class lives in HTML between renders; it's re-stamped on every
pass.

Note the inline `onclick` handlers — they route through the
top-level `loadFile(pKey)` and `deleteFile(pKey)` shims in the HTML,
which in turn call into `_Pict.PictApplication`. This is the right
shape for HTML that lives outside the framework's template engine:
each row carries its own handler so re-renders never break wiring.
For an inside-the-framework version of this, the row HTML would live
in a Pict template registered on a view, but for an example app
that's structured around vanilla HTML the inline route is the
cleanest.

## Feature 8 — Toolbar reflecting the active file

`updateToolbar()` writes the current filename and language into the
toolbar header at the top of the editor pane:

```js
updateToolbar(pFilename, pLanguage)
{
    let tmpFileNameEl = document.getElementById('CurrentFileName');
    let tmpLanguageBadge = document.getElementById('LanguageBadge');

    if (tmpFileNameEl)
    {
        tmpFileNameEl.textContent = pFilename || 'No file selected';
    }
    if (tmpLanguageBadge)
    {
        tmpLanguageBadge.textContent = pLanguage || '';
    }
}
```

The HTML:

```html
<div class="editor-toolbar">
    <span id="CurrentFileName" class="current-file">No file selected</span>
    <span id="LanguageBadge" class="language-badge"></span>
    <span class="spacer"></span>
    <button type="button" onclick="saveFile()">Save</button>
</div>
```

The badge styling colour-matches the active file's chrome — the
language identifier is the same string that drove the highlighter,
so the user sees `javascript` / `json` / `html` / `css` / `sql`
flip in lockstep with the highlighter colors below.

## Running the example

```bash
cd example_applications/multi_file_editor
npm install
npm run build
# then open dist/index.html in a browser
# (or `cd dist && python3 -m http.server 8000` and visit localhost:8000)
```

The workspace opens with five seed files in the sidebar — `app.js`
selected. Click another to switch; type to edit; click "+ New" to
add; click the × on any sidebar entry to delete.

## Things to try in the running app

- **Switch files** — click `config.json`, type, switch to `styles.css`,
  switch back. The JSON edits persist; the language badge and the
  syntax colors changed across each switch.
- **Inspect `AppData`** — open devtools and look at
  `_Pict.AppData.Files['config.json'].Content` after editing. The
  content is up to date because the save-on-switch ran when you
  moved away.
- **Create a new file** — click "+ New", enter `notes.md`. The
  extension isn't in the language map, so the editor uses
  `javascript` as a fallback. Enter `utils.js` instead and watch the
  language badge flip to `javascript`.
- **Create a JSON file** — `data.json` opens with `{ }` seeded;
  start filling in keys, switch away, switch back. State persists.
- **Delete the active file** — click × on `app.js`. The first
  remaining file is loaded; the editor shows its content; the
  toolbar updates.
- **Delete the last file** — keep clicking × until the sidebar is
  empty. The editor blanks; the toolbar reads "No file selected"; the
  language badge clears.
- **Save explicitly** — open the toolbar Save button. With the
  `_fileLoaded` flag true, the current editor content is flushed
  into `AppData.Files[CurrentFile].Content`. Reload the page (the
  in-memory state is lost — for persistence to localStorage or a
  server, this is where you'd add the write).
- **Bracket pairing across languages** — start a fresh `.json` file,
  type `{` and Enter. The auto-pair + indent-on-open-brace defaults
  apply across every language because they're CodeJar-level options,
  not language-specific.

## Takeaways

1. **One editor, N files.** The singleton-view-many-documents pattern
   keeps the CodeJar/highlighter overhead at a single instance,
   regardless of how many files the workspace holds. Files are data
   in `AppData`; the editor is a sliding window.
2. **Save-on-switch is the contract.** `loadFile()` calls
   `saveCurrentFile()` first; that's what makes the switch
   non-destructive. Without it, every switch would lose unsaved
   edits.
3. **The first-load guard matters.** `_fileLoaded` is a one-line
   pattern that prevents the seed state from being clobbered by an
   empty editor on bootstrap. Singleton-view-many-documents always
   needs some version of this flag.
4. **Filename → language is a lookup.** `detectLanguage()` is a
   trivial switch statement; combine it with the editor view's
   `setLanguage()` and you get per-file highlighting without any
   per-file editor configuration.
5. **The framework's editor API stays small.** `setCode()`,
   `setLanguage()`, `getCode()`, `setReadOnly()` — that's the entire
   surface needed to host a multi-document workspace. The view
   doesn't know about files; it knows about strings and a language
   identifier.

## Related documentation

- [Getting Started](../../getting-started.md) — single-view setup that this example extends
- [Configuration](../../configuration.md) — `CodeDataAddress`, `Language`, `LineNumbers`
- [API Reference](../../api.md) — `setCode`, `setLanguage`, `getCode`, `setReadOnly`, `onCodeChange`
- [Syntax Highlighting](../../highlighting.md) — supported language identifiers used by `detectLanguage()`
