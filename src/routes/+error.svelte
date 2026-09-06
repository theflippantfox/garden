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
		min-height: 60vh;
		gap: 1rem;
		text-align: center;
	}

	.error-code {
		font-size: 5rem;
		font-weight: 700;
		color: var(--text-primary);
		font-family: 'JetBrains Mono', monospace;
		line-height: 1;
	}

	.error-message {
		font-size: 1.1rem;
		color: var(--text-secondary);
		max-width: 40ch;
	}

	.back-link {
		margin-top: 0.5rem;
		padding: 0.5rem 1.25rem;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text-primary);
		text-decoration: none;
		font-size: 0.9rem;
		transition: border-color 0.2s;
	}

	.back-link:hover {
		border-color: var(--accent);
	}
</style>
