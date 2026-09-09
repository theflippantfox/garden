/**
 * Server load for the home page.
 * Fetches all notes metadata from the (cached) API endpoint.
 */

import type { PageServerLoad } from "./$types";
import type { NoteMetadata } from "$lib/types";
import { notesCache } from "$lib/server/cache";
import { getNotesSource } from "$lib/server/source";

const CACHE_KEY = "all-notes";
const CACHE_TTL_MS = 60 * 60 * 1000;

export const load: PageServerLoad = async () => {
	let all = notesCache.get<NoteMetadata[]>(CACHE_KEY);
	if (!all) {
		all = await getNotesSource().getAllMetadata();
		notesCache.set(CACHE_KEY, all, CACHE_TTL_MS);
	}

	const publicNotes = all.filter((n) => n.visibility === "public" && !n.private);
	const tagSet = new Set<string>();
	for (const n of publicNotes) for (const t of n.tags) tagSet.add(t);

	return {
		total: publicNotes.length,
		tagCount: tagSet.size,
		taggedTagCount: tagSet.size,
		notes: publicNotes,
	};
};
