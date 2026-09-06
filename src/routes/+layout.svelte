<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Digital Garden</title>
</svelte:head>

<div class="layout">
	<header>
		<nav>
			<a href="/" class="brand">🌱 Garden</a>
			<div class="links">
				<a href="/">Home</a>
				<a href="/tags">Tags</a>
			</div>
		</nav>
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<small>Built with SvelteKit · notes live in a GitHub repo</small>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
		background: #fafaf7;
		color: #1a1a1a;
		line-height: 1.6;
	}

	:global(.prose) {
		max-width: 720px;
	}

	:global(.prose h1) { font-size: 1.9rem; margin-top: 1.5rem; }
	:global(.prose h2) { font-size: 1.5rem; margin-top: 1.25rem; }
	:global(.prose h3) { font-size: 1.2rem; margin-top: 1rem; }
	:global(.prose code:not(pre code)) {
		background: #f0eee8;
		padding: 0.1em 0.35em;
		border-radius: 4px;
		font-size: 0.92em;
	}
	:global(.prose pre) {
		background: #1e1e1e;
		color: #f8f8f2;
		padding: 1rem;
		border-radius: 6px;
		overflow-x: auto;
	}
	:global(.prose a.wiki) {
		background: #eef5ff;
		padding: 0 4px;
		border-radius: 3px;
		text-decoration: none;
	}
	:global(.prose a.wiki.broken) {
		background: #fdecec;
		color: #b00;
	}

	.layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	header {
		border-bottom: 1px solid #e6e6e0;
		background: #fff;
	}
	nav {
		max-width: 900px;
		margin: 0 auto;
		padding: 1rem 1.25rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.brand {
		font-weight: 700;
		text-decoration: none;
		color: #2d5a2d;
		font-size: 1.15rem;
	}
	.links { display: flex; gap: 1.25rem; }
	.links a { color: #444; text-decoration: none; }
	.links a:hover { color: #2d5a2d; }

	main {
		flex: 1;
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem 1.25rem;
		width: 100%;
		box-sizing: border-box;
	}

	footer {
		border-top: 1px solid #e6e6e0;
		padding: 1.5rem;
		text-align: center;
		color: #777;
	}
</style>