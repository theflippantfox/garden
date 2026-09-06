/**
 * GitHub webhook signature verification.
 * Header: x-hub-signature-256: sha256=<hex>
 * Algorithm: HMAC-SHA256 over the raw request body using GITHUB_WEBHOOK_SECRET.
 *
 * Uses timingSafeEqual to prevent timing-attack signature forgery.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

export interface VerifyResult {
	valid: boolean;
	reason?: string;
}

export function verifyGitHubSignature(rawBody: string, header: string | null): VerifyResult {
	const expectedSecret = env.GITHUB_WEBHOOK_SECRET;
	if (!expectedSecret) {
		return { valid: false, reason: 'GITHUB_WEBHOOK_SECRET not configured' };
	}
	if (!header) {
		return { valid: false, reason: 'missing x-hub-signature-256 header' };
	}
	if (!header.startsWith('sha256=')) {
		return { valid: false, reason: 'unsupported signature scheme (expected sha256=)' };
	}

	const provided = header.slice('sha256='.length);
	const expected = createHmac('sha256', expectedSecret).update(rawBody).digest('hex');

	// Length mismatch is a hard fail before timingSafeEqual (which requires equal lengths).
	if (provided.length !== expected.length) {
		return { valid: false, reason: 'signature length mismatch' };
	}

	const ok = timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
	return ok ? { valid: true } : { valid: false, reason: 'signature does not match' };
}

/**
 * Determine whether a webhook payload should trigger a cache invalidation.
 * Returns the list of file paths under notes/ that changed.
 */
export function extractChangedNotePaths(payload: unknown): string[] {
	if (!payload || typeof payload !== 'object') return [];
	const p = payload as Record<string, unknown>;

	// Only handle pushes to main.
	if (p.ref !== 'refs/heads/main') return [];

	if (!Array.isArray(p.commits)) return [];

	const files = new Set<string>();
	for (const commit of p.commits) {
		if (!commit || typeof commit !== 'object') continue;
		const c = commit as Record<string, unknown>;
		for (const key of ['added', 'modified', 'removed'] as const) {
			if (!Array.isArray(c[key])) continue;
			for (const f of c[key] as unknown[]) {
				if (typeof f === 'string' && f.startsWith('notes/') && f.endsWith('.md')) {
					files.add(f);
				}
			}
		}
	}
	return Array.from(files);
}