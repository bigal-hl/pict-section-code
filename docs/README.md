# Pict Section Code

A code editor and syntax highlighter view for the Pict ecosystem, wrapping [CodeJar](https://github.com/antonmedv/codejar) as a Pict view with built-in syntax highlighting.

## Features

- Full-featured code editing with undo, auto-indent, and bracket closing
- Read-only mode for presenting syntax-highlighted code
- Built-in highlighting for **JavaScript**, **JSON**, **HTML**, **CSS**, and **SQL**
- Custom highlighter support (Prism.js, highlight.js, or any function)
- Line numbers with automatic updates
- Two-way data binding to Pict AppData addresses
- Configurable tab handling, indent patterns, and closing behavior
- Runtime language switching

## Installation

```bash
npm install pict-section-code
```

## Quick Start

Create a view subclass and wire it into a Pict application:

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

In your HTML, include a container and the required scripts:

```html
<div id="MyEditorContainer"></div>

<script src="codejar.js"></script>
<script src="pict.min.js"></script>
<script src="my-app.min.js"></script>
```

> **Note:** CodeJar ships as ESM only. For script-tag usage, wrap it in an IIFE that exposes `window.CodeJar`. See the example applications for a ready-made `codejar.js` wrapper.

## Module Structure

```
source/
  Pict-Section-Code.js                   Main view class (extends pict-view)
  Pict-Code-Highlighter.js               Built-in syntax highlighter factory
  Pict-Section-Code-DefaultConfiguration.js  Default options and CSS
```

## Configuration at a Glance

| Option | Default | Description |
|--------|---------|-------------|
| `TargetElementAddress` | `"#CodeEditor-Container-Div"` | CSS selector for the editor container |
| `CodeDataAddress` | `false` | Pict address for two-way data binding |
| `Language` | `"javascript"` | Syntax highlighting language |
| `ReadOnly` | `false` | Disable editing |
| `LineNumbers` | `true` | Show line numbers |
| `DefaultCode` | `"// Enter your code here\n"` | Initial code content |

See the full [Configuration Reference](configuration.md) for all options.

## Documentation

- [Getting Started](getting-started.md) -- Installation and first editor
- [Configuration](configuration.md) -- Complete options reference
- [API Reference](api.md) -- All public methods
- [Syntax Highlighting](highlighting.md) -- Built-in languages and custom highlighters
- [Examples](examples.md) -- Three working example applications

## Example Applications

| Example | Description |
|---------|-------------|
| **Code Editor** | Single editor with language switching and read-only toggle |
| **Code Display** | Read-only syntax-highlighted blocks in all five languages |
| **Multi-File Editor** | Sidebar file browser with auto language detection |

## Related Packages

- [pict](https://github.com/fable-retold/pict) -- Core MVC framework
- [pict-view](https://github.com/fable-retold/pict-view) -- Base view class
- [pict-application](https://github.com/fable-retold/pict-application) -- Application lifecycle
- [fable](https://github.com/fable-retold/fable) -- Service provider and dependency injection
