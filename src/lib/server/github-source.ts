/**
 * GitHub notes source using the GitHub REST API.
 * Fetches the entire repository tree in ONE call with all file contents.
 * Notes can live anywhere — path determines the slug.
 */

import { env } from '$env/dynamic/private';
import matter from 'gray-matter';
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
 * Fetch the full recursive tree with base64-encoded content for each blob.
 * GitHub's tree API returns content inline when we use ?recursive=1 with Accept header.
 */
async function fetchRepoTreeWithContent(): Promise<TreeEntry[]> {
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
	return data.tree.filter((e) => e.type === 'blob' && e.path.endsWith('.md') && !e.path.startsWith('.'));
}

/**
 * Decode base64 content from GitHub blob.
 */
function decodeContent(encoded: string): string {
	// GitHub returns base64 with newline padding
	return atob(encoded.replace(/\n/g, ''));
}

export class GitHubNotesSource implements NotesSource {
	private cachedTree: TreeEntry[] | null = null;
	private treeFetchedAt = 0;
	private readonly TREE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

	private async getTree(): Promise<TreeEntry[]> {
		const now = Date.now();
		if (this.cachedTree && now - this.treeFetchedAt < this.TREE_CACHE_TTL_MS) {
			return this.cachedTree;
		}
		this.cachedTree = await fetchRepoTreeWithContent();
		this.treeFetchedAt = now;
		return this.cachedTree;
	}

	/**
	 * Cache the full metadata so we don't re-fetch every blob on every request.
	 */
	private metadataCache: { data: NoteMetadata[]; fetchedAt: number } | null = null;
	private readonly METADATA_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

	private deriveSlug(filePath: string, content: string): string {
		const { data } = matter(content);
		if (data.slug) return data.slug as string;

		// Slug = filename without extension, preserving original casing
		// "09-04.md" -> "09-04"
		// "00-Digital-Garden-Project.md" -> "00-Digital-Garden-Project"
		const basename = filePath.replace(/\.md$/, '').replace(/^.*\//, '');
		return basename;
	}

	async getAllMetadata(): Promise<NoteMetadata[]> {
		const now = Date.now();
		if (this.metadataCache && now - this.metadataCache.fetchedAt < this.METADATA_CACHE_TTL_MS) {
			return this.metadataCache.data;
		}

		const tree = await this.getTree();
		const metadata: NoteMetadata[] = [];

		// Fetch blobs sequentially with retry to avoid rate limiting
		for (const entry of tree) {
			let retries = 2;
			while (retries >= 0) {
				try {
					const res = await fetch(
						`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs/${entry.sha}`,
						{
							headers: {
								Authorization: `Bearer ${TOKEN}`,
								Accept: 'application/vnd.github.v3+json',
								'X-GitHub-Api-Version': '2022-11-28'
							}
						}
					);

					if (res.status === 403 || res.status === 429) {
						// Rate limited — wait and retry
						const wait = res.headers.get('Retry-After') ?? '1';
						await new Promise((r) => setTimeout(r, parseInt(wait) * 1000));
						retries--;
						continue;
					}

					if (!res.ok) break;

					const blob: { content: string; encoding: string } = await res.json();
					if (blob.encoding !== 'base64') break;

					const content = decodeContent(blob.content);
					const slug = this.deriveSlug(entry.path, content);
					const note = buildNote(content, slug);

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
					break; // success
				} catch {
					retries--;
					if (retries < 0) break;
					await new Promise((r) => setTimeout(r, 500));
				}
			}
		}

		metadata.sort((a, b) => {
			if (a.date && b.date) return b.date.localeCompare(a.date);
			return a.slug.localeCompare(b.slug);
		});

		this.metadataCache = { data: metadata, fetchedAt: now };
		return metadata;
	}

	/**
	 * Cache individual note content to avoid re-fetching blobs for every page load.
	 */
	private contentCache = new Map<string, { note: Note; fetchedAt: number }>();
	private readonly CONTENT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

	async getContent(slug: string): Promise<Note | null> {
		const now = Date.now();
		const cached = this.contentCache.get(slug);
		if (cached && now - cached.fetchedAt < this.CONTENT_CACHE_TTL_MS) {
			return cached.note;
		}

		const tree = await this.getTree();

		for (const entry of tree) {
			let retries = 2;
			while (retries >= 0) {
				try {
					const res = await fetch(
						`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs/${entry.sha}`,
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

					if (!res.ok) break;

					const blob: { content: string; encoding: string } = await res.json();
					if (blob.encoding !== 'base64') break;

					const content = decodeContent(blob.content);
					const fileSlug = this.deriveSlug(entry.path, content);

					if (fileSlug === slug) {
						const note = buildNote(content, slug);
						this.contentCache.set(slug, { note, fetchedAt: now });
						return note;
					}
					break;
				} catch {
					retries--;
					if (retries < 0) break;
					await new Promise((r) => setTimeout(r, 500));
				}
			}
		}

		return null;
	}
}

export const REPO_INFO = { REPO_OWNER, REPO_NAME };