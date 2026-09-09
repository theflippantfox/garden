/**
 * Tag index — list all tags with note counts.
 */

import type { PageServerLoad } from "./$types";
import type { NoteMetadata } from "$lib/types";
import { notesCache } from "$lib/server/cache";
import { getNotesSource } from "$lib/server/source";

const CACHE_TTL_MS = 60 * 60 * 1000;

export const load: PageServerLoad = async () => {
	let all = notesCache.get<NoteMetadata[]>("all-notes");
	if (!all) {
		all = await getNotesSource().getAllMetadata();
		notesCache.set("all-notes", all, CACHE_TTL_MS);
	}

	const counts = new Map<string, number>();
	for (const n of all) {
		if (n.visibility !== "public" || n.private) continue;
		for (const t of n.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
	}

	const tags = Array.from(counts.entries())
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

	return { tags };
};
