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
			{#if note.date}<span>{note.date}</span>{/if}
			{#if note.tags.length > 0}
				<span class="tags">
					{#each note.tags as t (t)}<a class="tag" href={`/tags/${t}`}>#{t}</a>{/each}
				</span>
			{/if}
		</div>
	</header>

	<!-- html is generated server-side from trusted markdown in the notes repo -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html note.html}

	{#if backlinks && backlinks.length > 0}
		<aside class="backlinks">
			<h3>Linked from</h3>
			<ul>
				{#each backlinks as bl (bl.slug)}
					<li><a href={`/notes/${bl.slug}`}>{bl.title}</a></li>
				{/each}
			</ul>
		</aside>
	{/if}
</article>

<style>
	.meta {
		color: #666;
		font-size: 0.9rem;
		margin-bottom: 1.5rem;
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		align-items: center;
	}
	.tags { display: inline-flex; gap: 0.4rem; }
	.tag {
		background: #eef5ff;
		color: #335;
		padding: 0.1rem 0.5rem;
		border-radius: 4px;
		text-decoration: none;
		font-size: 0.85rem;
	}
	.backlinks {
		margin-top: 3rem;
		padding-top: 1rem;
		border-top: 1px solid #eee;
	}
	.backlinks h3 { font-size: 1rem; color: #555; margin-bottom: 0.5rem; }
	.backlinks ul { list-style: none; padding: 0; margin: 0; }
	.backlinks li { padding: 0.25rem 0; }
	.backlinks a { color: #335; text-decoration: none; }
	.backlinks a:hover { text-decoration: underline; }
</style>