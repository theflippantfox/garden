<script lang="ts">
	import type { PageProps } from './$types';
	// pi-lens-ignore: lint/correctness/noUnusedVariables
	let { data }: PageProps = $props();
</script>

<div class="page">
	<h1>#{data.tag}</h1>
	<p class="count">{data.notes.length} note{data.notes.length === 1 ? '' : 's'}</p>

	<ul class="notes">
		{#each data.notes as note (note.slug)}
			<li>
				<a href={`/notes/${note.slug}`}>{note.slug}</a>
				{#if note.date}<time>{note.date}</time>{/if}
				{#if note.excerpt}<p class="excerpt">{note.excerpt}</p>{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.page {
		max-width: 720px;
		margin: 0 auto;
		padding: 3rem 1.25rem;
	}
	.page h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text);
		margin: 0 0 0.25rem;
	}
	.count {
		font-size: 0.85rem;
		color: var(--text-muted);
		margin: 0 0 2rem;
	}
	.notes { list-style: none; padding: 0; margin: 0; }
	.notes li {
		padding: 1.25rem 0;
		border-bottom: 1px solid var(--border);
	}
	.notes li:last-child { border-bottom: none; }
	.notes a {
		font-weight: 600;
		text-decoration: none;
		color: var(--link);
		font-size: 1.05rem;
	}
	.notes a:hover { color: #93c5fd; }
	time {
		display: inline-block;
		margin-left: 0.75rem;
		font-size: 0.8rem;
		color: var(--text-muted);
		font-family: 'JetBrains Mono', monospace;
	}
	.excerpt {
		margin: 0.375rem 0 0;
		color: var(--text-secondary);
		font-size: 0.9rem;
		line-height: 1.5;
		word-break: break-word;
	}

	@media (max-width: 900px) {
		.page { padding-top: 2rem; }
	}
</style>