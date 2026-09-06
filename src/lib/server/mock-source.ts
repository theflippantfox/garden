/**
 * Mock notes source for local development.
 * Reads markdown files from NOTES_DIR (default: ./notes relative to project root).
 * Same NotesSource interface as GitHubNotesSource, so the API layer is identical.
 *
 * Layout:
 *   notes/
 *     001-welcome.md
 *     002-getting-started.md
 *     subdir/
 *       003-something.md
 *
 * Files starting with `_` are ignored.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import matter from 'gray-matter';
import { env } from '$env/dynamic/private';
import type { Note, NoteMetadata, NotesSource } from '$lib/types';
import { buildNote, slugify } from './parser';

const DEFAULT_NOTES_DIR = 'notes';

function getNotesDir(): string {
	// env override; falls back to ./notes in project root
	return env.NOTES_DIR ?? DEFAULT_NOTES_DIR;
}

async function walkMarkdown(dir: string): Promise<string[]> {
	const out: string[] = [];
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const entry of entries) {
		if (entry.name.startsWith('_')) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...(await walkMarkdown(full)));
		} else if (entry.isFile() && entry.name.endsWith('.md')) {
			out.push(full);
		}
	}
	return out;
}

function filenameSlug(absPath: string, root: string): string {
	const rel = relative(root, absPath).split(sep).join('/');
	// strip extension, drop numeric prefixes like "001-" so the URL stays clean
	const noExt = rel.replace(/\.md$/, '');
	const noPrefix = noExt.replace(/^\d+-/, '');
	return slugify(noPrefix);
}

export class MockNotesSource implements NotesSource {
	private root: string;
	private fileBySlug = new Map<string, string>();

	constructor(root: string = getNotesDir()) {
		this.root = root;
	}

	/**
	 * Build slug→filepath map. If frontmatter declares a slug, use that;
	 * otherwise derive from filename (strip numeric prefix + extension).
	 */
	private async indexFiles(): Promise<void> {
		const files = await walkMarkdown(this.root);
		const map = new Map<string, string>();
		for (const f of files) {
			const raw = await readFile(f, 'utf-8');
			const { data } = matter(raw);
			const slug = filenameSlug(f, this.root); // Always use filename, never frontmatter
			map.set(slug, f);
		}
		this.fileBySlug = map;
	}

	async getAllMetadata(): Promise<NoteMetadata[]> {
		await this.indexFiles();
		const out: NoteMetadata[] = [];
		for (const [slug, file] of this.fileBySlug) {
			const raw = await readFile(file, 'utf-8');
			const note = buildNote(raw, slug);
			// Skip private notes
			if (note.visibility === 'private') continue;
			out.push({
				slug: note.slug,
				title: note.title,
				date: note.date,
				tags: note.tags,
				status: note.status,
				visibility: note.visibility,
				excerpt: note.excerpt,
				links: note.links
			});
		}
		// Sort by date desc, falling back to slug
		out.sort((a, b) => {
			if (a.date && b.date) return b.date.localeCompare(a.date);
			return a.slug.localeCompare(b.slug);
		});
		return out;
	}

	async getContent(slug: string): Promise<Note | null> {
		await this.indexFiles();
		const file = this.fileBySlug.get(slug);
		if (!file) return null;
		const raw = await readFile(file, 'utf-8');
		return buildNote(raw, slug);
	}
}