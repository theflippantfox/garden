/**
 * Client-side full-text search over the server's search index.
 * Lazy-loads the index on first use, then runs Fuse.js queries.
 */

import Fuse from 'fuse.js';
import type { SearchIndexEntry, SearchResult } from '../types';

let fuseInstance: Fuse<SearchIndexEntry> | null = null;
let indexLoaded = false;

export async function ensureSearchIndex(): Promise<void> {
	if (indexLoaded) return;
	const res = await fetch('/api/search');
	if (!res.ok) throw new Error(`Failed to load search index: ${res.status}`);
	const data: { index: SearchIndexEntry[] } = await res.json();
	fuseInstance = new Fuse(data.index, {
		keys: [
			{ name: 'title', weight: 0.6 },
			{ name: 'tags', weight: 0.3 },
			{ name: 'excerpt', weight: 0.1 }
		],
		threshold: 0.3,
		includeScore: true
	});
	indexLoaded = true;
}

export async function search(query: string, limit = 20): Promise<SearchResult[]> {
	if (!query.trim()) return [];
	await ensureSearchIndex();
	if (!fuseInstance) return [];
	return fuseInstance.search(query, { limit }).map((r) => ({ item: r.item, score: r.score ?? 0 }));
}