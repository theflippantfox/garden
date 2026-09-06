/**
 * /api/cache
 *   GET  → stats (entries, keys, hit/miss counts). Requires GARDEN_TOKEN.
 *   POST → invalidate. Body: { pattern?: string }
 *           pattern omitted → clear everything.
 *           pattern = "note-" or "all-notes" etc. → clear matching keys.
 */

import { json, error } from '@sveltejs/kit';
import { notesCache } from '$lib/server/cache';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

function requireAdmin(request: Request): void {
	const required = env.GARDEN_TOKEN;
	if (!required) throw error(503, 'GARDEN_TOKEN not configured');
	const header = request.headers.get('authorization') ?? '';
	const bearer = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : header;
	if (bearer !== required) throw error(401, 'Unauthorized');
}

export const GET: RequestHandler = async ({ request }) => {
	requireAdmin(request);
	return json(notesCache.stats());
};

export const POST: RequestHandler = async ({ request }) => {
	requireAdmin(request);
	let body: { pattern?: string } = {};
	try {
		body = await request.json();
	} catch {
		// empty body is fine — means "clear all"
	}
	const removed = notesCache.invalidate(body.pattern);
	return json({ ok: true, removed, pattern: body.pattern ?? null });
};