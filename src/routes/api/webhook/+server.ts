/**
 * POST /api/webhook
 *
 * GitHub sends a push event here. We:
 *   1. Verify HMAC signature against GITHUB_WEBHOOK_SECRET.
 *   2. Confirm it's a push to main in our notes repo.
 *   3. Invalidate cache for any note files changed.
 *
 * Also supports an unauthenticated ?dev=1 mode for local testing — set
 * ALLOW_DEV_WEBHOOK=true in .env to enable. NEVER enable this in production.
 */

import { json, error } from '@sveltejs/kit';
import { notesCache } from '$lib/server/cache';
import { env } from '$env/dynamic/private';
import { verifyGitHubSignature, extractChangedNotePaths } from '$lib/server/webhook';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	const isDev = url.searchParams.get('dev') === '1' && env.ALLOW_DEV_WEBHOOK === 'true';

	const rawBody = await request.text();

	let payload: unknown;
	try {
		payload = JSON.parse(rawBody);
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	if (!isDev) {
		const sig = request.headers.get('x-hub-signature-256');
		const result = verifyGitHubSignature(rawBody, sig);
		if (!result.valid) {
			console.warn(`Webhook signature rejected: ${result.reason}`);
			throw error(401, `Invalid signature: ${result.reason}`);
		}
	}

	const changedFiles = extractChangedNotePaths(payload);
	if (changedFiles.length === 0) {
		return json({ ok: true, invalidated: 0, reason: 'no relevant changes' });
	}

	const removedNote = notesCache.invalidate('note-');
	const removedList = notesCache.invalidate('all-notes');
	const removedSearch = notesCache.invalidate('search-index');

	console.log(
		`[webhook] ${changedFiles.length} files changed; ` +
			`invalidated ${removedNote} notes, ${removedList} lists, ${removedSearch} search indexes`
	);

	return json({
		ok: true,
		files: changedFiles,
		invalidated: removedNote + removedList + removedSearch
	});
};