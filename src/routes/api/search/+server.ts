/**
 * GET /api/search
 * Returns a slim search index built from all metadata. Cached under "search-index".
 * The client then runs Fuse.js over this index locally.
 *
 * Private notes are excluded by default; pass ?include=private with the
 * GARDEN_TOKEN to include them.
 */

import { json, error } from '@sveltejs/kit';
import { notesCache } from '$lib/server/cache';
import { getNotesSource } from '$lib/server/source';
import type { NoteMetadata, SearchIndexEntry } from '$lib/types';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const CACHE_KEY = 'search-index';
const CACHE_TTL_MS = 60 * 60 * 1000;

async function loadAllMetadata(): Promise<NoteMetadata[]> {
	let all = notesCache.get<NoteMetadata[]>(CACHE_KEY);
	if (all) return all;
	all = await getNotesSource().getAllMetadata();
	notesCache.set(CACHE_KEY, all, CACHE_TTL_MS);
	return all;
}

export const GET: RequestHandler = async ({ url, request }) => {
	const includePrivate =
		url.searchParams.get('include') === 'private' &&
		request.headers.get('authorization') === `Bearer ${env.GARDEN_TOKEN ?? ''}`;

	const all = await loadAllMetadata();
	const index: SearchIndexEntry[] = all
		.filter((n) => includePrivate || n.visibility !== 'private')
		.map((n) => ({
			slug: n.slug,
			title: n.title,
			tags: n.tags,
			excerpt: n.excerpt,
			visibility: n.visibility
		}));

	return json({ count: index.length, index });
};