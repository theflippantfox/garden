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

	let mode = $state<'single' | 'split'>('single');
	let primaryNote = $state<NoteData | null>(null);
	let secondaryNote = $state<NoteData | null>(null);
	let loadingPrimary = $state(false);
	let loadingSecondary = $state(false);
	let searchQuery = $state('');

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
	async function openFromSidebar(slug: string) {
		if (slug === primaryNote?.slug) return;
		loadingPrimary = true;
		secondaryNote = null;
		mode = 'single';
		try {
			primaryNote = await loadNote(slug);
		} finally {
			loadingPrimary = false;
		}
	}

	// Open wiki-link — enters split mode
	async function openWikiLink(slug: string) {
		if (slug === secondaryNote?.slug || slug === primaryNote?.slug) return;
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

	function closeSecondary() {
		secondaryNote = null;
		mode = 'single';
	}

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

<div class="home">
	<aside class="sidebar">
		<div class="brand">
			<div class="logo">🌱</div>
			<h1>Garden</h1>
		</div>

		<div class="search-box">
			<input
				type="search"
				placeholder="Search notes..."
				autocomplete="off"
				spellcheck="false"
				bind:value={searchQuery}
			/>
		</div>

		<section class="section">
			<h2>Notes</h2>
			<ul class="note-list">
				{#each filteredNotes as note, i (note.slug ?? `note-${i}`)}
					<li>
						<button
							class="note-item"
							class:active={primaryNote?.slug === note.slug || secondaryNote?.slug === note.slug}
							onclick={() => openFromSidebar(note.slug)}
						>
							{note.slug}
						</button>
					</li>
				{/each}
			</ul>
		</section>

		<div class="stats">
			{data.total} notes · {data.tagCount} tags
		</div>
	</aside>

	<main class="main" class:split={mode === 'split'}>
		<!-- Primary pane -->
		<div class="pane pane-primary">
			{#if loadingPrimary}
				<div class="pane-loading">Loading...</div>
			{:else if primaryNote}
				<div class="pane-header">
					<span class="pane-label">{mode === 'split' ? 'Primary' : 'Reading'}</span>
					{#if mode === 'split'}
						<button class="icon-btn" onclick={swapNotes} title="Swap panes">⇄</button>
					{/if}
				</div>
				<div class="pane-content">
					<div class="note-title-bar">{primaryNote.slug}</div>
					<div class="prose">
						{@html primaryNote.html}
					</div>
				</div>
			{:else}
				<div class="pane-empty">
					<div class="empty-icon">📖</div>
					<p>Select a note from the sidebar</p>
				</div>
			{/if}
		</div>

		<!-- Secondary pane (split mode only) -->
		<div class="pane pane-secondary" class:visible={mode === 'split'}>
			{#if loadingSecondary}
				<div class="pane-loading">Loading...</div>
			{:else if secondaryNote}
				<div class="pane-header">
					<span class="pane-label">Reading</span>
					<button class="icon-btn" onclick={closeSecondary} title="Close">✕</button>
				</div>
				<div class="pane-content">
					<div class="note-title-bar">{secondaryNote.slug}</div>
					<div class="prose">
						{@html secondaryNote.html}
					</div>

					{#if secondaryNote.backlinks && secondaryNote.backlinks.length > 0}
						<aside class="backlinks">
							<h3>Linked from</h3>
							<ul>
								{#each (secondaryNote.backlinks ?? []).filter(bl => bl?.slug) as bl (bl.slug)}
									<li>
										<button class="backlink-btn" onclick={() => openWikiLink(bl.slug)}>
											{bl.slug}
										</button>
									</li>
								{/each}
							</ul>
						</aside>
					{/if}
				</div>
			{:else}
				<div class="pane-empty">
					<p>Link opened here</p>
				</div>
			{/if}
		</div>
	</main>
</div>

<style>
	.home {
		display: grid;
		grid-template-columns: 280px 1fr;
		height: 100vh;
		overflow: hidden;
	}

	/* Sidebar */
	.sidebar {
		background: #0f0f14;
		border-right: 1px solid #1f1f28;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 1.5rem 1rem;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.logo { font-size: 2rem; line-height: 1; }
	.brand h1 { font-size: 1.4rem; font-weight: 700; margin: 0; color: #f4f4f5; }

	.search-box { margin-bottom: 1.5rem; }
	.search-box input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		background: #1a1a24;
		border: 1px solid #27272f;
		border-radius: 6px;
		color: #e4e4e7;
		font-size: 0.9rem;
		font-family: inherit;
		transition: border-color 0.15s;
	}
	.search-box input:focus { outline: none; border-color: #60a5fa; background: #0f0f14; }
	.search-box input::placeholder { color: #52525b; }

	.section { flex: 1; margin-bottom: 1.5rem; }
	.section h2 {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #52525b;
		margin: 0 0 0.5rem 0.25rem;
	}

	.note-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1px; }

	.note-item {
		width: 100%;
		padding: 0.5rem 0.625rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 5px;
		text-align: left;
		cursor: pointer;
		color: #a1a1aa;
		font-size: 0.85rem;
		font-family: 'JetBrains Mono', monospace;
		transition: all 0.12s;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.note-item:hover { background: #1a1a24; color: #e4e4e7; border-color: #27272f; }
	.note-item.active { background: #1c1c28; color: #f4f4f5; border-color: #3f3f50; }

	.stats {
		padding-top: 1rem;
		font-size: 0.75rem;
		color: #3f3f46;
	}

	/* Main / panes */
	.main {
		display: grid;
		grid-template-columns: 1fr;
		overflow: hidden;
		background: #0a0a0f;
		transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.main.split {
		grid-template-columns: 1fr 1fr;
	}

	.pane {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		transition: opacity 0.3s ease, transform 0.3s ease;
	}

	.main:not(.split) .pane-secondary {
		display: none;
	}

	.main.split .pane-secondary {
		border-left: 1px solid #1a1a24;
	}

	.pane-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.625rem 1.25rem;
		background: #0f0f14;
		border-bottom: 1px solid #1a1a24;
		flex-shrink: 0;
	}

	.pane-label {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #52525b;
	}

	.icon-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: #52525b;
		font-size: 1rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		transition: color 0.15s, background 0.15s;
	}
	.icon-btn:hover { color: #e4e4e7; background: #1a1a24; }

	.pane-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem 2rem 2rem;
	}

	.note-title-bar {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.8rem;
		color: #52525b;
		margin-bottom: 1.25rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #1a1a24;
	}

	.pane-empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #3f3f46;
		gap: 0.5rem;
	}
	.empty-icon { font-size: 3.5rem; opacity: 0.3; }
	.pane-empty p { margin: 0; font-size: 0.9rem; }

	.pane-loading {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #52525b;
		font-size: 0.9rem;
	}

	/* Prose */
	.prose {
		font-size: 1rem;
		line-height: 1.75;
		color: #d4d4d8;
		max-width: 720px;
	}

	.prose :global(h1),
	.prose :global(h2),
	.prose :global(h3) {
		color: #f4f4f5;
		font-weight: 600;
		line-height: 1.3;
		margin: 1.75rem 0 0.75rem;
	}
	.prose :global(h1) { font-size: 1.75rem; }
	.prose :global(h2) { font-size: 1.25rem; border-bottom: 1px solid #1f1f28; padding-bottom: 0.3rem; }
	.prose :global(h3) { font-size: 1.05rem; }

	.prose :global(p) { margin: 0 0 1rem; }
	.prose :global(a) { color: #60a5fa; }
	.prose :global(a.wiki) { color: #a78bfa; cursor: pointer; }
	.prose :global(a.wiki:hover) { color: #c4b5fd; text-decoration: underline; }
	.prose :global(strong) { color: #f4f4f5; font-weight: 600; }
	.prose :global(em) { color: #e4e4e7; }
	.prose :global(code) { font-family: 'JetBrains Mono', monospace; font-size: 0.875em; }
	.prose :global(:not(pre) > code) {
		background: #1a1a24;
		color: #a78bfa;
		padding: 0.15em 0.4em;
		border-radius: 4px;
		border: 1px solid #27272f;
	}
	.prose :global(pre) {
		background: #0f0f14;
		border: 1px solid #1f1f28;
		border-radius: 8px;
		padding: 1rem;
		overflow-x: auto;
		margin: 1rem 0;
	}
	.prose :global(pre code) { background: none; padding: 0; border: none; color: #e4e4e7; }
	.prose :global(ul), .prose :global(ol) { margin: 0 0 1rem 1.25rem; }
	.prose :global(li) { margin: 0.25rem 0; }
	.prose :global(blockquote) {
		border-left: 3px solid #3f3f50;
		margin: 1rem 0;
		padding: 0.5rem 1rem;
		color: #71717a;
	}
	.prose :global(hr) { border: none; border-top: 1px solid #1f1f28; margin: 1.5rem 0; }
	.prose :global(table) { border-collapse: collapse; width: 100%; margin: 1rem 0; }
	.prose :global(th), .prose :global(td) {
		border: 1px solid #27272f;
		padding: 0.5rem 0.75rem;
		text-align: left;
	}
	.prose :global(th) { background: #0f0f14; color: #f4f4f5; }

	/* Backlinks */
	.backlinks {
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid #1f1f28;
	}
	.backlinks h3 {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #52525b;
		margin: 0 0 0.5rem 0;
	}
	.backlinks ul { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.backlinks li { margin: 0; }
	.backlink-btn {
		background: #1a1a24;
		border: 1px solid #27272f;
		color: #a78bfa;
		padding: 0.25rem 0.625rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-family: 'JetBrains Mono', monospace;
		cursor: pointer;
		transition: all 0.12s;
	}
	.backlink-btn:hover { border-color: #a78bfa; color: #c4b5fd; }
</style>
