# pict-section-code

> **[&#9654; Read the Pict-Section-Code Documentation](https://stevenvelozo.github.io/pict-section-code/)** &mdash; interactive docs with the full API reference.

A code editor and syntax highlighter view for the [Pict](https://github.com/stevenvelozo/pict) ecosystem, wrapping [CodeJar](https://github.com/antonmedv/codejar).

[![MIT Licensed](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

## Features

- Full-featured code editing with undo, auto-indent, and bracket closing
- Read-only mode for syntax-highlighted code display
- Built-in highlighting for **JavaScript**, **JSON**, **HTML**, **CSS**, and **SQL**
- Plug in custom highlighter functions (Prism.js, highlight.js, etc.)
- Line numbers with automatic updates
- Two-way data binding to Pict AppData addresses
- Configurable tab handling, indent patterns, and closing behavior

## Installation

```bash
npm install pict-section-code
```

## Quick Start

```javascript
const libPictApplication = require('pict-application');
const libPictSectionCode = require('pict-section-code');

class MyEditorView extends libPictSectionCode
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}
}

class MyApp extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this.pict.addView('EditorView',
			{
				"TargetElementAddress": "#MyEditorContainer",
				"Language": "javascript",
				"LineNumbers": true,
				"DefaultCode": "// Hello World\nconsole.log('Hello!');\n"
			},
			MyEditorView);
	}

	onAfterInitialize()
	{
		super.onAfterInitialize();
		this.pict.views.EditorView.render();
	}
}

module.exports = MyApp;
```

In your HTML, include a container element and the required scripts:

```html
<div id="MyEditorContainer"></div>
<script src="codejar.js"></script>
<script src="pict.min.js"></script>
<script src="my-app.min.js"></script>
```

> **Note:** CodeJar is an ESM-only library. For script-tag usage, wrap it in an IIFE that exposes `window.CodeJar`. See the example applications for a ready-made `codejar.js` wrapper.

## Documentation

Full documentation is available in the [docs/](./docs/) directory:

- [Getting Started](./docs/getting-started.md) -- Installation and first editor
- [Configuration](./docs/configuration.md) -- Complete options reference
- [API Reference](./docs/api.md) -- All public methods
- [Syntax Highlighting](./docs/highlighting.md) -- Built-in languages and custom highlighters
- [Examples](./docs/examples.md) -- Three working example applications

## Example Applications

| Example | Description |
|---------|-------------|
| [Code Editor](./example_applications/code_editor/) | Single editor with language switching and read-only toggle |
| [Code Display](./example_applications/code_display/) | Read-only syntax-highlighted blocks in all five languages |
| [Multi-File Editor](./example_applications/multi_file_editor/) | Sidebar file browser with auto language detection |

Build any example:

```bash
cd example_applications/<example_name>
npm install
npm run build
# Open dist/index.html in a browser
```

## API Overview

| Method | Description |
|--------|-------------|
| `getCode()` | Get current code content |
| `setCode(pCode)` | Set code content |
| `setLanguage(pLanguage)` | Change syntax highlighting language |
| `setReadOnly(pReadOnly)` | Toggle read-only mode |
| `setHighlightFunction(fn)` | Use a custom highlight function |
| `destroy()` | Clean up the editor instance |
| `marshalToView()` | Load code from data address |
| `marshalFromView()` | Save code to data address |

## Testing

```bash
npm test
npm run coverage
```

## Related Packages

- [pict](https://github.com/stevenvelozo/pict) -- Core MVC framework
- [pict-view](https://github.com/stevenvelozo/pict-view) -- Base view class
- [pict-application](https://github.com/stevenvelozo/pict-application) -- Application lifecycle
- [fable](https://github.com/stevenvelozo/fable) -- Service provider and dependency injection

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first.
