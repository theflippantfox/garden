/**
 * Markdown parsing pipeline:
 *   1. Split frontmatter from body (gray-matter)
 *   2. Extract [[wiki-links]] before rendering (so we can compute backlinks)
 *   3. Render markdown -> HTML (marked + marked-highlight + highlight.js)
 *   4. Return { frontmatter, content (raw body), html, links }
 *
 * Pure functions — no I/O, easy to test.
 */

import matter from 'gray-matter';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import type { Note, NoteFrontmatter } from '$lib/types';

const marked = new Marked(
	markedHighlight({
		langPrefix: 'hljs language-',
		highlight(code: string, lang: string) {
			const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
			return hljs.highlight(code, { language }).value;
		}
	})
);

const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function extractWikiLinks(markdown: string): string[] {
	const slugs = new Set<string>();
	for (const match of markdown.matchAll(WIKI_LINK_RE)) {
		slugs.add(match[1].trim());
	}
	return [...slugs];
}

/**
 * Convert [[wiki-links]] to HTML <a> tags before markdown rendering.
 * Syntax: [[target]] or [[target|display text]]
 */
function renderWikiLinks(markdown: string): string {
	return markdown.replace(WIKI_LINK_RE, (match, target, alias) => {
		// Use original casing for the href (case-insensitive lookup handles matching)
		const slug = target.trim();
		const text = alias ? alias.trim() : target.trim();
		return `<a href="/notes/${encodeURIComponent(slug)}" class="wiki">${text}</a>`;
	});
}

export function parseMarkdown(raw: string): ParsedNote {
	const { data, content } = matter(raw);
	const fm = data as Partial<NoteFrontmatter>;
	const frontmatter: NoteFrontmatter = {
		title: fm.title ?? 'Untitled',
		// slug is set by the caller (source) from the filename — NOT from frontmatter
		slug: '',
		// gray-matter auto-parses YAML dates into JS Date objects; normalize to ISO string.
		date: fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : fm.date,
		tags: Array.isArray(fm.tags) ? fm.tags : [],
		status: fm.status,
		visibility: fm.visibility,
		excerpt: fm.excerpt
	};

	const links = extractWikiLinks(content);
	// Convert wiki-links to HTML before markdown processing
	const contentWithLinks = renderWikiLinks(content);
	const html = marked.parse(contentWithLinks, { async: false }) as string;

	// Derive display title from first non-empty line of content if no frontmatter title
	const derivedTitle = deriveTitleFromContent(content);

	return { frontmatter, content, html, links, derivedTitle };
}

function deriveTitleFromContent(content: string): string {
	// Strip markdown heading markers from first non-empty line
	const lines = content.split('\n');
	for (const line of lines) {
		const stripped = line.replace(/^#+\s*/, '').trim();
		if (!stripped) continue;
		// Skip Obsidian callouts like "> [!note]" and dataview templates
		if (stripped.startsWith('>') || stripped.startsWith('<')) continue;
		// Strip common inline markdown: bold, italic, code, links
		const clean = stripped
			.replace(/\*\*(.+?)\*\*/g, '$1') // **bold**
			.replace(/\*(.+?)\*/g, '$1') // *italic*
			.replace(/`(.+?)`/g, '$1') // `code`
			.replace(/\[(.+?)\]\(.+?\)/g, '$1'); // [text](url)
		if (clean) return clean;
	}
	return 'Untitled';
}

/** Build a Note record from raw markdown + slug. */
export function buildNote(raw: string, slug: string, backlinks?: string[]): Note {
	const parsed = parseMarkdown(raw);
	const fm = parsed.frontmatter;
	// Use derived title (from content) when frontmatter didn't specify one
	const title = fm.title === 'Untitled' && parsed.derivedTitle ? parsed.derivedTitle : fm.title;
	return {
		slug, // Always use filename-derived slug passed from source
		title,
		date: fm.date ?? '',
		tags: fm.tags ?? [],
		status: fm.status ?? 'active',
		visibility: fm.visibility ?? 'public',
		excerpt: fm.excerpt ?? '',
		links: parsed.links,
		content: parsed.content,
		html: parsed.html,
		backlinks
	};
}

export interface ParsedNote {
	frontmatter: NoteFrontmatter;
	content: string; // markdown body (frontmatter stripped)
	html: string;
	links: string[];
	derivedTitle: string; // first heading from content (for display when no frontmatter title)
}

/**
 * Slugify a string for URL-safe identifiers.
 * NOTE: Use filename-derived slugs from the source — this is only for search/links.
 */
export function slugify(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-');
}
