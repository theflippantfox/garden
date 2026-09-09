<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type NoteData = {
		slug: string;
		title: string;
		date: string;
		tags: string[];
		html: string;
		backlinks: { slug: string; title: string }[];
	};

	// pi-lens-ignore: lint/correctness/noUnusedVariables
	let mode = $state<'single' | 'split'>('single');
	let primaryNote = $state<NoteData | null>(null);
	let secondaryNote = $state<NoteData | null>(null);
	// pi-lens-ignore: lint/correctness/noUnusedVariables
	let loadingPrimary = $state(false);
	// pi-lens-ignore: lint/correctness/noUnusedVariables
	let loadingSecondary = $state(false);
	let searchQuery = $state('');
	let sidebarOpen = $state(false);

	// True when the viewport is at the mobile breakpoint (matches the CSS
	// max-width: 900px). Split mode is disabled on mobile; wiki-links open in
	// the primary pane instead, and a desktop-initiated split collapses back
	// to single mode when the window shrinks.
	let isMobile = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(max-width: 900px)');
		const update = () => {
			isMobile = mq.matches;
			if (mq.matches && mode === 'split') {
				mode = 'single';
				secondaryNote = null;
			}
		};
		update();
		mq.addEventListener('change', update);
		return () => mq.removeEventListener('change', update);
	});

	// Lock page scroll when the mobile sidebar drawer is open.
	$effect(() => {
		if (sidebarOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	});

	// Close the mobile drawer when an escape key is pressed.
	$effect(() => {
		if (!sidebarOpen) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') sidebarOpen = false;
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	// pi-lens-ignore: lint/correctness/noUnusedVariables
	let filteredNotes = $derived(
		(data.notes ?? [])
			.filter((n: any) => n?.slug)
			.filter((n: any) =>
				!searchQuery.trim() || n.slug.toLowerCase().includes(searchQuery.toLowerCase())
			)
	);

	async function loadNote(slug: string): Promise<NoteData | null> {
		const res = await fetch(`/api/notes/${slug}`);
		if (!res.ok) return null;
		return res.json();
	}

	// Open from sidebar — always enters single mode
	// pi-lens-ignore: lint/correctness/noUnusedVariables
	async function openFromSidebar(slug: string) {
		if (slug === primaryNote?.slug) return;
		loadingPrimary = true;
		secondaryNote = null;
		mode = 'single';
		sidebarOpen = false; // close mobile drawer after picking a note
		try {
			primaryNote = await loadNote(slug);
		} finally {
			loadingPrimary = false;
		}
	}

	// Open wiki-link. On mobile, split mode is intentionally disabled — the
	// target opens in the primary pane so the reader never sees a cramped
	// two-up layout. On desktop it enters split mode.
	async function openWikiLink(slug: string) {
		if (slug === secondaryNote?.slug || slug === primaryNote?.slug) return;
		if (isMobile) {
			loadingPrimary = true;
			secondaryNote = null;
			mode = 'single';
			try {
				primaryNote = await loadNote(slug);
			} finally {
				loadingPrimary = false;
			}
			return;
		}
		loadingSecondary = true;
		try {
			const note = await loadNote(slug);
			if (note) {
				secondaryNote = note;
				mode = 'split';
			}
		} finally {
			loadingSecondary = false;
		}
	}

	// pi-lens-ignore: lint/correctness/noUnusedVariables
	function closeSecondary() {
		secondaryNote = null;
		mode = 'single';
	}

	// pi-lens-ignore: lint/correctness/noUnusedVariables
	function swapNotes() {
		const tmp = primaryNote;
		primaryNote = secondaryNote;
		secondaryNote = tmp;
	}

	onMount(() => {
		const handler = (e: Event) => {
			const slug = (e as CustomEvent).detail.slug as string;
			openWikiLink(slug);
		};
		document.addEventListener('wiki-navigate', handler);
		return () => document.removeEventListener('wiki-navigate', handler);
	});
</script>

<div class="app-layout" class:sidebar-open={sidebarOpen}>
	<aside class="sidebar">
		<div class="sidebar-header">
			<span class="brand-icon">✦</span>
			<span class="brand-name">garden</span>
		</div>

		<div class="sidebar-search">
			<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
			</svg>
			<input
				type="search"
				placeholder="Search notes..."
				autocomplete="off"
				spellcheck="false"
				bind:value={searchQuery}
			/>
		</div>

		<nav class="sidebar-nav">
			<div class="nav-label">notes</div>
			<ul class="note-list">
				{#each filteredNotes as note, i (note.slug ?? `note-${i}`)}
					<li>
						<button
							class="note-item"
							class:active={primaryNote?.slug === note.slug || secondaryNote?.slug === note.slug}
							onclick={() => openFromSidebar(note.slug)}
						>
							<span class="note-dot"></span>
							{note.slug}
						</button>
					</li>
				{/each}
			</ul>
		</nav>

		<div class="sidebar-footer">
			<span>{data.total} notes</span>
			<span class="dot-sep">·</span>
			<a href="/tags">{data.tagCount} tags</a>
		</div>
	</aside>

	{#if sidebarOpen}
		<button class="backdrop" aria-label="Close sidebar" onclick={() => (sidebarOpen = false)}></button>
	{/if}

	<main class="main">
		<div class="topbar">
			<button
				class="hamburger"
				class:open={sidebarOpen}
				aria-label="Toggle sidebar"
				aria-expanded={sidebarOpen}
				onclick={() => (sidebarOpen = !sidebarOpen)}
			>
				<span></span><span></span><span></span>
			</button>
			<div class="topbar-title">garden</div>
			{#if primaryNote}
				<span class="breadcrumb-sep">›</span>
				<span class="breadcrumb-note">{primaryNote.slug}</span>
			{/if}
			{#if mode === 'split'}
				<div class="topbar-actions">
					<button class="topbar-btn" onclick={swapNotes} title="Swap panes">⇄</button>
					<button class="topbar-btn" onclick={closeSecondary} title="Close second pane">✕</button>
				</div>
			{/if}
		</div>

		<div class="panes" class:split={mode === 'split'}>
			<section class="pane primary-pane">
				{#if loadingPrimary}
					<div class="empty-state"><div class="spinner"></div></div>
				{:else if primaryNote}
					<article class="pane-scroll">
						<div class="note-header">
							<h1 class="note-title">{primaryNote.slug}</h1>
							{#if primaryNote.date}<time class="note-date">{primaryNote.date}</time>{/if}
							{#if primaryNote.tags?.length > 0}
								<div class="note-tags">
									{#each primaryNote.tags as t}
										<a class="note-tag" href={`/tags/${t}`}>{t}</a>
								{/each}
								</div>
							{/if}
						</div>
						<div class="prose">
							{@html primaryNote.html}
						</div>
					</article>
				{:else}
					<div class="empty-state">
						<div class="empty-icon">✦</div>
						<p>Select a note to begin reading</p>
						<p class="empty-hint">Choose from the sidebar, or search above</p>
					</div>
				{/if}
			</section>

			{#if mode === 'split'}
				<div class="pane-divider"></div>
				<section class="pane secondary-pane">
					{#if loadingSecondary}
						<div class="empty-state"><div class="spinner"></div></div>
					{:else if secondaryNote}
						<article class="pane-scroll">
							<div class="note-header">
								<h1 class="note-title">{secondaryNote.slug}</h1>
								{#if secondaryNote.date}<time class="note-date">{secondaryNote.date}</time>{/if}
								{#if secondaryNote.tags?.length > 0}
									<div class="note-tags">
										{#each secondaryNote.tags as t}
											<a class="note-tag" href={`/tags/${t}`}>{t}</a>
									{/each}
									</div>
								{/if}
							</div>
							<div class="prose">
								{@html secondaryNote.html}
							</div>
							{#if secondaryNote.backlinks?.length > 0}
								<div class="backlinks-section">
									<h3 class="backlinks-label">Referenced by</h3>
									<div class="backlinks-list">
										{#each (secondaryNote.backlinks ?? []).filter(bl => bl?.slug) as bl (bl.slug)}
											<button class="backlink-chip" onclick={() => openWikiLink(bl.slug)}>
												{bl.title || bl.slug}
											</button>
										{/each}
									</div>
								</div>
							{/if}
					</article>
					{:else}
						<div class="empty-state">
							<p class="empty-hint">Wiki-links open here</p>
						</div>
					{/if}
				</section>
			{/if}
		</div>
	</main>
</div>

<style>
	/* Layout shell */
	.app-layout {
		display: grid;
		grid-template-columns: 260px 1fr;
		height: 100dvh;
		overflow: hidden;
	}

	/* ── Sidebar ── */
	.sidebar {
		background: var(--surface);
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1.25rem 1rem 0.25rem;
	}

	.brand-icon {
		font-size: 1.5rem;
		line-height: 1;
		color: var(--accent);
	}

	.brand-name {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text);
		letter-spacing: -0.01em;
	}

	/* Search */
	.sidebar-search {
		position: relative;
		padding: 0.75rem 0.75rem 0.5rem;
	}

	.sidebar-search .search-icon {
		position: absolute;
		left: 1.15rem;
		top: 50%;
		transform: translateY(-50%);
		width: 14px;
		height: 14px;
		color: var(--text-muted);
		pointer-events: none;
	}

	.sidebar-search input {
		width: 100%;
		padding: 0.45rem 0.6rem 0.45rem 2rem;
		background: var(--code-bg);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		color: var(--text);
		font-size: 0.825rem;
		font-family: inherit;
		transition: border-color 150ms;
		outline: none;
	}
	.sidebar-search input:focus { border-color: var(--accent); }
	.sidebar-search input::placeholder { color: var(--text-muted); }

	/* Note list */
	.sidebar-nav {
		flex: 1;
		overflow-y: auto;
		padding: 0.25rem 0.5rem;
	}

	.nav-label {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		padding: 0.25rem 0.5rem 0.5rem;
	}

	.note-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.note-item {
		width: 100%;
		padding: 0.4rem 0.5rem;
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		text-align: left;
		cursor: pointer;
		color: var(--text-secondary);
		font-size: 0.825rem;
		font-family: 'JetBrains Mono', monospace;
		transition: all 150ms;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.note-item:hover {
		background: var(--surface-hover);
		color: var(--text);
	}
	.note-item.active {
		background: var(--accent-subtle);
		color: var(--accent);
		font-weight: 500;
	}

	.note-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--text-muted);
		flex-shrink: 0;
		transition: all 150ms;
	}
	.note-item.active .note-dot {
		background: var(--accent);
		transform: scale(1.3);
	}

	/* Footer */
	.sidebar-footer {
		margin-top: auto;
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--border);
		font-size: 0.7rem;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.dot-sep { opacity: 0.4; }
	.sidebar-footer a {
		color: var(--accent);
		text-decoration: none;
	}
	.sidebar-footer a:hover { color: var(--accent-hover); }

	/* ── Backdrop (mobile) ── */
	.backdrop {
		display: none;
	}

	/* ── Main area ── */
	.main {
		background: var(--bg);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* Topbar (mobile only) */
	.topbar {
		display: none;
	}

	/* Panes */
	.panes {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr;
		overflow: hidden;
	}

	.panes.split {
		grid-template-columns: 1fr 1px 1fr;
		grid-template-rows: 1fr;
	}

	.pane {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.pane-divider {
		display: none;
	}

	.panes.split .pane-divider {
		display: block;
		width: 1px;
		background: var(--border);
	}

	.pane-scroll {
		flex: 1;
		overflow-y: auto;
		padding: 2.5rem 2.5rem 3rem;
	}

	.note-header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border);
	}

	.note-title {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text);
		margin: 0;
		line-height: 1.3;
		letter-spacing: -0.02em;
	}

	.note-date {
		display: inline-block;
		margin-top: 0.5rem;
		font-size: 0.8rem;
		color: var(--text-muted);
		font-family: 'JetBrains Mono', monospace;
	}

	.note-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.75rem;
	}

	.note-tag {
		font-size: 0.7rem;
		padding: 0.15rem 0.55rem;
		background: var(--accent-subtle);
		color: var(--accent);
		border-radius: 999px;
		text-decoration: none;
		transition: all 150ms;
		font-weight: 500;
	}
	.note-tag:hover {
		background: var(--accent);
		color: #fff;
	}

	/* Empty state */
	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		gap: 0.75rem;
	}
	.empty-icon {
		font-size: 3rem;
		color: var(--accent);
		opacity: 0.25;
		animation: pulse 3s ease-in-out infinite;
	}
	.empty-state p {
		margin: 0;
		font-size: 0.95rem;
	}
	.empty-hint {
		font-size: 0.8rem !important;
		opacity: 0.5;
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	/* ── Prose ── */
	.prose {
		font-size: 1rem;
		line-height: 1.8;
		color: #c0c0d0;
		max-width: 720px;
	}

	.prose :global(h1),
	.prose :global(h2),
	.prose :global(h3) {
		color: var(--text);
		font-weight: 600;
		line-height: 1.3;
		margin: 2rem 0 0.75rem;
	}
	.prose :global(h1) { font-size: 1.5rem; }
	.prose :global(h2) {
		font-size: 1.2rem;
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.3rem;
	}
	.prose :global(h3) { font-size: 1.05rem; }

	.prose :global(p) { margin: 0 0 1rem; }
	.prose :global(a) { color: var(--link); }
	.prose :global(a:hover) { color: #93c5fd; }
	.prose :global(a.wiki) {
		color: var(--accent);
		cursor: pointer;
		text-decoration: none;
		border-bottom: 1px dashed var(--accent);
		transition: all 150ms;
	}
	.prose :global(a.wiki:hover) {
		color: var(--accent-hover);
		border-bottom-style: solid;
	}
	.prose :global(strong) { color: var(--text); font-weight: 600; }
	.prose :global(em) { color: var(--text-secondary); }
	.prose :global(code) {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.875em;
	}
	.prose :global(:not(pre) > code) {
		background: var(--code-inline-bg);
		color: var(--accent);
		padding: 0.15em 0.4em;
		border-radius: 4px;
		border: 1px solid var(--border);
	}
	.prose :global(pre) {
		background: var(--code-bg);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 1rem;
		overflow-x: auto;
		margin: 1rem 0;
	}
	.prose :global(pre code) {
		background: none;
		padding: 0;
		border: none;
		color: var(--text);
	}
	.prose :global(ul),
	.prose :global(ol) {
		margin: 0 0 1rem 1.25rem;
	}
	.prose :global(li) { margin: 0.25rem 0; }
	.prose :global(blockquote) {
		border-left: 3px solid var(--accent);
		margin: 1rem 0;
		padding: 0.6rem 1rem;
		color: var(--text-secondary);
		background: var(--accent-subtle);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	}

	/* ── Callouts (Obsidian `> [!type]` syntax) ── */
	.prose :global(.callout) {
		--callout-color: #94a3b8;
		--callout-bg: rgba(148, 163, 184, 0.09);
		--callout-glyph: "ℹ";
		border: 1px solid var(--border);
		border-left: 3px solid var(--callout-color);
		background: var(--callout-bg);
		border-radius: var(--radius-sm);
		padding: 0.85rem 1.1rem;
		margin: 1.25rem 0;
	}
	.prose :global(.callout-title) {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin-bottom: 0.5rem;
		color: var(--callout-color);
		font-weight: 600;
		font-size: 0.95rem;
		letter-spacing: 0.01em;
		text-transform: capitalize;
	}
	.prose :global(.callout-icon) {
		display: inline-grid;
		place-items: center;
		width: 1.5em;
		height: 1.5em;
		border-radius: 0.4em;
		background: var(--callout-color);
		color: #0a0a12;
		font-size: 0.8em;
		font-weight: 700;
		font-family: 'Inter', sans-serif;
		flex: none;
	}
	.prose :global(.callout-icon::before) {
		content: var(--callout-glyph, "ℹ");
	}
	.prose :global(.callout-body > :first-child) {
		margin-top: 0;
	}
	.prose :global(.callout-body > :last-child) {
		margin-bottom: 0;
	}
	.prose :global(.callout-body p) {
		margin: 0.4rem 0;
		color: var(--text-secondary);
	}
	.prose :global(.callout-body ul),
	.prose :global(.callout-body ol) {
		margin: 0.25rem 0 0.25rem 1.25rem;
		color: var(--text-secondary);
	}
	.prose :global(.callout-body li) {
		margin: 0.15rem 0;
	}
	.prose :global(.callout[data-callout="note"]) {
		--callout-color: #6da0ef;
		--callout-bg: rgba(109, 160, 239, 0.09);
		--callout-glyph: "✎";
	}
	.prose :global(.callout[data-callout="abstract"]) {
		--callout-color: #64c8c8;
		--callout-bg: rgba(100, 200, 200, 0.09);
		--callout-glyph: "≡";
	}
	.prose :global(.callout[data-callout="info"]) {
		--callout-color: #4fb3d9;
		--callout-bg: rgba(79, 179, 217, 0.09);
		--callout-glyph: "i";
	}
	.prose :global(.callout[data-callout="todo"]) {
		--callout-color: #6da0ef;
		--callout-bg: rgba(109, 160, 239, 0.09);
		--callout-glyph: "☐";
	}
	.prose :global(.callout[data-callout="tip"]) {
		--callout-color: #57c785;
		--callout-bg: rgba(87, 199, 133, 0.09);
		--callout-glyph: "✦";
	}
	.prose :global(.callout[data-callout="success"]) {
		--callout-color: #57c785;
		--callout-bg: rgba(87, 199, 133, 0.09);
		--callout-glyph: "✓";
	}
	.prose :global(.callout[data-callout="question"]) {
		--callout-color: #d985b2;
		--callout-bg: rgba(217, 133, 178, 0.09);
		--callout-glyph: "?";
	}
	.prose :global(.callout[data-callout="warning"]) {
		--callout-color: #e6b455;
		--callout-bg: rgba(230, 180, 85, 0.09);
		--callout-glyph: "!";
	}
	.prose :global(.callout[data-callout="failure"]),
	.prose :global(.callout[data-callout="danger"]),
	.prose :global(.callout[data-callout="bug"]) {
		--callout-color: #e05555;
		--callout-bg: rgba(224, 85, 85, 0.09);
		--callout-glyph: "✕";
	}
	.prose :global(.callout[data-callout="example"]) {
		--callout-color: #a78bfa;
		--callout-bg: rgba(167, 139, 250, 0.09);
		--callout-glyph: "◆";
	}
	.prose :global(.callout[data-callout="quote"]) {
		--callout-color: #94a3b8;
		--callout-bg: rgba(148, 163, 184, 0.09);
		--callout-glyph: "❝";
	}
	.prose :global(.callout[data-callout="default"]) {
		--callout-color: #8888a0;
		--callout-bg: rgba(136, 136, 160, 0.09);
		--callout-glyph: "ℹ";
	}
	.prose :global(hr) {
		border: none;
		border-top: 1px solid var(--border);
		margin: 2rem 0;
	}
	.prose :global(table) {
		border-collapse: collapse;
		width: 100%;
		margin: 1rem 0;
	}
	.prose :global(th),
	.prose :global(td) {
		border: 1px solid var(--border);
		padding: 0.5rem 0.75rem;
		text-align: left;
	}
	.prose :global(th) {
		background: var(--surface);
		color: var(--text);
	}

	/* ── Backlinks ── */
	.backlinks-section {
		margin-top: 2.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}

	.backlinks-label {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		margin: 0 0 0.75rem;
	}

	.backlinks-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.backlink-chip {
		padding: 0.3rem 0.75rem;
		background: var(--accent-subtle);
		color: var(--accent);
		border: 1px solid transparent;
		border-radius: 999px;
		font-size: 0.8rem;
		font-family: 'JetBrains Mono', monospace;
		cursor: pointer;
		transition: all 150ms;
	}
	.backlink-chip:hover {
		border-color: var(--accent);
		background: var(--accent);
		color: #fff;
	}

	/* ── Mobile ── */
	@media (max-width: 900px) {
		.app-layout {
			display: flex;
			flex-direction: column;
			height: 100dvh;
			overflow: hidden;
		}

		.main {
			flex: 1;
			min-height: 0;
			grid-template-columns: 1fr;
		}

		.panes {
			flex: 1;
			min-height: 0;
		}


		.backdrop {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 45;
			border: none;
			padding: 0;
			cursor: pointer;
		}

		.sidebar {
			position: fixed;
			top: 0;
			left: 0;
			bottom: 0;
			width: min(300px, 85vw);
			z-index: 50;
			transform: translateX(-105%);
			transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
			box-shadow: 4px 0 24px rgba(0, 0, 0, 0.6);
		}
		.sidebar-open .sidebar {
			transform: translateX(0);
		}

		.topbar {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			padding: 0.5rem 0.75rem;
			padding-top: calc(0.5rem + env(safe-area-inset-top));
			background: var(--surface);
			border-bottom: 1px solid var(--border);
			flex-shrink: 0;
			z-index: 30;
		}

		.hamburger {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 4px;
			width: 36px;
			height: 36px;
			padding: 0;
			background: transparent;
			border: 1px solid var(--border);
			border-radius: var(--radius-sm);
			cursor: pointer;
			flex-shrink: 0;
		}
		.hamburger span {
			display: block;
			width: 16px;
			height: 2px;
			background: var(--text);
			border-radius: 1px;
			transition: all 200ms ease;
		}
		.hamburger.open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
		.hamburger.open span:nth-child(2) { opacity: 0; }
		.hamburger.open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

		.topbar-title {
			font-size: 0.95rem;
			font-weight: 600;
			color: var(--text);
		}

		.breadcrumb-sep {
			color: var(--text-muted);
			font-size: 0.85rem;
		}
		.breadcrumb-note {
			font-size: 0.8rem;
			color: var(--text-secondary);
			font-family: 'JetBrains Mono', monospace;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.topbar-actions {
			margin-left: auto;
			display: flex;
			gap: 0.25rem;
		}
		.topbar-btn {
			width: 32px;
			height: 32px;
			background: transparent;
			border: 1px solid var(--border);
			border-radius: var(--radius-sm);
			color: var(--text-secondary);
			cursor: pointer;
			display: grid;
			place-items: center;
			font-size: 0.8rem;
		}
		.topbar-btn:hover {
			background: var(--surface-hover);
			color: var(--text);
		}

		.panes.split {
			grid-template-columns: 1fr;
			grid-template-rows: 1fr 1fr;
		}
		.pane-divider { display: none !important; }
		.secondary-pane {
			border-top: 1px solid var(--border);
		}

		.pane-scroll {
			padding: 1.5rem 1rem 2rem;
		}

		.note-title {
			font-size: 1.35rem;
		}

		/* Tighter list indentation on narrow screens — less wasted horizontal space */
		.prose :global(ul),
		.prose :global(ol) {
			margin-left: 0.75rem;
			padding-left: 0.25rem;
		}
		.prose :global(ul ul),
		.prose :global(ul ol),
		.prose :global(ol ul),
		.prose :global(ol ol) {
			margin-left: 0.5rem;
		}
	}
</style>
