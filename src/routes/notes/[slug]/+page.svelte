<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { note, backlinks } = $derived(data);
</script>

<svelte:head>
	<title>{note.slug} — Garden</title>
	{#if note.excerpt}
		<meta name="description" content={note.excerpt} />
	{/if}
</svelte:head>

<article class="prose">
	<header>
		<h1>{note.slug}</h1>
		<div class="meta">
			{#if note.date}<time>{note.date}</time>{/if}
			{#if note.tags.length > 0}
				<span class="tags">
					{#each note.tags as t (t)}<a class="tag" href={`/tags/${t}`}>{t}</a>{/each}
				</span>
			{/if}
		</div>
	</header>

	<!-- html is generated server-side from trusted markdown in the notes repo -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html note.html}

	{#if backlinks && backlinks.length > 0}
		<aside class="backlinks">
			<h3>Referenced by</h3>
			<ul>
				{#each backlinks as bl (bl.slug)}
					<li><a href={`/notes/${bl.slug}`}>{bl.title}</a></li>
				{/each}
			</ul>
		</aside>
	{/if}
</article>

<style>
	:global(body) {
		background: var(--bg, #0a0a12);
		color: var(--text, #e8e8f0);
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
	}
	.prose {
		max-width: 720px;
		margin: 0 auto;
		padding: 3rem 1.25rem 4rem;
		font-size: 1rem;
		line-height: 1.8;
		color: #c0c0d0;
	}
	header { margin-bottom: 2rem; }
	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text, #e8e8f0);
		margin: 0;
		letter-spacing: -0.02em;
	}
	.meta {
		margin-top: 0.75rem;
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: center;
	}
	time {
		font-size: 0.8rem;
		color: var(--text-muted, #555570);
		font-family: 'JetBrains Mono', monospace;
	}
	.tags { display: inline-flex; gap: 0.35rem; }
	.tag {
		background: rgba(124, 106, 239, 0.1);
		color: var(--accent, #7c6aef);
		padding: 0.15rem 0.55rem;
		border-radius: 999px;
		text-decoration: none;
		font-size: 0.75rem;
		font-weight: 500;
		transition: all 150ms;
	}
	.tag:hover {
		background: var(--accent, #7c6aef);
		color: #fff;
	}

	.prose :global(h1),
	.prose :global(h2),
	.prose :global(h3) {
		color: var(--text, #e8e8f0);
		font-weight: 600;
		line-height: 1.3;
		margin: 2rem 0 0.75rem;
	}
	.prose :global(h1) { font-size: 1.5rem; }
	.prose :global(h2) {
		font-size: 1.2rem;
		border-bottom: 1px solid var(--border, #1e1e30);
		padding-bottom: 0.3rem;
	}
	.prose :global(h3) { font-size: 1.05rem; }
	.prose :global(p) { margin: 0 0 1rem; }
	.prose :global(a) { color: var(--link, #6da0ef); }
	.prose :global(a:hover) { color: #93c5fd; }
	.prose :global(strong) { color: var(--text, #e8e8f0); }
	.prose :global(code) {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.875em;
	}
	.prose :global(:not(pre) > code) {
		background: var(--code-inline-bg, #161625);
		color: var(--accent, #7c6aef);
		padding: 0.15em 0.4em;
		border-radius: 4px;
		border: 1px solid var(--border, #1e1e30);
	}
	.prose :global(pre) {
		background: var(--code-bg, #0e0e1a);
		border: 1px solid var(--border, #1e1e30);
		border-radius: var(--radius-md, 10px);
		padding: 1rem;
		overflow-x: auto;
		margin: 1rem 0;
	}
	.prose :global(pre code) {
		background: none;
		padding: 0;
		border: none;
		color: var(--text, #e8e8f0);
	}
	.prose :global(blockquote) {
		border-left: 3px solid var(--accent, #7c6aef);
		margin: 1rem 0;
		padding: 0.6rem 1rem;
		color: var(--text-secondary, #8888a0);
		background: rgba(124, 106, 239, 0.1);
		border-radius: 0 var(--radius-sm, 6px) var(--radius-sm, 6px) 0;
	}

	/* ── Callouts (Obsidian `> [!type]` syntax) ── */
	.prose :global(.callout) {
		--callout-color: #94a3b8;
		--callout-bg: rgba(148, 163, 184, 0.09);
		--callout-glyph: "ℹ";
		border: 1px solid var(--border, #1e1e30);
		border-left: 3px solid var(--callout-color);
		background: var(--callout-bg);
		border-radius: var(--radius-sm, 6px);
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
		color: var(--text-secondary, #8888a0);
	}
	.prose :global(.callout-body ul),
	.prose :global(.callout-body ol) {
		margin: 0.25rem 0 0.25rem 1.25rem;
		color: var(--text-secondary, #8888a0);
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
		border-top: 1px solid var(--border, #1e1e30);
		margin: 2rem 0;
	}

	.backlinks {
		margin-top: 2.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border, #1e1e30);
	}
	.backlinks h3 {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted, #555570);
		margin: 0 0 0.75rem;
	}
	.backlinks ul { list-style: none; padding: 0; margin: 0; }
	.backlinks li { padding: 0.25rem 0; }
	.backlinks a {
		color: var(--link, #6da0ef);
		text-decoration: none;
	}
	.backlinks a:hover { text-decoration: underline; }

	@media (max-width: 900px) {
		.prose { padding: 2rem 1rem 3rem; }
	}
</style>