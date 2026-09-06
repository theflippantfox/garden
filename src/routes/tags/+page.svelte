<script lang="ts">
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

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

<style>
	.tags {
		list-style: none;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.tags li {
		background: #eef5ff;
		border-radius: 6px;
		padding: 0.4rem 0.75rem;
		display: inline-flex;
		gap: 0.4rem;
		align-items: baseline;
	}
	.tags a {
		color: #335;
		text-decoration: none;
		font-weight: 600;
	}
	small { color: #888; }
	.muted { color: #888; }
</style>