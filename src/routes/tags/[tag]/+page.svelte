<script lang="ts">
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

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

<style>
	.notes { list-style: none; padding: 0; }
	.notes li {
		padding: 1rem 0;
		border-bottom: 1px solid #eee;
	}
	.notes a { font-weight: 600; text-decoration: none; color: #1a1a1a; font-size: 1.05rem; }
	.notes a:hover { color: #2d5a2d; }
	.excerpt { margin: 0.25rem 0 0; color: #555; font-size: 0.95rem; }
	.muted { color: #888; }
</style>