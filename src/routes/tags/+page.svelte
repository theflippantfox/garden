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
					<a href={`/tags/${t.name}`}>{t.name}</a>
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
		padding: 3rem 1.25rem;
	}
	.page h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text);
		margin: 0 0 1.5rem;
		letter-spacing: -0.02em;
	}
	.tags {
		list-style: none;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.tags li {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 0.5rem 0.875rem;
		display: inline-flex;
		gap: 0.5rem;
		align-items: baseline;
		transition: border-color 150ms;
	}
	.tags li:hover { border-color: var(--accent); }
	.tags a {
		color: var(--accent);
		text-decoration: none;
		font-weight: 600;
		font-size: 0.95rem;
	}
	.tags a:hover { color: var(--accent-hover); }
	small { color: var(--text-muted); font-size: 0.8rem; }
	.muted { color: var(--text-muted); }

	@media (max-width: 900px) {
		.page { padding-top: 2rem; }
	}
</style>