/**
 * Server load for /notes/[slug].
 * Returns the full note (markdown + html + metadata + backlinks).
 */

import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Note, NoteMetadata } from '$lib/types';
import { notesCache } from '$lib/server/cache';
import { getNotesSource } from '$lib/server/source';

const CACHE_TTL_MS = 60 * 60 * 1000;

export const load: PageLoad = async ({ params }) => {
	const slug = params.slug;
	const cacheKey = `note-${slug}`;

	let note = notesCache.get<Note>(cacheKey);
	if (!note) {
		note = await getNotesSource().getContent(slug);
		if (!note) throw error(404, `Note not found: ${slug}`);
		notesCache.set(cacheKey, note, CACHE_TTL_MS);
	}

	// Compute backlinks from the cached all-notes list
	let all = notesCache.get<NoteMetadata[]>('all-notes');
	if (!all) {
		all = await getNotesSource().getAllMetadata();
		notesCache.set('all-notes', all, CACHE_TTL_MS);
	}
	const backlinks = all
		.filter((n) => n.visibility === 'public' && n.links.includes(slug))
		.map((n) => ({ slug: n.slug, title: n.title }));

	return { note, backlinks };
};