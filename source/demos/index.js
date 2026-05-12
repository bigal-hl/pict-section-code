/**
 * pict-section-code demos
 *
 * Each entry is consumed by pict-docuserve's `Docuserve-Demos` provider.
 * Hosts that want these demos to appear in their docs site call
 * `require('pict-section-code/source/demos').registerWithDocuserve(pict)`
 * once at app boot (typically inside their DocuserveApplication subclass
 * after `super(...)`).
 *
 * Each demo's Mount(pict, container, spec) signature creates a fresh
 * pict-section-code view instance inside the supplied container.  Spec
 * fields are passed through to the view config so a single demo template
 * can express "JavaScript with line numbers", "JSON read-only no
 * gutter", etc. without duplicating the wiring.
 */

const libPictSectionCode = require('../Pict-Section-Code.js');

/**
 * Internal helper: mount a pict-section-code instance into a host
 * container according to the demo spec.  Each call registers a uniquely
 * identified view so multiple demos on the same page coexist cleanly.
 */
function mountCodeEditor(pPict, pContainer, pSpec)
{
	// Tag this mount with an id we can target as the destination.
	let tmpDestId = 'demo-code-' + (pSpec.Hash || 'unnamed') + '-' + Date.now();
	pContainer.innerHTML = '<div id="' + tmpDestId + '"></div>';

	let tmpConfig =
	{
		ViewIdentifier:            'Demo-Code-' + tmpDestId,
		DefaultDestinationAddress: '#' + tmpDestId,
		Templates:
		[
			{ Hash: 'CodeEditor-Container', Template: '<!-- demo code editor renders here -->' }
		],
		Renderables:
		[
			{ RenderableHash: 'CodeEditor-Wrap', TemplateHash: 'CodeEditor-Container', DestinationAddress: '#' + tmpDestId }
		],
		TargetElementAddress: '#' + tmpDestId,
		Language:    pSpec.Language    || 'javascript',
		ReadOnly:    !!pSpec.ReadOnly,
		LineNumbers: pSpec.LineNumbers !== false,
		Tab:         pSpec.Tab         || '\t',
		AddClosing:  pSpec.AddClosing !== false,
		CatchTab:    pSpec.CatchTab   !== false,
		DefaultCode: pSpec.Code        || '// example code\n',
		// AutoRender is intentionally OFF so we can pre-wire CodeJar
		// before the first render fires.  pict-section-code looks for
		// window.CodeJar by default; most hosts bundle CodeJar under
		// window.CodeJarModules.CodeJar (e.g. retold-content-system's
		// codejar-bundle.js), so we wire it explicitly here.
		AutoRender:  false,
		RenderOnLoad: false
	};

	let tmpView = pPict.addView(tmpConfig.ViewIdentifier, tmpConfig, libPictSectionCode);
	if (!tmpView) { return null; }

	// Connect the CodeJar prototype + highlight function from the
	// CodeJarModules global if it's loaded.  Falls back to bare CodeJar
	// if the host published the prototype directly.
	if (typeof window !== 'undefined')
	{
		if (window.CodeJarModules && typeof window.CodeJarModules.CodeJar === 'function')
		{
			tmpView.connectCodeJarPrototype(window.CodeJarModules.CodeJar);
		}
		else if (typeof window.CodeJar === 'function')
		{
			tmpView.connectCodeJarPrototype(window.CodeJar);
		}

		// Wire highlight.js highlighting if the bundle exposes it.
		if (window.CodeJarModules && window.CodeJarModules.hljs)
		{
			let tmpHljs = window.CodeJarModules.hljs;
			let tmpLanguage = tmpConfig.Language;
			tmpView._highlightFunction = function (pElement)
			{
				pElement.removeAttribute('data-highlighted');
				delete pElement.dataset.highlighted;
				pElement.className = pElement.className
					.replace(/\bhljs\b/g, '')
					.replace(/\blanguage-\S+/g, '')
					.trim();
				pElement.classList.add('language-' + tmpLanguage);
				try { tmpHljs.highlightElement(pElement); }
				catch (pErr) { /* swallow — highlighting is best-effort */ }
			};
		}
	}

	try { tmpView.render(); }
	catch (pError) { /* pict-section-code logs its own errors */ }
	return tmpView;
}

const _Demos =
[
	{
		DemoSchemaVersion: 1,
		Hash:        'javascript-editor',
		Group:       'pict',
		Module:      'pict-section-code',
		Name:        'JavaScript editor',
		Description: 'Default pict-section-code configuration — line numbers on, highlight.js for JavaScript, two-space tab.',
		Spec:
		{
			Hash: 'javascript-editor',
			Language: 'javascript',
			LineNumbers: true,
			Tab: '  ',
			Code:
				'// A small example — try editing me.\n' +
				'function fibonacci(n) {\n' +
				'  if (n <= 1) return n;\n' +
				'  return fibonacci(n - 1) + fibonacci(n - 2);\n' +
				'}\n' +
				'\n' +
				'for (let i = 0; i < 10; i++) {\n' +
				'  console.log(`fib(${i}) =`, fibonacci(i));\n' +
				'}\n'
		},
		Mount: mountCodeEditor,
		Sources:
		[
			{
				Name: 'spec.json',
				Language: 'json',
				Content:
					'{\n' +
					'  "Language": "javascript",\n' +
					'  "LineNumbers": true,\n' +
					'  "Tab": "  ",\n' +
					'  "Code": "function fibonacci(n) { … }"\n' +
					'}'
			}
		]
	},
	{
		DemoSchemaVersion: 1,
		Hash:        'json-readonly',
		Group:       'pict',
		Module:      'pict-section-code',
		Name:        'JSON viewer (read-only)',
		Description: 'Read-only mode with line numbers off — useful for embedded "show me the payload" surfaces in dashboards.',
		Spec:
		{
			Hash: 'json-readonly',
			Language: 'json',
			ReadOnly: true,
			LineNumbers: false,
			Code:
				'{\n' +
				'  "version": "1.0.7",\n' +
				'  "syntax": {\n' +
				'    "keyword":  "#A626A4",\n' +
				'    "string":   "#50A14F",\n' +
				'    "number":   "#986801",\n' +
				'    "function": "#4078F2"\n' +
				'  },\n' +
				'  "features": ["highlighting", "line-numbers", "readonly", "themed"]\n' +
				'}\n'
		},
		Mount: mountCodeEditor,
		Sources:
		[
			{
				Name: 'spec.json',
				Language: 'json',
				Content:
					'{\n' +
					'  "Language": "json",\n' +
					'  "ReadOnly": true,\n' +
					'  "LineNumbers": false\n' +
					'}'
			}
		]
	},
	{
		DemoSchemaVersion: 1,
		Hash:        'css-editor',
		Group:       'pict',
		Module:      'pict-section-code',
		Name:        'CSS editor (4-space tab)',
		Description: 'CSS-flavoured highlighting with a 4-space tab and bracket auto-close turned off — leaner editing for stylesheet snippets.',
		Spec:
		{
			Hash: 'css-editor',
			Language: 'css',
			LineNumbers: true,
			Tab: '    ',
			AddClosing: false,
			Code:
				'/* Theme-aware token usage */\n' +
				'.docuserve-demo-title {\n' +
				'    color: var(--theme-color-text-primary, #3D3229);\n' +
				'    font-size: 1.5em;\n' +
				'    font-weight: 600;\n' +
				'}\n' +
				'\n' +
				'.docuserve-demo-description {\n' +
				'    color: var(--theme-color-text-secondary, #5E5549);\n' +
				'    line-height: 1.55;\n' +
				'}\n'
		},
		Mount: mountCodeEditor,
		Sources:
		[
			{
				Name: 'spec.json',
				Language: 'json',
				Content:
					'{\n' +
					'  "Language": "css",\n' +
					'  "LineNumbers": true,\n' +
					'  "Tab": "    ",\n' +
					'  "AddClosing": false\n' +
					'}'
			}
		]
	}
];

/**
 * Register every pict-section-code demo with the host docuserve app.
 *
 * @param {object} pPict - The Pict instance (typically `this.pict` inside
 *                        a DocuserveApplication subclass).
 * @returns {number} count of demos registered (0 if Docuserve-Demos
 *                   provider isn't present — silent no-op).
 */
function registerWithDocuserve(pPict)
{
	if (!pPict || !pPict.providers || !pPict.providers['Docuserve-Demos'])
	{
		return 0;
	}
	return pPict.providers['Docuserve-Demos'].registerAll(_Demos);
}

module.exports = _Demos;
module.exports.demos = _Demos;
module.exports.registerWithDocuserve = registerWithDocuserve;
