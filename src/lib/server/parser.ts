/**
 * Markdown parsing pipeline:
 *   1. Split frontmatter from body (gray-matter)
 *   2. Extract [[wiki-links]] before rendering (so we can compute backlinks)
 *   3. Render markdown -> HTML (marked + marked-highlight + highlight.js)
 *   4. Return { frontmatter, content (raw body), html, links }
 *
 * Pure functions — no I/O, easy to test.
 */

import matter from "gray-matter";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import type { Note, NoteFrontmatter } from "$lib/types";
import type { TokenizerAndRendererExtension } from "marked";

const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Obsidian-style callout extension for marked.
 *
 * Converts blockquotes whose first line is `> [!type]` (optionally with a
 * custom title: `> [!warning] My Title`) into a callout block:
 *
 *   > [!note]
 *   > This is a callout with **bold** text.
 *
 * Emits `<aside class="callout" data-callout="type">` so the UI can style
 * each type (note, tip, warning, danger, quote, ...) independently.
 * Plain blockquotes (no `[!type]` header) are left untouched.
 */
function calloutExtension(): TokenizerAndRendererExtension {
	return {
		name: "callout",
		level: "block",
		start(src: string) {
			return src.match(/^[ \t]*>\s*\[!/)?.index ?? -1;
		},
		tokenizer(src: string) {
			const header = /^([ \t]*)>\s*\[!([a-zA-Z0-9-]+)\]([^\n]*)?(\n|$)/.exec(src);
			if (!header) return undefined;
			const typeName = header[2].toLowerCase();
			const title = header[3]?.trim();
			// Collect continuation lines (each must start with '>'); stop at a
			// line that opens a new callout or at non-quote content.
			let rest = src.slice(header[0].length);
			const bodyLines: string[] = [];
			while (true) {
				const line = /^(> ?)(.*?)(\n|$)/.exec(rest);
				if (!line) break;
				bodyLines.push(line[2]);
				rest = rest.slice(line[0].length);
				if (line[2].trim().startsWith("[!")) break; // next callout begins
			}
			const raw = header[0] + bodyLines.map((l) => "> " + l).join("\n");
			const innerText = bodyLines.join("\n");
			return {
				type: "callout",
				raw,
				typeName,
				title,
				tokens: this.lexer.blockTokens(innerText),
			};
		},
		renderer(token: any) {
			const body = this.parser.parse(token.tokens);
			const typeName = normalizeCalloutType(token.typeName);
			const title = token.title || defaultCalloutTitle(typeName);
			return (
				'<aside class="callout" data-callout="' +
				typeName +
				'"><div class="callout-title"><span class="callout-icon"></span><span class="callout-label">' +
				title +
				'</span></div><div class="callout-body">' +
				body +
				"</div></aside>"
			);
		},
	};
}

/** Obsidian callout aliases → canonical type names (keep CSS finite). */
const CALLOUT_ALIASES: Record<string, string> = {
	// canonical: note, abstract, info, todo, tip, success, question,
	// warning, failure, danger, bug, example, quote
	abstract: "abstract",
	summary: "abstract",
	tldr: "abstract",
	info: "info",
	todo: "todo",
	tip: "tip",
	hint: "tip",
	important: "tip",
	success: "success",
	check: "success",
	done: "success",
	question: "question",
	help: "question",
	faq: "question",
	warning: "warning",
	caution: "warning",
	attention: "warning",
	failure: "failure",
	fail: "failure",
	missing: "failure",
	danger: "danger",
	error: "danger",
	bug: "bug",
	example: "example",
	quote: "quote",
	cite: "quote",
	note: "note",
};

function normalizeCalloutType(raw: string): string {
	return CALLOUT_ALIASES[raw] ?? "default";
}

function defaultCalloutTitle(typeName: string): string {
	return typeName.charAt(0).toUpperCase() + typeName.slice(1);
}

const marked = new Marked(
	markedHighlight({
		langPrefix: "hljs language-",
		highlight(code: string, lang: string) {
			const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
			return hljs.highlight(code, { language }).value;
		},
	}),
);

marked.use({ extensions: [calloutExtension()] });

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
	return markdown.replace(WIKI_LINK_RE, (_match, target, alias) => {
		const slug = target.trim();
		const text = alias ? alias.trim() : target.trim();
		return `<a href="#wiki-${slug}" class="wiki">${text}</a>`;
	});
}

export function parseMarkdown(raw: string): ParsedNote {
	const { data, content } = matter(raw);
	const fm = data as Partial<NoteFrontmatter>;
	// SAFETY: gray-matter returns the raw YAML value here — at runtime this is
	// string | Date | undefined even though NoteFrontmatter types it as string.
	const rawDate: unknown = fm.date;
	// SAFETY: YAML lists can contain null entries (e.g. "tags: [null]" or
	// "- " with nothing after it); filter them so downstream code never
	// receives null tag names.
	const rawTags: unknown = fm.tags;
	const frontmatter: NoteFrontmatter = {
		title: fm.title ?? "Untitled",
		// slug is set by the caller (source) from the filename — NOT from frontmatter
		slug: "",
		// gray-matter auto-parses YAML dates into JS Date objects; normalize to ISO string.
		date:
			rawDate instanceof Date
				? rawDate.toISOString().slice(0, 10)
				: (rawDate as string | undefined),
		tags: Array.isArray(rawTags)
			? (rawTags as unknown[]).filter(
					(t): t is string => typeof t === "string" && t.trim().length > 0,
				)
			: [],
		status: fm.status,
		visibility: fm.visibility,
		excerpt: fm.excerpt,
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
	const lines = content.split("\n");
	for (const line of lines) {
		const stripped = line.replace(/^#+\s*/, "").trim();
		if (!stripped) continue;
		// Skip Obsidian callouts like "> [!note]" and dataview templates
		if (stripped.startsWith(">") || stripped.startsWith("<")) continue;
		// Strip common inline markdown: bold, italic, code, links
		const clean = stripped
			.replace(/\*\*(.+?)\*\*/g, "$1") // **bold**
			.replace(/\*(.+?)\*/g, "$1") // *italic*
			.replace(/`(.+?)`/g, "$1") // `code`
			.replace(/\[(.+?)\]\(.+?\)/g, "$1"); // [text](url)
		if (clean) return clean;
	}
	return "Untitled";
}

/** Build a Note record from raw markdown + slug. */
export function buildNote(
	raw: string,
	slug: string,
	backlinks?: string[],
): Note {
	const parsed = parseMarkdown(raw);
	const fm = parsed.frontmatter;
	// Use derived title (from content) when frontmatter didn't specify one
	const title =
		fm.title === "Untitled" && parsed.derivedTitle
			? parsed.derivedTitle
			: fm.title;
	return {
		slug, // Always use filename-derived slug passed from source
		title,
		date: fm.date ?? "",
		tags: fm.tags ?? [],
		status: fm.status ?? "active",
		visibility: fm.visibility ?? "public",
		excerpt: fm.excerpt ?? "",
		links: parsed.links,
		content: parsed.content,
		html: parsed.html,
		backlinks,
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
		.replace(/[^a-z0-9\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-");
}
