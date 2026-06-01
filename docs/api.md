# API Reference

`PictSectionCode` extends `pict-view` and provides a code editor backed by CodeJar.

## Constructor

```javascript
const libPictSectionCode = require('pict-section-code');

class MyEditor extends libPictSectionCode
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}
}
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `codeJar` | object \| null | The CodeJar instance (set after initial render) |
| `targetElement` | element \| false | The DOM element containing the editor |
| `initialRenderComplete` | boolean | Whether the first render cycle has completed |

## Public Methods

### getCode()

Returns the current code content as a string.

```javascript
let tmpCode = myView.getCode();
console.log(tmpCode);
```

**Returns:** `string` -- The current code content. Returns empty string if the editor is not initialized.

---

### setCode(pCode)

Sets the code content and updates line numbers.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pCode` | string | The code to set |

```javascript
myView.setCode('const x = 42;\nconsole.log(x);');
```

---

### setLanguage(pLanguage)

Changes the syntax highlighting language. This destroys and recreates the CodeJar instance with a new highlighter.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pLanguage` | string | Language identifier: `javascript`, `json`, `html`, `css`, `sql` |

```javascript
myView.setLanguage('css');
```

The current code content is preserved across language changes.

---

### setReadOnly(pReadOnly)

Toggles the read-only state of the editor.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pReadOnly` | boolean | `true` to disable editing, `false` to enable |

```javascript
myView.setReadOnly(true);  // Make read-only
myView.setReadOnly(false); // Make editable
```

---

### setHighlightFunction(pHighlightFunction)

Replaces the built-in highlighter with a custom function. This destroys and recreates the CodeJar instance.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pHighlightFunction` | function | A function that takes a DOM element and highlights its `textContent` |

```javascript
// Using Prism.js
myView.setHighlightFunction((pElement) =>
{
	pElement.innerHTML = Prism.highlight(
		pElement.textContent,
		Prism.languages.javascript,
		'javascript'
	);
});
```

See [Syntax Highlighting](highlighting.md) for more details on custom highlighters.

---

### connectCodeJarPrototype(pCodeJarPrototype)

Explicitly provide the CodeJar constructor function. This is only needed if CodeJar is not available as `window.CodeJar`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pCodeJarPrototype` | function | The CodeJar constructor |

```javascript
import { CodeJar } from 'codejar';
myView.connectCodeJarPrototype(CodeJar);
```

---

### destroy()

Cleans up the CodeJar instance and releases resources.

```javascript
myView.destroy();
```

---

### marshalToView()

Reads the code content from the `CodeDataAddress` and updates the editor display. Call this after changing the data at the bound address.

```javascript
myView.pict.AppData.SourceCode = 'const y = 100;';
myView.marshalToView();
```

---

### marshalFromView()

Writes the current editor content back to the `CodeDataAddress`. This is called automatically on code changes, but can be invoked explicitly.

```javascript
myView.marshalFromView();
```

## Overridable Hooks

### onCodeChange(pCode)

Called whenever the code content changes (on every edit). The default implementation writes back to `CodeDataAddress` if configured. Override in subclasses for custom behavior:

```javascript
class MyEditor extends libPictSectionCode
{
	onCodeChange(pCode)
	{
		super.onCodeChange(pCode);
		// Custom logic: validate, auto-save, etc.
		console.log('Code changed, length:', pCode.length);
	}
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pCode` | string | The new code content |

---

### customConfigureEditorOptions(pOptions)

Called before CodeJar is instantiated, allowing you to modify the options object. Override in subclasses:

```javascript
class MyEditor extends libPictSectionCode
{
	customConfigureEditorOptions(pOptions)
	{
		pOptions.tab = '    '; // 4 spaces
		pOptions.catchTab = false;
	}
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pOptions` | object | The CodeJar options object to modify in place |

## Static Exports

The module exports additional utilities on the class:

```javascript
const PictSectionCode = require('pict-section-code');

// The default configuration object
PictSectionCode.default_configuration;

// The highlighter factory function
let tmpHighlighter = PictSectionCode.createHighlighter('css');
```

### createHighlighter(pLanguage)

Factory function that returns a highlighter function for the given language.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pLanguage` | string | Language identifier |

**Returns:** `function` -- A function compatible with CodeJar's highlight callback.

## Inherited from pict-view

PictSectionCode inherits all methods from `pict-view`, including:

| Method | Description |
|--------|-------------|
| `render()` | Render the view |
| `onBeforeRender()` | Hook before rendering |
| `onAfterRender()` | Hook after rendering |

See the [pict-view documentation](https://fable-retold.github.io/pict-view/) for the full inherited API.
