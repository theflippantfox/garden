<!--
  Home: search + browse with dual-pane navigation.
  Clicking a note opens it in the right pane without navigation.
-->
<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type ResultRow = { slug: string; title: string; excerpt: string };

	let query = $state('');
	let results = $state<ResultRow[]>([]);
	let searching = $state(false);
	let selectedNote = $state<any>(null);
	let loadingNote = $state(false);

	async function runSearch(q: string) {
		query = q;
		if (!q.trim()) {
			results = [];
			return;
		}
		searching = true;
		try {
			const { search } = await import('$lib/client/search');
			const r = await search(q);
			results = r.map((hit) => ({
				slug: hit.item.slug,
				title: hit.item.title,
				excerpt: hit.item.excerpt
			}));
		} finally {
			searching = false;
		}
	}

	function onInput(e: Event) {
		const v = (e.target as HTMLInputElement).value;
		runSearch(v);
	}

	async function openNote(slug: string, e?: MouseEvent) {
		if (e) e.preventDefault();
		loadingNote = true;
		try {
			const res = await fetch(`/api/notes/${slug}`);
			if (res.ok) {
				selectedNote = await res.json();
			}
		} finally {
			loadingNote = false;
		}
	}

	function closeNote() {
		selectedNote = null;
	}
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
				value={query}
				oninput={onInput}
				autocomplete="off"
				spellcheck="false"
			/>
		</div>

		{#if query && results.length > 0}
			<section class="section">
				<h2>Results</h2>
				<ul class="note-list">
					{#each results as r (r.slug)}
						<li>
							<button class="note-item" onclick={(e) => openNote(r.slug, e)}>
								<div class="note-title">{r.title}</div>
								{#if r.excerpt}
									<div class="note-excerpt">{r.excerpt}</div>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{:else if query && !searching}
			<p class="empty">No matches.</p>
		{/if}

		{#if !query}
			<section class="section">
				<h2>Recent</h2>
				{#if data.notes.length === 0}
					<p class="empty">No notes yet. Drop markdown files into <code>notes/</code>.</p>
				{:else}
					<ul class="note-list">
						{#each data.notes as note (note.slug)}
							<li>
								<button class="note-item" onclick={(e) => openNote(note.slug, e)}>
									<div class="note-title">{note.title}</div>
									<div class="note-meta">
										{#if note.date}<span class="date">{note.date}</span>{/if}
										{#if note.tags.length > 0}
											<span class="tags">
												{#each note.tags as t (t)}
													<span class="tag">#{t}</span>
												{/each}
											</span>
										{/if}
									</div>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="section">
				<h2>Browse</h2>
				<nav class="nav-links">
					<a href="/tags">All Tags →</a>
				</nav>
			</section>

			<div class="stats">
				{data.total} note{data.total === 1 ? '' : 's'} • {data.tagCount} tag{data.tagCount === 1
					? ''
					: 's'}
			</div>
		{/if}
	</aside>

	<main class="content">
		{#if loadingNote}
			<div class="loading">Loading...</div>
		{:else if selectedNote}
			<article class="note-view">
				<button class="close-btn" onclick={closeNote}>✕</button>
				<header>
					<h1>{selectedNote.title}</h1>
					<div class="meta">
						{#if selectedNote.date}
							<span class="date">{selectedNote.date}</span>
						{/if}
						{#if selectedNote.tags.length > 0}
							<div class="tags">
								{#each selectedNote.tags as t (t)}
									<span class="tag">#{t}</span>
								{/each}
							</div>
						{/if}
					</div>
				</header>

				<div class="prose">
					{@html selectedNote.html}
				</div>

				{#if selectedNote.backlinks && selectedNote.backlinks.length > 0}
					<aside class="backlinks">
						<h3>Linked from</h3>
						<ul>
							{#each selectedNote.backlinks as bl (bl)}
								<li>
									<button class="backlink-btn" onclick={() => openNote(bl)}>
										{bl}
									</button>
								</li>
							{/each}
						</ul>
					</aside>
				{/if}
			</article>
		{:else}
			<div class="empty-state">
				<div class="icon">📖</div>
				<h2>Select a note to begin</h2>
				<p>Search or browse notes in the sidebar</p>
			</div>
		{/if}
	</main>
</div>

<style>
	.home {
		display: grid;
		grid-template-columns: 360px 1fr;
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
		padding: 2rem 1.5rem;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 2rem;
	}

	.logo {
		font-size: 2rem;
		line-height: 1;
	}

	.brand h1 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
		color: #f4f4f5;
	}

	.search-box {
		margin-bottom: 2rem;
	}

	.search-box input {
		width: 100%;
		padding: 0.75rem 1rem;
		background: #1a1a24;
		border: 1px solid #27272f;
		border-radius: 8px;
		color: #e4e4e7;
		font-size: 0.95rem;
		font-family: inherit;
		transition: all 0.15s ease;
	}

	.search-box input:focus {
		outline: none;
		border-color: #60a5fa;
		background: #0f0f14;
	}

	.search-box input::placeholder {
		color: #71717a;
	}

	.section {
		margin-bottom: 2.5rem;
	}

	.section h2 {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
		margin: 0 0 1rem 0;
	}

	.note-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.note-item {
		width: 100%;
		padding: 0.875rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 6px;
		text-align: left;
		cursor: pointer;
		transition: all 0.15s ease;
		color: inherit;
		font-family: inherit;
	}

	.note-item:hover {
		background: #1a1a24;
		border-color: #27272f;
	}

	.note-title {
		font-weight: 500;
		color: #f4f4f5;
		margin-bottom: 0.25rem;
	}

	.note-excerpt {
		font-size: 0.85rem;
		color: #a1a1aa;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.note-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.8rem;
		color: #71717a;
		margin-top: 0.5rem;
	}

	.date {
		color: #71717a;
	}

	.tags {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.tag {
		background: #1a1a24;
		color: #a78bfa;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.nav-links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.nav-links a {
		padding: 0.625rem 0.875rem;
		color: #a1a1aa;
		border-radius: 6px;
		transition: all 0.15s ease;
		font-size: 0.9rem;
	}

	.nav-links a:hover {
		background: #1a1a24;
		color: #e4e4e7;
	}

	.stats {
		margin-top: auto;
		padding-top: 2rem;
		font-size: 0.8rem;
		color: #52525b;
	}

	.empty {
		color: #71717a;
		font-size: 0.9rem;
		padding: 1rem 0.875rem;
	}

	/* Main content */
	.content {
		overflow-y: auto;
		background: #0a0a0f;
	}

	.empty-state {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #71717a;
		padding: 2rem;
	}

	.empty-state .icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #a1a1aa;
		margin: 0 0 0.5rem 0;
	}

	.empty-state p {
		margin: 0;
		font-size: 0.95rem;
	}

	.loading {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #71717a;
		font-size: 1.1rem;
	}

	.note-view {
		max-width: 800px;
		margin: 0 auto;
		padding: 3rem 2rem;
		position: relative;
	}

	.close-btn {
		position: absolute;
		top: 2rem;
		right: 2rem;
		width: 2rem;
		height: 2rem;
		border-radius: 6px;
		border: 1px solid #27272f;
		background: #1a1a24;
		color: #71717a;
		font-size: 1.2rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
	}

	.close-btn:hover {
		background: #0f0f14;
		border-color: #3f3f46;
		color: #a1a1aa;
	}

	.note-view header {
		margin-bottom: 2.5rem;
	}

	.note-view h1 {
		font-size: 2.5rem;
		font-weight: 700;
		line-height: 1.2;
		margin: 0 0 1rem 0;
		color: #f4f4f5;
	}

	.note-view .meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.9rem;
	}

	.note-view .meta .date {
		color: #71717a;
	}

	.note-view .meta .tags {
		display: flex;
		gap: 0.5rem;
	}

	.note-view .meta .tag {
		background: #1a1a24;
		color: #a78bfa;
		padding: 0.25rem 0.625rem;
		border-radius: 4px;
		font-size: 0.85rem;
	}

	.prose {
		font-size: 1.05rem;
		line-height: 1.75;
		color: #d4d4d8;
	}

	.prose :global(h1),
	.prose :global(h2),
	.prose :global(h3) {
		color: #f4f4f5;
		font-weight: 600;
		line-height: 1.3;
		margin: 2rem 0 1rem;
	}

	.prose :global(h1) {
		font-size: 2rem;
	}
	.prose :global(h2) {
		font-size: 1.5rem;
	}
	.prose :global(h3) {
		font-size: 1.25rem;
	}

	.prose :global(p) {
		margin: 1.25rem 0;
	}

	.prose :global(ul),
	.prose :global(ol) {
		margin: 1.25rem 0;
		padding-left: 1.75rem;
	}

	.prose :global(li) {
		margin: 0.5rem 0;
	}

	.prose :global(a.wiki) {
		color: #60a5fa;
		background: #1e3a5f;
		padding: 0.1em 0.35em;
		border-radius: 4px;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.prose :global(a.wiki:hover) {
		background: #2d5a8f;
		color: #93c5fd;
	}

	.prose :global(strong) {
		color: #f4f4f5;
		font-weight: 600;
	}

	.backlinks {
		margin-top: 4rem;
		padding-top: 2rem;
		border-top: 1px solid #27272f;
	}

	.backlinks h3 {
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
		margin: 0 0 1rem 0;
	}

	.backlinks ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.backlink-btn {
		width: 100%;
		padding: 0.75rem;
		background: transparent;
		border: 1px solid #27272f;
		border-radius: 6px;
		color: #a1a1aa;
		font-family: inherit;
		font-size: 0.95rem;
		text-align: left;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.backlink-btn:hover {
		background: #1a1a24;
		border-color: #3f3f46;
		color: #e4e4e7;
	}

	@media (max-width: 1024px) {
		.home {
			grid-template-columns: 1fr;
		}

		.sidebar {
			display: none;
		}
	}
</style>