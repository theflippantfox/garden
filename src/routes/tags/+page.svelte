<script lang="ts">
	import type { PageProps } from './$types';
	// pi-lens-ignore: lint/correctness/noUnusedVariables
	let { data }: PageProps = $props();
</script>

<div class="page">
	<h1>Tags</h1>
	{#if data.tags.length === 0}
		<p class="muted">No tagged notes yet.</p>
	{:else}
		<ul class="tags">
			{#each data.tags as t (t.name)}
				<li>
					<a href={`/tags/${t.name}`}>#{t.name}</a>
					<small>{t.count}</small>
				</li>
			{/each}
		</ul>
	{/if}
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
		margin: 0 0 1.25rem;
	}
	.tags {
		list-style: none;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.tags li {
		background: #1a1a24;
		border: 1px solid #27272f;
		border-radius: 6px;
		padding: 0.4rem 0.75rem;
		display: inline-flex;
		gap: 0.5rem;
		align-items: baseline;
	}
	.tags a {
		color: #a78bfa;
		text-decoration: none;
		font-weight: 600;
	}
	.tags a:hover { color: #c4b5fd; }
	small { color: #71717a; font-size: 0.8rem; }
	.muted { color: #71717a; }
</style>