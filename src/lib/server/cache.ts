/**
 * In-memory cache for notes data. Lives in the Node process — perfect for a
 * single-instance Vercel deployment; resets on cold start, which is fine
 * because GitHub is the source of truth.
 *
 * TTL defaults to 1 hour; per-key overrides supported.
 *
 * Hit/miss counters are exported for the /api/cache admin endpoint.
 */

import type { CacheStats } from '$lib/types';

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

interface Entry<T> {
	data: T;
	expiresAt: number;
}

class NotesCache {
	private store = new Map<string, Entry<unknown>>();
	private hits = 0;
	private misses = 0;

	get<T>(key: string): T | null {
		const entry = this.store.get(key) as Entry<T> | undefined;
		if (!entry) {
			this.misses++;
			return null;
		}
		if (Date.now() > entry.expiresAt) {
			this.store.delete(key);
			this.misses++;
			return null;
		}
		this.hits++;
		return entry.data;
	}

	set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
		this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
	}

	/** Drop keys that include the given substring. Pass undefined to clear all. */
	invalidate(pattern?: string): number {
		if (!pattern) {
			const n = this.store.size;
			this.store.clear();
			return n;
		}
		let removed = 0;
		for (const key of Array.from(this.store.keys())) {
			if (key.includes(pattern)) {
				this.store.delete(key);
				removed++;
			}
		}
		return removed;
	}

	stats(): CacheStats {
		return {
			entries: this.store.size,
			keys: Array.from(this.store.keys()),
			hits: this.hits,
			misses: this.misses
		};
	}
}

// Module-level singleton — survives within a single server process.
export const notesCache = new NotesCache();