<script lang="ts">
	import type { PageProps } from './$types';
	// pi-lens-ignore: lint/correctness/noUnusedVariables
	let { data }: PageProps = $props();
</script>

<div class="page">
	<h1>#{data.tag}</h1>
	<p class="muted">{data.notes.length} note{data.notes.length === 1 ? '' : 's'}</p>

	<ul class="notes">
		{#each data.notes as note (note.slug)}
			<li>
				<a href={`/notes/${note.slug}`}>{note.slug}</a>
				{#if note.date}<small class="muted"> · {note.date}</small>{/if}
				{#if note.excerpt}<p class="excerpt">{note.excerpt}</p>{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.page {
		max-width: 720px;
		margin: 0 auto;
		padding: 2rem 1.25rem;
	}
	.page h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #f4f4f5;
		margin: 0 0 0.25rem;
	}
	.notes { list-style: none; padding: 0; margin-top: 1.25rem; }
	.notes li {
		padding: 1rem 0;
		border-bottom: 1px solid #1f1f28;
	}
	.notes li:last-child { border-bottom: none; }
	.notes a { font-weight: 600; text-decoration: none; color: #60a5fa; font-size: 1.05rem; }
	.notes a:hover { color: #93c5fd; }
	.excerpt {
		margin: 0.25rem 0 0;
		color: #71717a;
		font-size: 0.95rem;
		line-height: 1.5;
		word-break: break-word;
	}
	.muted { color: #71717a; }
</style>