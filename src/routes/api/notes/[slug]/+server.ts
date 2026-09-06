/**
 * GET /api/notes/[slug]
 * Returns full note (markdown + rendered HTML). Cached per slug.
 * Visibility: private notes require Authorization header matching GARDEN_TOKEN.
 *
 * Backlinks are computed lazily and cached under a separate key.
 */

import { json, error } from '@sveltejs/kit';
import { notesCache } from '$lib/server/cache';
import { getNotesSource } from '$lib/server/source';
import type { Note, NoteMetadata } from '$lib/types';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const CACHE_TTL_MS = 60 * 60 * 1000;

function isAuthorized(request: Request): boolean {
	const required = env.GARDEN_TOKEN;
	// If no token configured, private notes are blocked entirely.
	if (!required) return false;
	const header = request.headers.get('authorization') ?? '';
	const bearer = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : header;
	return bearer === required;
}

async function computeBacklinks(targetSlug: string): Promise<string[]> {
	const all = notesCache.get<NoteMetadata[]>('all-notes');
	const list = all ?? (await getNotesSource().getAllMetadata());
	if (!all) notesCache.set('all-notes', list, CACHE_TTL_MS);
	return list.filter((n) => n.links.includes(targetSlug)).map((n) => n.slug);
}

export const GET: RequestHandler = async ({ params, request }) => {
	const slug = params.slug;
	if (!slug) throw error(400, 'Missing slug');

	const cacheKey = `note-${slug}`;
	let note = notesCache.get<Note>(cacheKey);

	if (!note) {
		try {
			note = await getNotesSource().getContent(slug);
		} catch (e) {
			console.error(`Failed to load note ${slug}:`, e);
			throw error(502, 'Failed to load note from source');
		}
		if (!note) throw error(404, `Note not found: ${slug}`);
		notesCache.set(cacheKey, note, CACHE_TTL_MS);
	}

	if (note.visibility === 'private' && !isAuthorized(request)) {
		throw error(403, 'Private note — authorization required');
	}

	// Backlinks (only computed once per request, never sent for private notes
	// to avoid leaking the existence of private references).
	if (note.visibility === 'public') {
		note.backlinks = await computeBacklinks(slug);
	}

	return json(note);
};