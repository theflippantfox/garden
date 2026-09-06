/**
 * Shared types for the digital garden.
 * Single source of truth for Note shape, API responses, and cache keys.
 */

// --- Frontmatter & Note ---

export type Visibility = 'public' | 'private';
export type Status = 'active' | 'draft' | 'archived';

export interface NoteFrontmatter {
	title: string;
	slug?: string; // auto-derived from filename if omitted
	date?: string; // ISO 8601
	tags?: string[];
	status?: Status;
	visibility?: Visibility;
	excerpt?: string;
}

export interface NoteMetadata {
	slug: string;
	title: string;
	date: string;
	tags: string[];
	status: Status;
	visibility: Visibility;
	excerpt: string;
	// computed/derived at fetch time
	links: string[]; // outgoing [[wiki-link]] slugs
}

export interface Note extends NoteMetadata {
	content: string; // raw markdown body (after frontmatter stripped)
	html: string; // rendered HTML (cached)
	backlinks?: string[]; // slugs that link TO this note; populated on demand
}

export interface SearchIndexEntry {
	slug: string;
	title: string;
	tags: string[];
	excerpt: string;
	visibility: Visibility;
}

export interface SearchResult {
	item: SearchIndexEntry;
	score: number;
}

// --- API response envelopes ---

export interface ApiError {
	error: string;
	code?: string;
}

export interface CacheStats {
	entries: number;
	keys: string[];
	hits: number;
	misses: number;
}

// --- Pluggable notes source (mock vs. github) ---

export interface NotesSource {
	getAllMetadata(): Promise<NoteMetadata[]>;
	getContent(slug: string): Promise<Note | null>;
}