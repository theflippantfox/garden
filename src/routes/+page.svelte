<!--
  Home: search input + recent public notes.
  Server load fetches metadata once (cache hit after first call).
  Search runs client-side against the /api/search index.
-->
<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type ResultRow = { slug: string; title: string; excerpt: string };

	let query = $state('');
	let results = $state<ResultRow[]>([]);
	let searching = $state(false);

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
</script>

<section class="hero">
	<h1>Digital Garden</h1>
	<p class="lead">
		{data.total} note{data.total === 1 ? '' : 's'} growing here.{#if data.tagCount > 0}
			Browse {data.tagCount} tags or search below.
		{:else}
			Use search to find what you need.
		{/if}
	</p>

	<input
		type="search"
		placeholder="Search notes…"
		value={query}
		oninput={onInput}
		autocomplete="off"
		spellcheck="false"
	/>
</section>

{#if query && results.length > 0}
	<section>
		<h2>Results</h2>
		<ul class="results">
			{#each results as r (r.slug)}
				<li>
					<a href={`/notes/${r.slug}`}>{r.title}</a>
					{#if r.excerpt}<small>{r.excerpt}</small>{/if}
				</li>
			{/each}
		</ul>
	</section>
{:else if query && !searching}
	<p class="muted">No matches.</p>
{/if}

<section>
	<h2>Recent</h2>
	{#if data.notes.length === 0}
		<p class="muted">
			No notes yet. Drop some markdown files into the <code>notes/</code> directory.
		</p>
	{:else}
		<ul class="notes">
			{#each data.notes as note (note.slug)}
				<li>
					<a href={`/notes/${note.slug}`}>{note.title}</a>
					{#if note.date}<small class="muted"> · {note.date}</small>{/if}
					{#if note.tags.length > 0}
						<span class="tags">
							{#each note.tags as t (t)}<a class="tag" href={`/tags/${t}`}>#{t}</a>{/each}
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.hero h1 {
		margin: 0 0 0.5rem;
		font-size: 2rem;
	}
	.lead {
		color: #555;
		margin: 0 0 1.25rem;
	}
	.hero input[type='search'] {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 1rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		box-sizing: border-box;
	}
	.hero input[type='search']:focus {
		outline: none;
		border-color: #2d5a2d;
		box-shadow: 0 0 0 3px rgba(45, 90, 45, 0.15);
	}

	.results,
	.notes {
		list-style: none;
		padding: 0;
		margin: 1rem 0;
	}
	.results li,
	.notes li {
		padding: 0.6rem 0;
		border-bottom: 1px solid #eee;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: baseline;
	}
	.results a,
	.notes a:not(.tag) {
		font-weight: 600;
		text-decoration: none;
		color: #1a1a1a;
	}
	.results a:hover,
	.notes a:not(.tag):hover {
		color: #2d5a2d;
	}

	.tags {
		display: inline-flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.tag {
		font-size: 0.8rem;
		background: #eef5ff;
		color: #335;
		padding: 0.1rem 0.5rem;
		border-radius: 4px;
		text-decoration: none;
	}
	.tag:hover {
		background: #d8e8ff;
	}

	.muted {
		color: #888;
	}
	small {
		color: #666;
	}
</style>