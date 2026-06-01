# Code Editor - Single-File Editable Surface with AppData Binding

<!-- docuserve:example-launch:start -->
> **[Launch the live app](examples/code%5Feditor/index.html)** - runs in your browser, opens in a new tab.
<!-- docuserve:example-launch:end -->

A minimal **editable** code editor that demonstrates the live half of
`pict-section-code` - two-way data binding to a Pict address, runtime
language switching, on-demand read-only toggling, and a `getCode()`
output panel. The application file is a single subclass and a single
view configuration; the rest is the framework.

This is the reference example for any feature that needs to capture
code from the user - a snippet field on a form, a query editor in an
admin panel, a configuration scratchpad - and surface the captured
text to the rest of the application.

## What it demonstrates

| Capability | Where you see it |
|------------|------------------|
| Editable mode | No `ReadOnly` option set - defaults to `false`, `contenteditable="true"` |
| `CodeDataAddress` two-way binding | `CodeDataAddress: "AppData.SourceCode"` - every keystroke writes back |
| `DefaultAppData` seeding | The application's `DefaultAppData.SourceCode` is the initial content |
| `setLanguage()` at runtime | Language dropdown calls `_Pict.views.ExampleCodeEditorView.setLanguage(value)` |
| `setReadOnly()` at runtime | Toolbar button flips edit-mode without re-instantiating the editor |
| `getCode()` for snapshots | "Get Code" button reads the current content via `tmpView.getCode()` |
| Line numbers on a live editor | `LineNumbers: true` - gutter tracks scroll, resize, and theme changes |
| Bracket / brace auto-pairing | Defaults: `AddClosing: true`, `IndentOn: /[({[]$/`, `MoveToNewLine: /^[)}\]]/` |
| Tab inside editor inserts a tab | `Tab: "\t"`, `CatchTab: true` - focus stays in the editor |
| Single-file content lifecycle | One `AppData` slot, one render, one editor instance |

## Key files

- `CodeEditor-Example-Application.js` - the entire app: one subclass, one
  view configuration, one `render()` call. The `DefaultAppData` carries
  the initial snippet so the editor opens with something to look at.
- `html/index.html` - the editor's host page. Includes a language
  dropdown, a "Get Code" button that snapshots the editor content into
  a panel, and a "Toggle Read-Only" button.
- `html/codejar.js` - the IIFE-wrapped CodeJar build; `pict-section-code`
  finds it automatically at first render.

## The view configuration

The whole behaviour of the editor is encoded in five lines:

```js
const _ExampleCodeEditorConfiguration = (
{
    "ViewIdentifier": "ExampleCodeEditor",
    "TargetElementAddress": "#CodeEditorContainer",
    "CodeDataAddress": "AppData.SourceCode",
    "Language": "javascript",
    "LineNumbers": true
});
```

`TargetElementAddress` is the empty `<div>` in the HTML; `CodeDataAddress`
is the AppData slot the editor reads from and writes to; `Language`
selects the highlighter rule set; `LineNumbers` switches the gutter on.
Every other knob defaults to a sensible editing-friendly value.

---

## Feature 1 - Two-way data binding via `CodeDataAddress`

`CodeDataAddress` is the central feature of the editable mode. When it
is set, the editor reads the address on init and writes back on every
edit - no host code required.

### Read at startup

`_resolveCodeContent()` resolves the address through the Pict manifest:

```js
_resolveCodeContent()
{
    if (this.options.CodeDataAddress)
    {
        const tmpAddressSpace =
        {
            Fable: this.fable, Pict: this.fable,
            AppData: this.AppData, Bundle: this.Bundle, Options: this.options
        };
        let tmpAddressedData = this.fable.manifest.getValueByHash(
            tmpAddressSpace, this.options.CodeDataAddress);
        if (typeof (tmpAddressedData) === 'string') return tmpAddressedData;
    }
    return this.options.DefaultCode || '';
}
```

For this example, `AppData.SourceCode` is pre-populated by the
application's `DefaultAppData`:

```js
"DefaultAppData":
{
    "SourceCode": "// Welcome to the Pict Code Editor\n\nconst libFable = require('fable');\n\nclass MyService extends libFable.ServiceProviderBase\n{\n\tconstructor(pFable, pOptions, pServiceHash)\n\t{\n\t\tsuper(pFable, pOptions, pServiceHash);\n\t\tthis.serviceType = 'MyService';\n\t}\n\n\tdoSomething(pInput)\n\t{\n\t\tlet tmpResult = pInput * 2;\n\t\tthis.log.info(`Result: ${tmpResult}`);\n\t\treturn tmpResult;\n\t}\n}\n\nmodule.exports = MyService;\n"
}
```

...so the editor opens with that snippet already loaded.

### Write on every keystroke

CodeJar's `onUpdate` callback runs after every edit. `pict-section-code`
wires it to update the line-number gutter and call `onCodeChange()`:

```js
this.codeJar.onUpdate((pCode) =>
{
    this._updateLineNumbers();
    this.onCodeChange(pCode);
});
```

...and the default `onCodeChange()` writes back through the manifest:

```js
onCodeChange(pCode)
{
    if (this.options.CodeDataAddress)
    {
        const tmpAddressSpace = { ... };
        this.fable.manifest.setValueByHash(
            tmpAddressSpace, this.options.CodeDataAddress, pCode);
    }
}
```

By the time the user has finished typing a character, `AppData.SourceCode`
already holds the new value. Any other view or solver that reads from
that address sees the change. Subclass `onCodeChange()` if you want to
react to edits - validate, auto-save, fire a debounced server sync -
without losing the framework's write-through.

## Feature 2 - Runtime language switching via `setLanguage()`

The HTML toolbar exposes a `<select>` with five options. Its `onchange`
handler routes through a tiny global function that calls the view's
`setLanguage()`:

```html
<select onchange="changeLanguage(this.value)">
    <option value="javascript">JavaScript</option>
    <option value="json">JSON</option>
    <option value="html">HTML</option>
    <option value="css">CSS</option>
    <option value="sql">SQL</option>
</select>
```

```js
function changeLanguage(pLanguage)
{
    if (typeof(_Pict) !== 'undefined' && _Pict.views.ExampleCodeEditorView)
    {
        _Pict.views.ExampleCodeEditorView.setLanguage(pLanguage);
    }
}
```

`setLanguage()` rebuilds the highlighter, destroys and re-creates the
CodeJar instance with the new function, and replays the existing code:

```js
setLanguage(pLanguage)
{
    this._language = pLanguage;
    this._highlightFunction = libCreateHighlighter(pLanguage);

    if (this._editorElement)
    {
        this._editorElement.className = 'pict-code-editor language-' + pLanguage;
        // ...
    }

    if (this.codeJar)
    {
        let tmpCode = this.codeJar.toString();
        this.codeJar.destroy();
        this.codeJar = this._codeJarPrototype(this._editorElement, this._highlightFunction, ...);
        this._resetEditorWrapStyles();
        this.codeJar.updateCode(tmpCode);
        this.codeJar.onUpdate((pCode) => { this._updateLineNumbers(); this.onCodeChange(pCode); });
    }
}
```

The text content is preserved across the swap - only the colors change.
That's deliberate: switching the language is something a user might do
to compare highlighters or to handle a paste from a different syntax,
not a destructive action.

## Feature 3 - Runtime read-only toggle via `setReadOnly()`

The "Toggle Read-Only" button flips between editable and locked:

```js
function toggleReadOnly()
{
    if (typeof(_Pict) !== 'undefined' && _Pict.views.ExampleCodeEditorView)
    {
        var tmpView = _Pict.views.ExampleCodeEditorView;
        tmpView.setReadOnly(!tmpView.options.ReadOnly);
    }
}
```

The view method simply updates `options.ReadOnly` and sets the
`contenteditable` attribute on the editor:

```js
setReadOnly(pReadOnly)
{
    this.options.ReadOnly = pReadOnly;
    if (this._editorElement)
    {
        this._editorElement.setAttribute('contenteditable', pReadOnly ? 'false' : 'true');
    }
}
```

The CodeJar instance and the line-number gutter both keep working - only
the browser's input handling changes. This is the same mechanism the
Code Display example uses to render its five blocks as locked from the
start; here we're using it dynamically.

## Feature 4 - Reading the current content with `getCode()`

The "Get Code" button captures the editor's contents into a separate
output panel:

```js
function getCode()
{
    if (typeof(_Pict) !== 'undefined' && _Pict.views.ExampleCodeEditorView)
    {
        var tmpCode = _Pict.views.ExampleCodeEditorView.getCode();
        var tmpOutputWrap = document.getElementById('CodeOutputWrap');
        var tmpOutput = document.getElementById('CodeOutput');
        tmpOutputWrap.style.display = 'block';
        tmpOutput.textContent = tmpCode;
    }
}
```

`getCode()` is the trivial wrapper:

```js
getCode()
{
    if (!this.codeJar)
    {
        this.log.warn('PICT-Code getCode called before editor initialized.');
        return '';
    }
    return this.codeJar.toString();
}
```

Note that with the `CodeDataAddress` binding active, `AppData.SourceCode`
is *already* equal to `getCode()` - the address is in sync with the
editor at all times. `getCode()` is the right call when you want a
snapshot string that doesn't depend on the host knowing the
data-address convention; the address read is the right call when you
already have a manifest in hand.

## Feature 5 - Editor ergonomics: tabs, brackets, indent

`pict-section-code` ships with editor defaults that match how Retold
itself is authored - tab character, auto-pair on `(`, `{`, `[`, and a
hanging close-brace pattern:

```js
// From Pict-Section-Code-DefaultConfiguration.js
"Tab": "\t",
"IndentOn": /[({[]$/,
"MoveToNewLine": /^[)}\]]/,
"AddClosing": true,
"CatchTab": true
```

`onAfterInitialRender()` forwards each of these into the CodeJar
options object before instantiation:

```js
let tmpCodeJarOptions = {};
if (this.options.Tab)           tmpCodeJarOptions.tab           = this.options.Tab;
if (this.options.IndentOn)      tmpCodeJarOptions.indentOn      = this.options.IndentOn;
if (this.options.MoveToNewLine) tmpCodeJarOptions.moveToNewLine = this.options.MoveToNewLine;
if (typeof (this.options.AddClosing) !== 'undefined') tmpCodeJarOptions.addClosing = this.options.AddClosing;
if (typeof (this.options.CatchTab)   !== 'undefined') tmpCodeJarOptions.catchTab   = this.options.CatchTab;
```

The example doesn't override any of them. Type `(` and the editor adds
`)` and parks the caret between them; press Enter after `{` and the
next line is indented with the same leading whitespace; press Tab and
you get a literal tab character (not focus movement to the next
control). Subclasses can use the `customConfigureEditorOptions(pOptions)`
hook to mutate the options block right before CodeJar is built - that's
where you'd plug in two-space indent, or disable the tab capture, or
turn off bracket auto-pairing for a Markdown editor.

## Feature 6 - Aligned line-number gutter

The editor in this example carries `LineNumbers: true`. The gutter
ships with no `line-height`, `padding-top`, `padding-bottom`, or
`font-family` declarations in CSS - those are stamped at runtime from
the editor's computed styles so they match exactly:

```js
_syncGutterMetrics()
{
    // ...
    let tmpEditorStyle = window.getComputedStyle(this._editorElement);
    let tmpLineHeight = tmpEditorStyle.lineHeight;

    if (tmpLineHeight && tmpLineHeight !== 'normal')
    {
        this._lineNumbersElement.style.lineHeight = tmpLineHeight;
    }

    if (tmpEditorStyle.paddingTop)
    {
        this._lineNumbersElement.style.paddingTop = tmpEditorStyle.paddingTop;
    }
    // ...
}
```

A `ResizeObserver` and a `MutationObserver` on the editor re-run the
sync whenever the editor's size or attributes change - so swapping the
theme, adjusting the scale, or changing the font-family stays aligned
without per-app code. Defense-in-depth: the gutter is also re-stamped
every time the line-count changes (every keystroke that adds or
removes a newline), so newly added rows can never start at the wrong
metrics.

When the gutter scrolls with the code, it's via a single
`transform: translateY(...)` on the gutter element synced to the
editor's `scrollTop` - compositor-only, no per-frame reflow, attached
as a `{ passive: true }` listener.

## Feature 7 - The minimal application shape

The application class is six methods of plumbing:

```js
class CodeEditorExampleApplication extends libPictApplication
{
    constructor(pFable, pOptions, pServiceHash)
    {
        super(pFable, pOptions, pServiceHash);

        this.pict.addView('ExampleCodeEditorView',
            _ExampleCodeEditorConfiguration, ExampleCodeEditorView);
    }

    onAfterInitialize()
    {
        super.onAfterInitialize();
        let tmpView = this.pict.views.ExampleCodeEditorView;
        if (tmpView)
        {
            tmpView.render();
        }
    }
}
```

That's the entire application file's runtime logic. `onAfterInitialize()`
runs once after Pict has bootstrapped the application; calling
`render()` on the view drives the first render cycle, which triggers
`onAfterInitialRender()`, which builds the editor DOM, attaches CodeJar,
applies the highlighter, and wires the `onUpdate` write-back to
`AppData.SourceCode`. After that, every interaction is the user typing
into a live editor.

## Running the example

```bash
cd example_applications/code_editor
npm install
npm run build
# then open dist/index.html in a browser
# (or `cd dist && python3 -m http.server 8000` and visit localhost:8000)
```

The editor opens with the seed snippet loaded, line numbers running
down the gutter, syntax-highlighted JavaScript. Type and the gutter
expands; switch the dropdown and the highlighter rebinds; click "Get
Code" and the current contents appear in the panel below.

## Things to try in the running app

- **Type and watch the address** - open devtools, paste
  `_Pict.AppData.SourceCode` after every keystroke. It tracks live.
- **Switch languages** - pick `json` from the dropdown. The existing
  JavaScript is now highlighted by the JSON rules (mostly strings get
  recoloured); the content is untouched.
- **Toggle read-only** - click the button, try to type. The browser
  refuses input but selection and copy still work. Click again to
  resume editing.
- **Press Tab** - focus stays inside the editor and a tab character
  is inserted. Press it with a selection and the selection indents.
- **Press `(`** - the editor auto-inserts `)` and parks the caret
  between them.
- **Press Enter after `{`** - the new line is indented to match the
  brace's leading whitespace, plus one tab.
- **Resize the window** - the gutter rows stay perfectly aligned with
  the code rows; the ResizeObserver re-stamps the metrics whenever
  the editor's box changes.
- **Inspect `_Pict`** - `_Pict.views.ExampleCodeEditorView.codeJar` is
  the live CodeJar instance;
  `_Pict.views.ExampleCodeEditorView.options.ReadOnly` reflects the
  current toggle state.

## Takeaways

1. **`CodeDataAddress` is the binding contract.** Set it, and the
   editor reads from and writes to that AppData slot automatically -
   no per-app marshal code, no event wiring.
2. **`setLanguage()` and `setReadOnly()` are runtime mode changes,
   not re-instantiations from the host's perspective.** The view
   stays the same object; only the internal CodeJar/highlighter
   pair is rebuilt for language swaps.
3. **`getCode()` is the snapshot accessor.** When the host code
   doesn't want to know about `AppData` paths, `view.getCode()` is
   the framework-agnostic way to read the current content.
4. **Editor ergonomics come from configuration, not subclassing.**
   Tab character, auto-pair, indent regex, close-brace placement -
   all properties on the view config, all defaulted sensibly, all
   overridable per instance without writing a custom class.
5. **The gutter stays aligned by construction.** The line-numbers
   element ships without metrics in CSS so it can never drift from
   the editor - the framework stamps them at init and re-stamps on
   every editor change.

## Related documentation

- [Getting Started](../../getting-started.md) - the editor walkthrough
- [Configuration](../../configuration.md) - `CodeDataAddress`, `Language`, `Tab`, `AddClosing`, `IndentOn`, `MoveToNewLine`
- [API Reference](../../api.md) - `getCode`, `setCode`, `setLanguage`, `setReadOnly`, `onCodeChange`, `customConfigureEditorOptions`
- [Syntax Highlighting](../../highlighting.md) - supported languages and custom highlighter integration
