/**
 * GET /api/notes
 * Returns all note metadata. Cached under "all-notes".
 * Optional ?tag=foo filter (applied AFTER the cache read for cheapness).
 */

import { json, error } from '@sveltejs/kit';
import { notesCache } from '$lib/server/cache';
import { getNotesSource } from '$lib/server/source';
import type { NoteMetadata } from '$lib/types';
import type { RequestHandler } from './$types';

const CACHE_KEY = 'all-notes';
const CACHE_TTL_MS = 60 * 60 * 1000;

export const GET: RequestHandler = async ({ url }) => {
	let all = notesCache.get<NoteMetadata[]>(CACHE_KEY);
	if (!all) {
		try {
			all = await getNotesSource().getAllMetadata();
		} catch (e) {
			console.error('Failed to load notes:', e);
			throw error(502, 'Failed to load notes from source');
		}
		notesCache.set(CACHE_KEY, all, CACHE_TTL_MS);
	}

	const tag = url.searchParams.get('tag');
	const filtered = tag ? all.filter((n) => n.tags.includes(tag)) : all;

	return json({
		count: filtered.length,
		total: all.length,
		tag,
		notes: filtered
	});
};