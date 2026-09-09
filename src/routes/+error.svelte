<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="error-page">
	<div class="error-code">{$page.status}</div>
	<div class="error-message">{$page.error?.message ?? 'Something went wrong'}</div>
	<a href="/" class="back-link">Back to garden</a>
</div>

<style>
	.error-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100dvh;
		gap: 1rem;
		text-align: center;
	}
	.error-code {
		font-size: 6rem;
		font-weight: 700;
		color: var(--text);
		font-family: 'JetBrains Mono', monospace;
		line-height: 1;
		opacity: 0.8;
	}
	.error-message {
		font-size: 1.1rem;
		color: var(--text-secondary);
		max-width: 40ch;
	}
	.back-link {
		margin-top: 0.75rem;
		padding: 0.6rem 1.5rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		color: var(--text);
		text-decoration: none;
		font-size: 0.9rem;
		transition: border-color 200ms;
	}
	.back-link:hover { border-color: var(--accent); }
</style>
