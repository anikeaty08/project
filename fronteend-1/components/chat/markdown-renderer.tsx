"use client";

import React from "react";

/**
 * Lightweight markdown renderer for chat messages.
 * Supports: **bold**, *italic*, `code`, ```code blocks```,
 * numbered lists, bullet lists, headings (#, ##, ###),
 * [links](url), and horizontal rules (---).
 */
export function MarkdownRenderer({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return <div className="space-y-2">{blocks.map((b, i) => renderBlock(b, i))}</div>;
}

// --- Block types ---
type Block =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: number; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "hr" };

function parseBlocks(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line → skip
    if (line.trim() === "") { i++; continue; }

    // Horizontal rule
    if (/^-{3,}$/.test(line.trim()) || /^\*{3,}$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++; continue;
    }

    // Code block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "code", lang, code: codeLines.join("\n") });
      i++; continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2] });
      i++; continue;
    }

    // Ordered list
    if (/^\d+[\.\)]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[\.\)]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    // Unordered list (-, *, •)
    if (/^[-*•]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    // Paragraph (collect consecutive non-special lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].match(/^#{1,3}\s/) &&
      !/^\d+[\.\)]\s/.test(lines[i].trim()) &&
      !/^[-*•]\s/.test(lines[i].trim()) &&
      !/^-{3,}$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: paraLines.join("\n") });
    }
  }

  return blocks;
}

function renderBlock(block: Block, key: number): React.ReactNode {
  switch (block.type) {
    case "hr":
      return <div key={key} className="border-t border-border/30 my-3" />;

    case "heading":
      if (block.level === 1)
        return <h3 key={key} className="text-base font-semibold text-foreground mt-1">{renderInline(block.text)}</h3>;
      if (block.level === 2)
        return <h4 key={key} className="text-sm font-semibold text-foreground mt-1">{renderInline(block.text)}</h4>;
      return <h5 key={key} className="text-sm font-medium text-foreground/90 mt-1">{renderInline(block.text)}</h5>;

    case "code":
      return (
        <pre key={key} className="bg-black/30 rounded-lg px-4 py-3 text-xs font-mono text-foreground/80 overflow-x-auto border border-border/20">
          <code>{block.code}</code>
        </pre>
      );

    case "list":
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag key={key} className={`space-y-1.5 pl-1 ${block.ordered ? "list-none" : "list-none"}`}>
          {block.items.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5 text-sm leading-relaxed">
              {block.ordered ? (
                <span className="text-ayur-gold font-mono text-xs mt-0.5 flex-shrink-0 w-5 text-right">{j + 1}.</span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-ayur-gold/60 mt-2 flex-shrink-0" />
              )}
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ListTag>
      );

    case "paragraph":
      return <p key={key} className="text-sm leading-relaxed">{renderInline(block.text)}</p>;
  }
}

function renderInline(text: string): React.ReactNode {
  // Process inline markdown: **bold**, *italic*, `code`, [link](url), and citation [1]
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    let match = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    if (match) {
      if (match[1]) parts.push(<React.Fragment key={key++}>{processBasic(match[1])}</React.Fragment>);
      parts.push(<strong key={key++} className="font-semibold text-foreground">{match[2]}</strong>);
      remaining = match[3];
      continue;
    }

    // Italic: *text*
    match = remaining.match(/^(.*?)\*(.+?)\*(.*)/s);
    if (match) {
      if (match[1]) parts.push(<React.Fragment key={key++}>{processBasic(match[1])}</React.Fragment>);
      parts.push(<em key={key++} className="italic text-foreground/80">{match[2]}</em>);
      remaining = match[3];
      continue;
    }

    // Inline code: `text`
    match = remaining.match(/^(.*?)`(.+?)`(.*)/s);
    if (match) {
      if (match[1]) parts.push(<React.Fragment key={key++}>{processBasic(match[1])}</React.Fragment>);
      parts.push(<code key={key++} className="px-1.5 py-0.5 rounded bg-white/[0.06] text-xs font-mono text-ayur-gold">{match[2]}</code>);
      remaining = match[3];
      continue;
    }

    // Link: [text](url)
    match = remaining.match(/^(.*?)\[(.+?)\]\((.+?)\)(.*)/s);
    if (match) {
      if (match[1]) parts.push(<React.Fragment key={key++}>{processBasic(match[1])}</React.Fragment>);
      parts.push(
        <a key={key++} href={match[3]} target="_blank" rel="noreferrer" className="text-ayur-gold underline underline-offset-2 hover:text-ayur-amber transition-colors">
          {match[2]}
        </a>
      );
      remaining = match[4];
      continue;
    }

    // No more inline patterns
    parts.push(<React.Fragment key={key++}>{processBasic(remaining)}</React.Fragment>);
    break;
  }

  return <>{parts}</>;
}

// Handle citation markers like [1], [2] etc. and emoji
function processBasic(text: string): React.ReactNode {
  // Replace citation markers [1], [2] with styled badges
  const citationRegex = /\[(\d+)\]/g;
  const segments = text.split(citationRegex);

  if (segments.length <= 1) return text;

  return segments.map((seg, i) => {
    // Odd indices are captured groups (citation numbers)
    if (i % 2 === 1) {
      return (
        <span key={i} className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-ayur-gold/20 text-ayur-gold text-[9px] font-mono mx-0.5 align-text-top">
          {seg}
        </span>
      );
    }
    return seg;
  });
}
