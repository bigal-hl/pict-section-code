# Code Display - Read-Only Syntax-Highlighted Code Blocks

<!-- docuserve:example-launch:start -->
> **[Launch the live app](examples/code%5Fdisplay/index.html)** - runs in your browser, opens in a new tab.
<!-- docuserve:example-launch:end -->

A documentation-style page that renders five read-only code blocks - one for
each language `pict-section-code` ships out of the box (JavaScript, HTML, CSS,
JSON, and SQL). Every block is a fully-instantiated `PictSectionCode` view in
**read-only mode**, sharing the same editor pipeline as the editable variants
but with `contenteditable` flipped off.

This is the reference pattern for any documentation site, tutorial, or
marketing surface that wants real syntax-highlighted code on the page without
the weight of a Markdown renderer or a separate highlighter stack - the same
view that powers the live editor handles the display.

## What it demonstrates

| Capability | Where you see it |
|------------|------------------|
| Read-only mode | `ReadOnly: true` on every view config - `contenteditable="false"` set after init |
| Multiple instances on one page | Five `addView()` calls, each targeting a different DOM container |
| All five supported languages | One view per language: `javascript`, `html`, `css`, `json`, `sql` |
| Line numbers toggle | Three blocks have `LineNumbers: true`, two have `LineNumbers: false` |
| `DefaultCode` as the content source | Each view ships its content inline via `DefaultCode` (no data binding) |
| Per-view target element | `TargetElementAddress` selects a different `div` for each view |
| Built-in syntax highlighter | No external library - `Pict-Code-Highlighter.js` tokenizes each language |
| Theme-token-driven colors | Token CSS classes (`keyword`, `string`, etc.) bind to `--theme-color-syntax-*` |
| Subclassed view pattern | `ExampleCodeDisplayView extends libPictSectionCode` - the canonical extension shape |

## Key files

- `CodeDisplay-Example-Application.js` - the entire app. One small subclass,
  five configuration objects, five `addView()` calls. No view code beyond
  the constructor - the framework drives everything.
- `html/index.html` - five `<div>` containers (`#CodeBlockJS`, `#CodeBlockHTML`,
  `#CodeBlockCSS`, `#CodeBlockJSON`, `#CodeBlockSQL`) plus the Red Rock Mesa
  theme styling around them.
- `html/codejar.js` - the IIFE-wrapped CodeJar build that exposes
  `window.CodeJar`. `pict-section-code` finds it automatically at first
  render.

## The view subclass

The application defines one minimal subclass that all five views share:

```js
class ExampleCodeDisplayView extends libPictSectionCode
{
    constructor(pFable, pOptions, pServiceHash)
    {
        super(pFable, pOptions, pServiceHash);
    }
}
```

That's the entire class. Each `addView()` instance differs only by
configuration - language, target element, line numbers, and `DefaultCode`.
This is the recommended shape: subclass for the *kind* of view (code display
vs. live editor vs. multi-file editor), and configure for the *instance*.

---

## Feature 1 - Read-only mode

Every code block sets `ReadOnly: true`. Internally,
`PictSectionCode.onAfterInitialRender()` honours this by flipping
`contenteditable` off on the editor element:

```js
// Handle read-only
if (this.options.ReadOnly)
{
    tmpEditorElement.setAttribute('contenteditable', 'false');
}
```

CodeJar still owns the DOM (it inserts the highlighted spans, handles paste,
maintains caret position), but the browser refuses to accept any input edits
because the element is no longer editable. Selection, copy, and the entire
syntax-highlighting pipeline still work - you get a code surface that *looks*
exactly like the editor but cannot be modified.

The state is also a runtime toggle: `setReadOnly(false)` would turn any of
these blocks into a live editor without re-instantiating CodeJar or losing
the current content. The Code Editor example uses that hook from a toolbar
button.

## Feature 2 - Five views on one page

The application's constructor wires up five named views, each backed by the
same subclass but with a different configuration:

```js
this.pict.addView('JSSnippetView',   _JSSnippetConfig,   ExampleCodeDisplayView);
this.pict.addView('HTMLSnippetView', _HTMLSnippetConfig, ExampleCodeDisplayView);
this.pict.addView('CSSSnippetView',  _CSSSnippetConfig,  ExampleCodeDisplayView);
this.pict.addView('JSONSnippetView', _JSONSnippetConfig, ExampleCodeDisplayView);
this.pict.addView('SQLSnippetView',  _SQLSnippetConfig,  ExampleCodeDisplayView);
```

Each view is independent - its own CodeJar instance, its own highlighter,
its own DOM subtree under a different `TargetElementAddress`. There is no
global "current language" state; instances compose freely. Want a sixth
language block? Define a sixth config and add a sixth view.

Then `onAfterInitialize()` renders each one in turn:

```js
onAfterInitialize()
{
    super.onAfterInitialize();

    let tmpViews = this.pict.views;
    if (tmpViews.JSSnippetView)   { tmpViews.JSSnippetView.render(); }
    if (tmpViews.HTMLSnippetView) { tmpViews.HTMLSnippetView.render(); }
    if (tmpViews.CSSSnippetView)  { tmpViews.CSSSnippetView.render(); }
    if (tmpViews.JSONSnippetView) { tmpViews.JSONSnippetView.render(); }
    if (tmpViews.SQLSnippetView)  { tmpViews.SQLSnippetView.render(); }
}
```

The `render()` call drives the first pass through the lifecycle hooks; that
in turn triggers `onAfterInitialRender()`, which builds the editor DOM,
attaches CodeJar, applies the highlighter, and (because the views are
`ReadOnly: true`) sets `contenteditable="false"`. After that one render call
each view is fully alive.

## Feature 3 - Per-instance language selection

Every config carries a `Language` property; the constructor stashes it as
`this._language`, and `onBeforeInitialize()` builds the matching highlight
function:

```js
this._language = this.options.Language || 'javascript';
// ...
this._highlightFunction = libCreateHighlighter(this._language);
```

`libCreateHighlighter(pLanguage)` returns a function that walks the code
once, tokenizes it according to the language's regex rules, and writes
class-annotated HTML into the editor element. The supported languages and
their token rules are defined in `Pict-Code-Highlighter.js`'s
`_LanguageDefinitions` map - `javascript`, `json`, `html`, `css`, `sql` are
all built in. `js` and `htm` are aliased automatically.

Because each view has its own highlighter function, switching one block's
language at runtime (via `setLanguage()`) doesn't disturb any of the
others. They're independent renderers that happen to share a class.

## Feature 4 - Line numbers as a per-view toggle

The JavaScript, CSS, and SQL blocks ship with `LineNumbers: true`; the HTML
and JSON blocks ship with `LineNumbers: false`. The difference is purely
visual:

```js
const _JSSnippetConfig = (
{
    "ViewIdentifier": "JSSnippet",
    "TargetElementAddress": "#CodeBlockJS",
    "Language": "javascript",
    "ReadOnly": true,
    "LineNumbers": true,
    "DefaultCode": "// Service Provider Pattern\n..."
});

const _HTMLSnippetConfig = (
{
    "ViewIdentifier": "HTMLSnippet",
    "TargetElementAddress": "#CodeBlockHTML",
    "Language": "html",
    "ReadOnly": true,
    "LineNumbers": false,
    "DefaultCode": "<!DOCTYPE html>\n..."
});
```

Inside `_buildEditorDOM()`, the line-numbers gutter is appended only when
`LineNumbers` is truthy:

```js
if (this.options.LineNumbers)
{
    let tmpLineNumbers = document.createElement('div');
    tmpLineNumbers.className = 'pict-code-line-numbers';
    tmpWrap.appendChild(tmpLineNumbers);
    this._lineNumbersElement = tmpLineNumbers;
}
```

When the gutter is omitted, the editor element picks up the extra class
`pict-code-no-line-numbers`, which restores the missing left padding and
the full border-radius - without that, the read-only block would have a
stub-y left edge where the gutter would otherwise live.

This isn't an aesthetic-only switch. The gutter installs scroll/resize/
mutation observers to keep its rows aligned with the editor lines (see
`_syncGutterMetrics()`). When you turn it off you skip all of that.
Inline-code-style mini-snippets (a single line, a JSON literal, an HTML
fragment) typically don't need line numbers and look cleaner without them.

## Feature 5 - Inline `DefaultCode` as the content source

This example never sets `CodeDataAddress`. There is nothing to bind to -
the code is constant. Every config carries its content inline:

```js
"DefaultCode": "// Service Provider Pattern\nconst libFable = require('fable');\n\nclass GreeterService extends libFable.ServiceProviderBase\n{\n\tconstructor(pFable, pOptions, pServiceHash)\n\t{\n\t\tsuper(pFable, pOptions, pServiceHash);\n\t\tthis.serviceType = 'Greeter';\n\t}\n\n\tgreet(pName)\n\t{\n\t\tlet tmpResult = `Hello, ${pName}!`;\n\t\tthis.log.info(tmpResult);\n\t\treturn tmpResult;\n\t}\n}\n\nmodule.exports = GreeterService;\n"
```

`_resolveCodeContent()` is the single function that decides what the
editor opens with:

```js
_resolveCodeContent()
{
    if (this.options.CodeDataAddress)
    {
        // ... resolve through fable.manifest ...
        let tmpAddressedData = this.fable.manifest.getValueByHash(
            tmpAddressSpace, this.options.CodeDataAddress);
        if (typeof (tmpAddressedData) === 'string') return tmpAddressedData;
    }

    return this.options.DefaultCode || '';
}
```

Because `CodeDataAddress` is falsy, the resolver short-circuits straight
to `options.DefaultCode`. The five blocks each carry their own snippet;
nothing reads or writes app data.

This is the right pattern when the code is documentation: it doesn't
change, it doesn't need to round-trip through `AppData`, and it doesn't
need a manifest field. For an editable surface that has to read and write
content, the Code Editor example uses `CodeDataAddress` instead.

## Feature 6 - Per-language highlighter wired up from one map

A single language identifier flows from the config all the way to the
on-screen colors. The flow:

1. `Language: "css"` in the view config.
2. `_language = 'css'` after `super(pFable, tmpOptions, pServiceHash)`.
3. `_highlightFunction = libCreateHighlighter('css')` in
   `onBeforeInitialize()`.
4. `createHighlighter('css')` returns a function that uses the CSS rules
   from `_LanguageDefinitions['css']` - selectors, properties, numbers
   with units, keywords (`important`, `inherit`, `none`, ...), comments.
5. CodeJar calls that function once per edit (or once at init for
   read-only); the highlighted HTML is written back into the editor
   element.

The CSS snippet in this example is what comes out the other end:

```css
.site-header
{
    background: #264653;
    color: #FAEDCD;
    padding: 1rem 2rem;
    /* ... */
}
```

Selectors get `class="function-name"`, properties get `class="property"`,
hex literals get `class="number"`, comments get `class="comment"`. The
`Pict-Section-Code-DefaultConfiguration.js` CSS then maps every one of
those classes to a `--theme-color-syntax-*` custom property with the One
Light palette as the fallback - so installing `pict-section-theme` is
enough to retheme every block on the page, no per-app palette code
required.

## Feature 7 - Independent renderable destinations

Each view has its own `TargetElementAddress`. The HTML shell carries one
empty `<div>` per language:

```html
<div id="CodeBlockJS"   class="code-block-container"></div>
<div id="CodeBlockHTML" class="code-block-container"></div>
<div id="CodeBlockCSS"  class="code-block-container"></div>
<div id="CodeBlockJSON" class="code-block-container"></div>
<div id="CodeBlockSQL"  class="code-block-container"></div>
```

...and the matching view configs point at them:

```js
"TargetElementAddress": "#CodeBlockJS"
"TargetElementAddress": "#CodeBlockHTML"
"TargetElementAddress": "#CodeBlockCSS"
"TargetElementAddress": "#CodeBlockJSON"
"TargetElementAddress": "#CodeBlockSQL"
```

`onAfterInitialRender()` calls `ContentAssignment.getElement()` to resolve
the selector, fails loudly if no match is found, and stamps `wrap ->
line-numbers -> editor` DOM into the resolved container. Because each view
holds its own `targetElement` reference, the five instances never reach
into each other's DOM trees. A failure to find one container logs an error
and leaves the others rendering normally.

## Running the example

```bash
cd example_applications/code_display
npm install
npm run build
# then open dist/index.html in a browser
# (or `cd dist && python3 -m http.server 8000` and visit localhost:8000)
```

The five code blocks render in turn down the page. Each one is fully
read-only - try clicking inside and typing; nothing happens. Selection
and copy still work, so the snippets remain useful for actual reading.

## Things to try in the running app

- **Inspect the DOM** - open devtools on any block, you'll see the
  `pict-code-editor-wrap` / `pict-code-line-numbers` / `pict-code-editor`
  three-element structure. The editor element has
  `contenteditable="false"`.
- **Select and copy** - the read-only mode does not block text selection.
  Highlight a function definition, hit copy, paste it elsewhere - you get
  the original (unhighlighted) source.
- **Flip read-only at runtime** - paste this into the devtools console:
  `_Pict.views.JSSnippetView.setReadOnly(false)`. The JavaScript block
  becomes a live editor. Set it back to `true` to lock it again.
- **Swap the language** -
  `_Pict.views.JSONSnippetView.setLanguage('javascript')` re-runs the
  highlighter against the same content with the JavaScript rule set;
  highlights change instantly.
- **Apply a theme** - install `pict-section-theme` and switch dark mode;
  every code block updates colors via the `--theme-color-syntax-*`
  tokens.

## Takeaways

1. **One subclass, many configurations.** Five code blocks come from
   one trivial subclass and five config objects. The framework is
   designed so the *kind* of view is the class and the *instance* is
   the config.
2. **Read-only is a runtime mode, not a separate component.** The same
   editor pipeline drives display and editing - flipping a single option
   changes which one you get, with no separate codepath.
3. **`DefaultCode` covers the no-binding case.** When the content is
   static, there is no need to invent a `CodeDataAddress`; the resolver
   falls back to inline content gracefully.
4. **Line numbers are independent of read-only.** Either toggle can be
   set without affecting the other - three of the five blocks have line
   numbers, two don't, and all five are read-only.
5. **Theme tokens reach the syntax layer.** Every keyword/string/number
   color is a `var(--theme-color-syntax-*)` with the One Light hex as
   fallback, so adopting a theme retints the code without any per-app
   palette work.

## Related documentation

- [Getting Started](../../getting-started.md) - the read-only display walkthrough
- [Configuration](../../configuration.md) - `ReadOnly`, `LineNumbers`, `DefaultCode`, `Language`
- [API Reference](../../api.md) - `setReadOnly`, `setLanguage`, `setCode`
- [Syntax Highlighting](../../highlighting.md) - supported languages and token classes
