/**
 * GitHub notes source using the GitHub REST API.
 * Fetches the full repository tree, then lazily fetches blob content.
 * Notes can live anywhere — path determines the slug.
 */

import { env } from '$env/dynamic/private';
import type { Note, NoteMetadata, NotesSource } from '$lib/types';
import { buildNote } from './parser';

const REPO_OWNER = env.GITHUB_REPO_OWNER ?? '';
const REPO_NAME = env.GITHUB_REPO_NAME ?? '';
const TOKEN = env.GITHUB_TOKEN ?? '';

interface TreeEntry {
	path: string;
	mode: string;
	type: string;
	sha: string;
	size?: number;
}

interface TreeResponse {
	sha: string;
	url: string;
	tree: TreeEntry[];
	truncated: boolean;
}

/**
 * Fetch the full recursive tree (metadata only — no blob content).
 */
async function fetchRepoTree(): Promise<TreeEntry[]> {
	const url = `/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/HEAD?recursive=1`;
	const res = await fetch(`https://api.github.com${url}`, {
		headers: {
			Authorization: `Bearer ${TOKEN}`,
			Accept: 'application/vnd.github.v3+json',
			'X-GitHub-Api-Version': '2022-11-28'
		}
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`GitHub tree API ${res.status}: ${body}`);
	}

	const data: TreeResponse = await res.json();
	// Only markdown files, skip hidden/.trash dirs
	return data.tree.filter(
		(e) =>
			e.type === 'blob' &&
			e.path.endsWith('.md') &&
			!e.path.startsWith('.') &&
			!e.path.includes('/.trash/')
	);
}

/**
 * Decode base64 content from GitHub blob and ensure UTF-8 encoding.
 */
function decodeContent(encoded: string): string {
	// Node atob() decodes base64 to a Latin-1 string (each byte = one character).
	// We need UTF-8, so we convert through Buffer.
	return Buffer.from(encoded.replace(/\n/g, ''), 'base64').toString('utf8');
}

export class GitHubNotesSource implements NotesSource {
	// ── Tree cache ─────────────────────────────────────────────────────────────
	private cachedTree: TreeEntry[] | null = null;
	private treeFetchedAt = 0;
	private readonly TREE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

	private async getTree(): Promise<TreeEntry[]> {
		const now = Date.now();
		if (this.cachedTree && now - this.treeFetchedAt < this.TREE_CACHE_TTL_MS) {
			return this.cachedTree;
		}
		this.cachedTree = await fetchRepoTree();
		this.treeFetchedAt = now;
		return this.cachedTree;
	}

	// ── Slug→entry index (built during metadata fetch) ─────────────────────────
	// Maps lowercase slug → TreeEntry for O(1) lookup without re-fetching blobs
	private slugIndex: Map<string, TreeEntry> = new Map();
	private slugIndexFetchedAt = 0;
	private readonly SLUG_INDEX_TTL_MS = 10 * 60 * 1000; // 10 minutes

	// ── Metadata cache ─────────────────────────────────────────────────────────
	private metadataCache: { data: NoteMetadata[]; fetchedAt: number } | null = null;
	private readonly METADATA_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

	private deriveSlug(filePath: string): string {
		// Slug = filename without extension, preserving original casing
		// "09-04.md" → "09-04"
		// "00-Digital-Garden-Project.md" → "00-Digital-Garden-Project"
		// "00-shëlf-index.md" → "00-shëlf-index"
		return filePath.replace(/\.md$/, '').replace(/^.*\//, '');
	}

	/**
	 * Lazily build slug→entry index from the tree.
	 * Note: frontmatter slug overrides are resolved in getAllMetadata().
	 */
	private async buildSlugIndex(): Promise<Map<string, TreeEntry>> {
		const now = Date.now();
		if (this.slugIndex.size > 0 && now - this.slugIndexFetchedAt < this.SLUG_INDEX_TTL_MS) {
			return this.slugIndex;
		}

		const tree = await this.getTree();
		this.slugIndex.clear();

		for (const entry of tree) {
			// Derive slug from filename only (no blob fetch needed for tree-level index)
			const basename = entry.path.replace(/\.md$/, '').replace(/^.*\//, '');
			const slug = basename;
			this.slugIndex.set(slug.toLowerCase(), entry);
		}

		this.slugIndexFetchedAt = now;
		return this.slugIndex;
	}

	/**
	 * Fetch a single blob, with retry and rate-limit backoff.
	 */
	private async fetchBlob(sha: string): Promise<string> {
		let retries = 2;
		while (retries >= 0) {
			try {
				const res = await fetch(
					`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs/${sha}`,
					{
						headers: {
							Authorization: `Bearer ${TOKEN}`,
							Accept: 'application/vnd.github.v3+json',
							'X-GitHub-Api-Version': '2022-11-28'
						}
					}
				);

				if (res.status === 403 || res.status === 429) {
					const wait = res.headers.get('Retry-After') ?? '1';
					await new Promise((r) => setTimeout(r, parseInt(wait) * 1000));
					retries--;
					continue;
				}

				if (!res.ok) throw new Error(`Blob API ${res.status}`);

				const blob: { content: string; encoding: string } = await res.json();
				if (blob.encoding !== 'base64') throw new Error('Unexpected encoding');
				return decodeContent(blob.content);
			} catch {
				retries--;
				if (retries < 0) throw new Error(`Failed to fetch blob ${sha}`);
				await new Promise((r) => setTimeout(r, 500));
			}
		}
		throw new Error(`Failed to fetch blob ${sha}`);
	}

	async getAllMetadata(): Promise<NoteMetadata[]> {
		const now = Date.now();
		if (this.metadataCache && now - this.metadataCache.fetchedAt < this.METADATA_CACHE_TTL_MS) {
			return this.metadataCache.data;
		}

		const tree = await this.getTree();
		const metadata: NoteMetadata[] = [];

		// Rebuild slug index alongside metadata fetch
		const newSlugIndex = new Map<string, TreeEntry>();

		for (const entry of tree) {
			const content = await this.fetchBlob(entry.sha);
			const slug = this.deriveSlug(entry.path);
			const note = buildNote(content, slug);

			// Skip private notes — they don't appear in the index
			if (note.visibility === 'private') continue;

			// Index by filename-derived slug for O(1) lookup
			const indexSlug = slug.toLowerCase();
			newSlugIndex.set(indexSlug, entry);

			// If frontmatter overrode the slug, also index by the override
			// (so /getContent?slug=overridden-slug still resolves)
			if (note.slug.toLowerCase() !== indexSlug) {
				newSlugIndex.set(note.slug.toLowerCase(), entry);
			}

			metadata.push({
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

		metadata.sort((a, b) => {
			if (a.date && b.date) return b.date.localeCompare(a.date);
			return a.slug.localeCompare(b.slug);
		});

		this.slugIndex = newSlugIndex;
		this.slugIndexFetchedAt = now;
		this.metadataCache = { data: metadata, fetchedAt: now };
		return metadata;
	}

	// ── Content cache ─────────────────────────────────────────────────────────
	private contentCache = new Map<string, { note: Note; fetchedAt: number }>();
	private readonly CONTENT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

	async getContent(slug: string): Promise<Note | null> {
		const now = Date.now();
		const cached = this.contentCache.get(slug);
		if (cached && now - cached.fetchedAt < this.CONTENT_CACHE_TTL_MS) {
			return cached.note;
		}

		// O(1) lookup via slug index (case-insensitive)
		await this.buildSlugIndex();
		const entry = this.slugIndex.get(slug.toLowerCase());

		if (!entry) return null;

		const content = await this.fetchBlob(entry.sha);
		const fileSlug = this.deriveSlug(entry.path);

		const note = buildNote(content, fileSlug);
		this.contentCache.set(slug, { note, fetchedAt: now });
		return note;
	}
}

export const REPO_INFO = { REPO_OWNER, REPO_NAME };
