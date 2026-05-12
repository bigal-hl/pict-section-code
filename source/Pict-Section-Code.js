const libPictViewClass = require('pict-view');
const libCreateHighlighter = require('./Pict-Code-Highlighter.js');
const _DefaultConfiguration = require('./Pict-Section-Code-DefaultConfiguration.js');

class PictSectionCode extends libPictViewClass
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, _DefaultConfiguration, pOptions);
		super(pFable, tmpOptions, pServiceHash);

		this.initialRenderComplete = false;

		// The CodeJar instance
		this.codeJar = null;

		// The highlight function (can be overridden)
		this._highlightFunction = null;

		// The current language
		this._language = this.options.Language || 'javascript';
	}

	onBeforeInitialize()
	{
		super.onBeforeInitialize();

		this._codeJarPrototype = null;
		this.targetElement = false;

		// Build the default highlight function for the configured language
		this._highlightFunction = libCreateHighlighter(this._language);

		return super.onBeforeInitialize();
	}

	/**
	 * Connect the CodeJar prototype.  If not passed explicitly, try to find it
	 * as a global (window.CodeJar) or require it from the npm package.
	 *
	 * @param {function} [pCodeJarPrototype] - The CodeJar constructor function
	 * @returns {boolean|void}
	 */
	connectCodeJarPrototype(pCodeJarPrototype)
	{
		if (typeof (pCodeJarPrototype) === 'function')
		{
			this._codeJarPrototype = pCodeJarPrototype;
			return;
		}

		// Try to find CodeJar in global scope
		if (typeof (window) !== 'undefined')
		{
			if (typeof (window.CodeJar) === 'function')
			{
				this.log.trace(`PICT-Code Found CodeJar in window.CodeJar.`);
				this._codeJarPrototype = window.CodeJar;
				return;
			}
		}

		this.log.error(`PICT-Code No CodeJar prototype found. Include codejar via script tag or call connectCodeJarPrototype(CodeJar) explicitly.`);
		return false;
	}

	onAfterRender(pRenderable)
	{
		// Ensure the CSS from all registered views is injected into the DOM
		this.pict.CSSMap.injectCSS();

		if (!this.initialRenderComplete)
		{
			this.onAfterInitialRender();
			this.initialRenderComplete = true;
		}

		return super.onAfterRender(pRenderable);
	}

	onAfterInitialRender()
	{
		// Resolve the CodeJar prototype if not already set
		if (!this._codeJarPrototype)
		{
			this.connectCodeJarPrototype();
		}

		if (!this._codeJarPrototype)
		{
			this.log.error(`PICT-Code Cannot initialize editor; no CodeJar prototype available.`);
			return false;
		}

		if (this.codeJar)
		{
			this.log.error(`PICT-Code editor is already initialized!`);
			return false;
		}

		// Find the target element
		let tmpTargetElementSet = this.services.ContentAssignment.getElement(this.options.TargetElementAddress);
		if (!tmpTargetElementSet || tmpTargetElementSet.length < 1)
		{
			this.log.error(`PICT-Code Could not find target element [${this.options.TargetElementAddress}]!`);
			this.targetElement = false;
			return false;
		}
		this.targetElement = tmpTargetElementSet[0];

		// Build the editor DOM structure
		this._buildEditorDOM();

		// Get initial code content
		let tmpCode = this._resolveCodeContent();

		// Create the CodeJar options
		let tmpCodeJarOptions = {};
		if (this.options.Tab)
		{
			tmpCodeJarOptions.tab = this.options.Tab;
		}
		if (this.options.IndentOn)
		{
			tmpCodeJarOptions.indentOn = this.options.IndentOn;
		}
		if (this.options.MoveToNewLine)
		{
			tmpCodeJarOptions.moveToNewLine = this.options.MoveToNewLine;
		}
		if (typeof (this.options.AddClosing) !== 'undefined')
		{
			tmpCodeJarOptions.addClosing = this.options.AddClosing;
		}
		if (typeof (this.options.CatchTab) !== 'undefined')
		{
			tmpCodeJarOptions.catchTab = this.options.CatchTab;
		}

		this.customConfigureEditorOptions(tmpCodeJarOptions);

		// Instantiate CodeJar on the editor element
		let tmpEditorElement = this._editorElement;
		this.codeJar = this._codeJarPrototype(tmpEditorElement, this._highlightFunction, tmpCodeJarOptions);

		// CodeJar forces white-space:pre-wrap and overflow-wrap:break-word
		// via inline styles, which causes line wrapping that breaks the
		// line-number alignment.  Override back to non-wrapping so the
		// wrap container scrolls horizontally instead.
		this._resetEditorWrapStyles();

		// Set the initial code
		if (tmpCode)
		{
			this.codeJar.updateCode(tmpCode);
		}

		// Wire up the change handler
		this.codeJar.onUpdate((pCode) =>
		{
			this._updateLineNumbers();
			this.onCodeChange(pCode);
		});

		// Initial line number render
		this._updateLineNumbers();

		// Sync line-numbers vertical position with the editor's scroll.
		//
		// The editor element scrolls internally (CodeJar uses
		// contenteditable + overflow:auto for long content), but the
		// line-numbers div is a sibling with overflow:visible — without
		// this sync the line-numbers content stays glued at the top of
		// the wrap while the editor scrolls underneath it, so "line 1"
		// appears next to whatever line is actually showing.
		//
		// Using `transform: translateY(...)` instead of scrollTop keeps
		// the sync compositor-only (no reflow per scroll event) and
		// avoids needing to change the line-numbers element's overflow
		// from visible.  Passive listener so we don't block scrolling.
		if (this._lineNumbersElement)
		{
			let tmpLineNumbersEl = this._lineNumbersElement;
			tmpEditorElement.addEventListener('scroll', function ()
			{
				tmpLineNumbersEl.style.transform = 'translateY(-' + tmpEditorElement.scrollTop + 'px)';
			}, { passive: true });
		}

		// Sync gutter typographic metrics from the editor.  The gutter
		// must use the editor's exact line-height (and matching padding)
		// or rows drift apart cumulatively.  See _syncGutterMetrics().
		this._syncGutterMetrics();

		// Watch the editor for size changes (window resize affecting
		// flex layout, container resize) and re-sync the gutter so it
		// continues to track the editor.  ResizeObserver fires once per
		// frame at most, so the cost is negligible.
		if (this._lineNumbersElement && typeof (ResizeObserver) === 'function')
		{
			let tmpSelf = this;
			this._editorResizeObserver = new ResizeObserver(function ()
			{
				tmpSelf._syncGutterMetrics();
			});
			this._editorResizeObserver.observe(tmpEditorElement);
		}

		// Watch for direct style/class mutations on the editor.  Theme
		// providers that toggle scale by swapping a class on the editor,
		// or host code that adjusts editor typography via inline styles,
		// don't necessarily change the editor's box size — so the
		// ResizeObserver above wouldn't see them.  MutationObserver on
		// the attributes catches these cases.
		if (this._lineNumbersElement && typeof (MutationObserver) === 'function')
		{
			let tmpSelf = this;
			this._editorStyleObserver = new MutationObserver(function ()
			{
				tmpSelf._syncGutterMetrics();
			});
			this._editorStyleObserver.observe(tmpEditorElement,
				{ attributes: true, attributeFilter: ['style', 'class'] });
		}

		// Handle read-only
		if (this.options.ReadOnly)
		{
			tmpEditorElement.setAttribute('contenteditable', 'false');
		}
	}

	/**
	 * Build the editor DOM elements inside the target container.
	 */
	_buildEditorDOM()
	{
		// Clear the target
		this.targetElement.innerHTML = '';

		// Create wrapper
		let tmpWrap = document.createElement('div');
		tmpWrap.className = 'pict-code-editor-wrap';

		// Create line numbers container
		if (this.options.LineNumbers)
		{
			let tmpLineNumbers = document.createElement('div');
			tmpLineNumbers.className = 'pict-code-line-numbers';
			tmpWrap.appendChild(tmpLineNumbers);
			this._lineNumbersElement = tmpLineNumbers;
		}

		// Create the editor element (CodeJar needs a pre or div)
		let tmpEditor = document.createElement('div');
		tmpEditor.className = 'pict-code-editor language-' + this._language;
		if (!this.options.LineNumbers)
		{
			tmpEditor.className += ' pict-code-no-line-numbers';
		}
		tmpWrap.appendChild(tmpEditor);

		this.targetElement.appendChild(tmpWrap);
		this._editorElement = tmpEditor;
		this._wrapElement = tmpWrap;
	}

	/**
	 * Update the line numbers display based on current code content.
	 */
	_updateLineNumbers()
	{
		if (!this.options.LineNumbers || !this._lineNumbersElement || !this._editorElement)
		{
			return;
		}

		let tmpCode = this._editorElement.textContent || '';
		let tmpLineCount = tmpCode.split('\n').length;
		let tmpHTML = '';

		for (let i = 1; i <= tmpLineCount; i++)
		{
			tmpHTML += `<span>${i}</span>`;
		}

		this._lineNumbersElement.innerHTML = tmpHTML;

		// Defense-in-depth: every line-count rebuild is also a natural
		// re-sync point.  Cheap (one getComputedStyle + a handful of
		// style writes) and guarantees newly-added spans use the same
		// metrics as the editor at the moment of the rebuild.
		this._syncGutterMetrics();
	}

	/**
	 * Copy typographic metrics from the editor element to the line-numbers
	 * gutter so every gutter row lines up with its corresponding code row.
	 *
	 * The gutter is a sibling element with its own font/line-height
	 * declarations — if any one diverges from the editor (unitless
	 * line-height resolving against a different font-size, host CSS
	 * overriding font-family, theme scale changing the editor's metrics),
	 * the two desync and the drift accumulates with every line.
	 *
	 * The pattern is borrowed from the canonical `codejar-linenumbers`
	 * library (julianpoemp/codejar-linenumbers), which solves the same
	 * class of bug by reading the editor's computed styles at init and
	 * stamping them onto the gutter.  We extend that here by also
	 * re-stamping whenever the editor resizes (see the ResizeObserver in
	 * onAfterInitialRender), so theme scale changes self-heal too.
	 *
	 * Public callers can invoke {@link syncMetrics} to force a re-sync
	 * after any external change that affects editor typography.
	 */
	_syncGutterMetrics()
	{
		if (!this._lineNumbersElement || !this._editorElement)
		{
			return;
		}
		if (typeof (window) === 'undefined' || typeof (window.getComputedStyle) !== 'function')
		{
			return;
		}

		let tmpEditorStyle = window.getComputedStyle(this._editorElement);
		let tmpLineHeight = tmpEditorStyle.lineHeight;

		// `normal` is the spec default — leave the gutter untouched so the
		// stylesheet's declaration wins (we have no number to copy).
		if (tmpLineHeight && tmpLineHeight !== 'normal')
		{
			this._lineNumbersElement.style.lineHeight = tmpLineHeight;
		}

		// Match the editor's vertical padding so row 1 of the gutter sits
		// at the same y-offset as row 1 of the code.
		if (tmpEditorStyle.paddingTop)
		{
			this._lineNumbersElement.style.paddingTop = tmpEditorStyle.paddingTop;
		}
		if (tmpEditorStyle.paddingBottom)
		{
			this._lineNumbersElement.style.paddingBottom = tmpEditorStyle.paddingBottom;
		}

		// Font-family must match so the visual baseline of the digits
		// aligns with the code (different monospace fonts can have
		// different x-heights even at identical line-heights).
		if (tmpEditorStyle.fontFamily)
		{
			this._lineNumbersElement.style.fontFamily = tmpEditorStyle.fontFamily;
		}

		// Dev-time sanity check.  If the gutter's resolved row height
		// disagrees with the editor's, alignment will drift cumulatively.
		// Warn loudly so the regression is caught at the next reload
		// instead of silently accumulating pixels per line.
		if (typeof (console) !== 'undefined' && console.warn)
		{
			let tmpFirstSpan = this._lineNumbersElement.querySelector('span');
			if (tmpFirstSpan)
			{
				let tmpGutterRow = tmpFirstSpan.getBoundingClientRect().height;
				let tmpEditorRow = parseFloat(tmpLineHeight);
				if (tmpGutterRow && tmpEditorRow && Math.abs(tmpGutterRow - tmpEditorRow) > 0.5)
				{
					console.warn('[pict-section-code] gutter/editor row-height mismatch: ' +
						'gutter ' + tmpGutterRow + 'px vs editor ' + tmpEditorRow + 'px — ' +
						'line numbers will drift. Check for CSS overriding ' +
						'.pict-code-line-numbers line-height.');
				}
			}
		}
	}

	/**
	 * Public hook for hosts to force a gutter metrics re-sync after
	 * external typography changes (theme scale, font-size swap, etc.).
	 * The ResizeObserver attached at init handles most cases, but call
	 * this from an app's post-theme-change hook for belt-and-suspenders
	 * coverage.
	 */
	syncMetrics()
	{
		this._syncGutterMetrics();
	}

	/**
	 * Reset inline styles that CodeJar sets on the editor element.
	 *
	 * CodeJar forces white-space:pre-wrap and overflow-wrap:break-word so
	 * long lines wrap visually.  That breaks line-number alignment because
	 * each wrapped visual row is not a logical line.  Resetting to pre /
	 * normal makes the outer .pict-code-editor-wrap scroll horizontally.
	 */
	_resetEditorWrapStyles()
	{
		if (!this._editorElement)
		{
			return;
		}
		this._editorElement.style.whiteSpace = 'pre';
		this._editorElement.style.overflowWrap = 'normal';
	}

	/**
	 * Resolve the initial code content from address or default.
	 *
	 * @returns {string} The code content
	 */
	_resolveCodeContent()
	{
		if (this.options.CodeDataAddress)
		{
			const tmpAddressSpace =
			{
				Fable: this.fable,
				Pict: this.fable,
				AppData: this.AppData,
				Bundle: this.Bundle,
				Options: this.options
			};
			let tmpAddressedData = this.fable.manifest.getValueByHash(tmpAddressSpace, this.options.CodeDataAddress);
			if (typeof (tmpAddressedData) === 'string')
			{
				return tmpAddressedData;
			}
			else
			{
				this.log.warn(`PICT-Code Address [${this.options.CodeDataAddress}] did not return a string; it was ${typeof (tmpAddressedData)}.`);
			}
		}

		return this.options.DefaultCode || '';
	}

	/**
	 * Hook for subclasses to customize CodeJar options before instantiation.
	 *
	 * @param {object} pOptions - The CodeJar options object to modify
	 */
	customConfigureEditorOptions(pOptions)
	{
		// Override in subclass to tweak options
	}

	/**
	 * Called when the code content changes.  Override in subclasses to handle changes.
	 *
	 * @param {string} pCode - The new code content
	 */
	onCodeChange(pCode)
	{
		// Write back to data address if configured
		if (this.options.CodeDataAddress)
		{
			const tmpAddressSpace =
			{
				Fable: this.fable,
				Pict: this.fable,
				AppData: this.AppData,
				Bundle: this.Bundle,
				Options: this.options
			};
			this.fable.manifest.setValueByHash(tmpAddressSpace, this.options.CodeDataAddress, pCode);
		}
	}

	// -- Public API Methods --

	/**
	 * Get the current code content.
	 *
	 * @returns {string} The current code
	 */
	getCode()
	{
		if (!this.codeJar)
		{
			this.log.warn('PICT-Code getCode called before editor initialized.');
			return '';
		}
		return this.codeJar.toString();
	}

	/**
	 * Set the code content.
	 *
	 * @param {string} pCode - The code to set
	 */
	setCode(pCode)
	{
		if (!this.codeJar)
		{
			this.log.warn('PICT-Code setCode called before editor initialized.');
			return;
		}
		this.codeJar.updateCode(pCode);
		this._updateLineNumbers();
	}

	/**
	 * Change the editor language and re-highlight.
	 *
	 * @param {string} pLanguage - The language identifier
	 */
	setLanguage(pLanguage)
	{
		this._language = pLanguage;
		this._highlightFunction = libCreateHighlighter(pLanguage);

		if (this._editorElement)
		{
			// Update the class
			this._editorElement.className = 'pict-code-editor language-' + pLanguage;
			if (!this.options.LineNumbers)
			{
				this._editorElement.className += ' pict-code-no-line-numbers';
			}
		}

		if (this.codeJar)
		{
			// Re-create the editor with the new highlight function
			let tmpCode = this.codeJar.toString();
			this.codeJar.destroy();
			this.codeJar = this._codeJarPrototype(this._editorElement, this._highlightFunction,
			{
				tab: this.options.Tab,
				catchTab: this.options.CatchTab,
				addClosing: this.options.AddClosing
			});
			this._resetEditorWrapStyles();
			this.codeJar.updateCode(tmpCode);
			this.codeJar.onUpdate((pCode) =>
			{
				this._updateLineNumbers();
				this.onCodeChange(pCode);
			});
		}
	}

	/**
	 * Set a custom highlight function to replace the built-in highlighter.
	 * Useful for integrating Prism.js, highlight.js, or any other library.
	 *
	 * @param {function} pHighlightFunction - A function that takes a DOM element and highlights its textContent
	 */
	setHighlightFunction(pHighlightFunction)
	{
		if (typeof (pHighlightFunction) !== 'function')
		{
			this.log.error('PICT-Code setHighlightFunction requires a function.');
			return;
		}
		this._highlightFunction = pHighlightFunction;

		if (this.codeJar)
		{
			let tmpCode = this.codeJar.toString();
			this.codeJar.destroy();
			this.codeJar = this._codeJarPrototype(this._editorElement, this._highlightFunction,
			{
				tab: this.options.Tab,
				catchTab: this.options.CatchTab,
				addClosing: this.options.AddClosing
			});
			this._resetEditorWrapStyles();
			this.codeJar.updateCode(tmpCode);
			this.codeJar.onUpdate((pCode) =>
			{
				this._updateLineNumbers();
				this.onCodeChange(pCode);
			});
		}
	}

	/**
	 * Set the read-only state of the editor.
	 *
	 * @param {boolean} pReadOnly - Whether the editor should be read-only
	 */
	setReadOnly(pReadOnly)
	{
		this.options.ReadOnly = pReadOnly;
		if (this._editorElement)
		{
			this._editorElement.setAttribute('contenteditable', pReadOnly ? 'false' : 'true');
		}
	}

	/**
	 * Destroy the editor and clean up.
	 */
	destroy()
	{
		if (this._editorResizeObserver)
		{
			this._editorResizeObserver.disconnect();
			this._editorResizeObserver = null;
		}
		if (this._editorStyleObserver)
		{
			this._editorStyleObserver.disconnect();
			this._editorStyleObserver = null;
		}
		if (this.codeJar)
		{
			this.codeJar.destroy();
			this.codeJar = null;
		}
	}

	/**
	 * Marshal code content from the data address into the view.
	 */
	marshalToView()
	{
		super.marshalToView();
		if (this.codeJar && this.options.CodeDataAddress)
		{
			let tmpCode = this._resolveCodeContent();
			if (typeof (tmpCode) === 'string')
			{
				this.codeJar.updateCode(tmpCode);
				this._updateLineNumbers();
			}
		}
	}

	/**
	 * Marshal the current code content back to the data address.
	 */
	marshalFromView()
	{
		super.marshalFromView();
		if (this.codeJar && this.options.CodeDataAddress)
		{
			this.onCodeChange(this.codeJar.toString());
		}
	}
}

module.exports = PictSectionCode;

module.exports.default_configuration = _DefaultConfiguration;
module.exports.createHighlighter = libCreateHighlighter;

// Demo bundle for pict-docuserve.  Host apps that embed docuserve and
// want pict-section-code's demos visible in their docs site call
// `require('pict-section-code').registerWithDocuserve(pict)` once at
// app boot.  Silent no-op when Docuserve-Demos isn't installed.
//
// The require here is intentionally eager: browserify needs a static
// `require()` at module-toplevel to trace and bundle the demos source.
// The apparent circular dep (demos/index.js requires THIS module to
// reach the PictSectionCode class) is benign — by the time demos/
// index.js runs, `module.exports = PictSectionCode` has already
// executed, so it sees a usable class.  The `.demos` and
// `.registerWithDocuserve` attachments below run after the require
// returns, so demos/index.js never observes them being undefined.
const libCodeDemos = require('./demos');
module.exports.demos                = libCodeDemos.demos;
module.exports.registerWithDocuserve = libCodeDemos.registerWithDocuserve;
