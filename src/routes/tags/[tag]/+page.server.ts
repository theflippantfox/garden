/**
 * /tags/[tag] — notes that have this tag.
 */

import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { NoteMetadata } from '$lib/types';
import { notesCache } from '$lib/server/cache';
import { getNotesSource } from '$lib/server/source';

const CACHE_TTL_MS = 60 * 60 * 1000;

export const load: PageLoad = async ({ params }) => {
	const tag = params.tag;
	let all = notesCache.get<NoteMetadata[]>('all-notes');
	if (!all) {
		all = await getNotesSource().getAllMetadata();
		notesCache.set('all-notes', all, CACHE_TTL_MS);
	}

	const notes = all
		.filter((n) => n.visibility === 'public' && n.tags.includes(tag))
		.sort((a, b) => (a.date && b.date ? b.date.localeCompare(a.date) : a.slug.localeCompare(b.slug)));

	if (notes.length === 0) throw error(404, `No public notes tagged #${tag}`);

	return { tag, notes };
};