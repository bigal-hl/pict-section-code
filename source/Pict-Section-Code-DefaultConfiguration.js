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
	padding: 10px 0;
	text-align: right;
	background: var(--theme-color-background-secondary, #F5F5F5);
	border-right: 1px solid var(--theme-color-border-default, #D0D0D0);
	color: var(--theme-color-text-muted, #999);
	font-size: 13px;
	line-height: 1.5;
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
.pict-code-editor-wrap .pict-code-editor .keyword       { color: var(--theme-color-brand-primary,   #A626A4); }
.pict-code-editor-wrap .pict-code-editor .string        { color: var(--theme-color-status-success,  #50A14F); }
.pict-code-editor-wrap .pict-code-editor .number        { color: var(--theme-color-brand-accent,    #986801); }
.pict-code-editor-wrap .pict-code-editor .comment       { color: var(--theme-color-text-muted,      #A0A1A7); font-style: italic; }
.pict-code-editor-wrap .pict-code-editor .operator      { color: var(--theme-color-status-info,     #0184BC); }
.pict-code-editor-wrap .pict-code-editor .punctuation   { color: var(--theme-color-text-secondary,  #383A42); }
.pict-code-editor-wrap .pict-code-editor .function-name { color: var(--theme-color-brand-primary,   #4078F2); }
.pict-code-editor-wrap .pict-code-editor .property      { color: var(--theme-color-status-error,    #E45649); }
.pict-code-editor-wrap .pict-code-editor .tag           { color: var(--theme-color-status-error,    #E45649); }
.pict-code-editor-wrap .pict-code-editor .attr-name     { color: var(--theme-color-brand-accent,    #986801); }
.pict-code-editor-wrap .pict-code-editor .attr-value    { color: var(--theme-color-status-success,  #50A14F); }
`
});
