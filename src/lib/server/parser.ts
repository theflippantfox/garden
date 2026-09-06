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
	let match: RegExpExecArray | null;
	while ((match = WIKI_LINK_RE.exec(markdown)) !== null) {
		// Capture group 1 is the target; group 2 is the optional alias.
		slugs.add(slugify(match[1].trim()));
	}
	return Array.from(slugs);
}

export function slugify(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-');
}

export interface ParsedNote {
	frontmatter: NoteFrontmatter;
	content: string; // markdown body (frontmatter stripped)
	html: string;
	links: string[];
}

/**
 * Convert [[wiki-links]] to HTML <a> tags before markdown rendering.
 * Syntax: [[target]] or [[target|display text]]
 */
function renderWikiLinks(markdown: string): string {
	return markdown.replace(WIKI_LINK_RE, (match, target, alias) => {
		const slug = slugify(target.trim());
		const text = alias ? alias.trim() : target.trim();
		return `<a href="/notes/${slug}" class="wiki">${text}</a>`;
	});
}

export function parseMarkdown(raw: string, fallbackSlug?: string): ParsedNote {
	const { data, content } = matter(raw);
	const fm = data as Partial<NoteFrontmatter>;

	const slug = fm.slug ?? slugify(fallbackSlug ?? fm.title ?? 'untitled');
	const frontmatter: NoteFrontmatter = {
		title: fm.title ?? 'Untitled',
		slug,
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

	return { frontmatter, content, html, links };
}

/** Build a Note record from raw markdown + slug. */
export function buildNote(raw: string, slug: string, backlinks?: string[]): Note {
	const parsed = parseMarkdown(raw, slug);
	const fm = parsed.frontmatter;
	return {
		slug: fm.slug ?? slug,
		title: fm.title,
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