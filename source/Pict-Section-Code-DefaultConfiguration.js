module.exports = (
{
	"RenderOnLoad": true,

	"DefaultRenderable": "CodeEditor-Wrap",
	"DefaultDestinationAddress": "#CodeEditor-Container-Div",

	"Templates":
	[
		{
			"Hash": "CodeEditor-Container",
			"Template": "<!-- CodeEditor-Container Rendering Soon -->"
		}
	],

	"Renderables":
	[
		{
			"RenderableHash": "CodeEditor-Wrap",
			"TemplateHash": "CodeEditor-Container",
			"DestinationAddress": "#CodeEditor-Container-Div"
		}
	],

	"TargetElementAddress": "#CodeEditor-Container-Div",

	// Address in AppData or other Pict address space to read/write code content
	"CodeDataAddress": false,

	// The language for syntax highlighting (e.g. "javascript", "html", "css", "json")
	"Language": "javascript",

	// Whether the editor is read-only
	"ReadOnly": false,

	// Tab character: use tab or spaces
	"Tab": "\t",

	// Whether to indent with the same whitespace as the previous line
	"IndentOn": /[({[]$/,

	// Whether to add a closing bracket/paren/brace
	"MoveToNewLine": /^[)}\]]/,

	// Whether to handle the closing character
	"AddClosing": true,

	// Whether to preserve indentation on new lines
	"CatchTab": true,

	// Whether to show line numbers
	"LineNumbers": true,

	// Default code content if no address is provided
	"DefaultCode": "// Enter your code here\n",

	// CSS for the code editor.
	//
	// Every color/font is wired through pict-provider-theme tokens so apps
	// using pict-provider-theme get themed code editor automatically.  Each
	// var() carries its original ATOM-One-Light hex as the fallback so apps
	// without pict-provider-theme installed look exactly as before.
	"CSS": `.pict-code-editor-wrap
{
	display: flex;
	font-family: var(--theme-typography-family-mono, 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'Liberation Mono', 'Courier New', monospace);
	font-size: 14px;
	line-height: 1.5;
	border: 1px solid var(--theme-color-border-default, #D0D0D0);
	border-radius: 4px;
	overflow: hidden;
}
.pict-code-editor-wrap .pict-code-line-numbers
{
	width: 40px;
	min-width: 40px;
	/* padding-top/bottom are stamped at runtime from the editor's
	   computed padding so row 1 of the gutter aligns with row 1 of
	   the code; only horizontal padding is stylesheet-owned. */
	padding: 0;
	text-align: right;
	background: var(--theme-color-background-secondary, #F5F5F5);
	border-right: 1px solid var(--theme-color-border-default, #D0D0D0);
	color: var(--theme-color-text-muted, #999);
	font-size: 13px;
	/* line-height, padding-top, padding-bottom, and font-family are
	   intentionally NOT declared here.  PictSectionCode._syncGutterMetrics()
	   copies them from the editor's computed styles at init and on every
	   editor resize, so the gutter is guaranteed to track the editor.
	   Declaring them in CSS would either be redundant (when matching) or
	   actively wrong (when the editor's metrics diverge — e.g. theme scale
	   changes the editor's font-size).  See codejar-linenumbers for the
	   canonical version of this pattern. */
	user-select: none;
	pointer-events: none;
	box-sizing: border-box;
}
.pict-code-editor-wrap .pict-code-line-numbers span
{
	display: block;
	padding: 0 8px 0 0;
}
.pict-code-editor-wrap .pict-code-editor
{
	margin: 0;
	padding: 10px 10px 10px 8px;
	min-height: 100px;
	flex: 1;
	min-width: 0;
	outline: none;
	tab-size: 4;
	white-space: pre;
	overflow-wrap: normal;
	color: var(--theme-color-text-primary, #383A42);
	background: var(--theme-color-background-panel, #FAFAFA);
	caret-color: var(--theme-color-brand-primary, #526FFF);
	border-radius: 0 4px 4px 0;
}
.pict-code-editor-wrap .pict-code-editor.pict-code-no-line-numbers
{
	padding-left: 10px;
	border-radius: 4px;
}
/* Syntax token colors — each class binds to a Color.Syntax.* token from
   pict-provider-theme. Fallback hexes match the One Light palette so apps
   that don't install the theme provider look the same as before. */
.pict-code-editor-wrap .pict-code-editor .keyword       { color: var(--theme-color-syntax-keyword,     #A626A4); }
.pict-code-editor-wrap .pict-code-editor .string        { color: var(--theme-color-syntax-string,      #50A14F); }
.pict-code-editor-wrap .pict-code-editor .number        { color: var(--theme-color-syntax-number,      #986801); }
.pict-code-editor-wrap .pict-code-editor .comment       { color: var(--theme-color-syntax-comment,     #A0A1A7); font-style: italic; }
.pict-code-editor-wrap .pict-code-editor .operator      { color: var(--theme-color-syntax-operator,    #0184BC); }
.pict-code-editor-wrap .pict-code-editor .punctuation   { color: var(--theme-color-syntax-punctuation, #383A42); }
.pict-code-editor-wrap .pict-code-editor .function-name { color: var(--theme-color-syntax-function,    #4078F2); }
.pict-code-editor-wrap .pict-code-editor .property      { color: var(--theme-color-syntax-property,    #E45649); }
.pict-code-editor-wrap .pict-code-editor .tag           { color: var(--theme-color-syntax-tag,         #E45649); }
.pict-code-editor-wrap .pict-code-editor .attr-name     { color: var(--theme-color-syntax-attrname,    #986801); }
.pict-code-editor-wrap .pict-code-editor .attr-value    { color: var(--theme-color-syntax-attrvalue,   #50A14F); }
.pict-code-editor-wrap .pict-code-editor .builtin       { color: var(--theme-color-syntax-builtin,     #986801); }
.pict-code-editor-wrap .pict-code-editor .type          { color: var(--theme-color-syntax-type,        #C18401); }
.pict-code-editor-wrap .pict-code-editor .variable      { color: var(--theme-color-syntax-variable,    #383A42); }

/* highlight.js class aliases — when host apps render code blocks with
   highlight.js (e.g. markdown previews via CodeJar's hljs integration),
   the output uses .hljs / .hljs-* classes rather than the bare token
   classes pict-section-code emits. Mapping them here lets one stylesheet
   theme both editor surfaces (bare classes) and hljs-rendered surfaces
   without the host needing a separate per-app github.css. Rules are
   intentionally unscoped (no .pict-code-editor-wrap parent) so they
   apply globally wherever hljs paints. */
.hljs                  { color: var(--theme-color-text-primary,         #383A42); background: transparent; }
.hljs-keyword,
.hljs-keyword.hljs-typeof,
.hljs-selector-tag,
.hljs-literal          { color: var(--theme-color-syntax-keyword,       #A626A4); }
.hljs-string,
.hljs-regexp,
.hljs-template-tag,
.hljs-template-variable { color: var(--theme-color-syntax-string,       #50A14F); }
.hljs-number,
.hljs-meta             { color: var(--theme-color-syntax-number,        #986801); }
.hljs-comment,
.hljs-quote            { color: var(--theme-color-syntax-comment,       #A0A1A7); font-style: italic; }
.hljs-operator,
.hljs-link             { color: var(--theme-color-syntax-operator,      #0184BC); }
.hljs-punctuation      { color: var(--theme-color-syntax-punctuation,   #383A42); }
.hljs-function .hljs-title,
.hljs-title.function_,
.hljs-title.class_     { color: var(--theme-color-syntax-function,      #4078F2); }
.hljs-variable,
.hljs-variable.language_,
.hljs-params           { color: var(--theme-color-syntax-variable,      #383A42); }
.hljs-type,
.hljs-class .hljs-title { color: var(--theme-color-syntax-type,         #C18401); }
.hljs-built_in,
.hljs-builtin-name     { color: var(--theme-color-syntax-builtin,       #986801); }
.hljs-attr,
.hljs-property         { color: var(--theme-color-syntax-property,      #E45649); }
.hljs-tag,
.hljs-name             { color: var(--theme-color-syntax-tag,           #E45649); }
.hljs-attribute        { color: var(--theme-color-syntax-attrname,      #986801); }
.hljs-symbol           { color: var(--theme-color-syntax-attrvalue,     #50A14F); }
.hljs-emphasis         { font-style: italic; }
.hljs-strong           { font-weight: bold; }
.hljs-deletion         { color: var(--theme-color-status-error,         #B62828); background: rgba(220, 50, 47, 0.08); }
.hljs-addition         { color: var(--theme-color-status-success,       #2E7A3A); background: rgba(80, 161, 79, 0.10); }
`
});
