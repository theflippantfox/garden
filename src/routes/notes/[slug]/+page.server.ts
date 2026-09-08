/**
 * /notes/[slug] — full note page.
 * Loads the note from the (cached) source, enforces visibility, and computes backlinks.
 */

import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { Note, NoteMetadata } from "$lib/types";
import { notesCache } from "$lib/server/cache";
import { getNotesSource } from "$lib/server/source";
import { env } from "$env/dynamic/private";

const CACHE_TTL_MS = 60 * 60 * 1000;

function isAuthorized(request: Request): boolean {
	const required = env.GARDEN_TOKEN;
	// If no token configured, private notes are blocked entirely.
	if (!required) return false;
	const header = request.headers.get("authorization") ?? "";
	const bearer = header.startsWith("Bearer ")
		? header.slice("Bearer ".length)
		: header;
	return bearer === required;
}

async function computeBacklinks(
	targetSlug: string,
): Promise<{ slug: string; title: string }[]> {
	const all = notesCache.get<NoteMetadata[]>("all-notes");
	const list = all ?? (await getNotesSource().getAllMetadata());
	if (!all) notesCache.set("all-notes", list, CACHE_TTL_MS);
	return list
		.filter((n) => n.links.includes(targetSlug))
		.map((n) => ({ slug: n.slug, title: n.title }));
}

export const load: PageServerLoad = async ({ params, request }) => {
	const slug = params.slug;

	const cacheKey = `note-${slug}`;
	let note = notesCache.get<Note>(cacheKey);

	if (!note) {
		try {
			note = await getNotesSource().getContent(slug);
		} catch (e) {
			console.error(`Failed to load note ${slug}:`, e);
			throw error(502, "Failed to load note from source");
		}
		if (!note) throw error(404, `Note not found: ${slug}`);
		notesCache.set(cacheKey, note, CACHE_TTL_MS);
	}

	if (note.visibility === "private" && !isAuthorized(request)) {
		throw error(403, "Private note — authorization required");
	}

	// Backlinks (only computed for public notes to avoid leaking the existence
	// of private references).
	const backlinks =
		note.visibility === "public" ? await computeBacklinks(slug) : [];

	return { note, backlinks };
};
