export type InlineSegment =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string };

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; segments: InlineSegment[] }
  | { type: 'paragraph'; segments: InlineSegment[] }
  | { type: 'list'; ordered: boolean; items: InlineSegment[][] }
  | { type: 'blockquote'; lines: InlineSegment[][] }
  | { type: 'codeblock'; lang?: string; content: string }
  | { type: 'table'; headers: InlineSegment[][]; rows: InlineSegment[][][] }
  | { type: 'hr' };

export function parseInlineMarkdown(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      segments.push({ type: 'code', value: token.slice(1, -1) });
    } else if (token.startsWith('**') && token.endsWith('**')) {
      segments.push({ type: 'bold', value: token.slice(2, -2) });
    } else if (token.startsWith('*') && token.endsWith('*')) {
      segments.push({ type: 'italic', value: token.slice(1, -1) });
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }];
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  return /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(trimmed);
}

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      i++;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || undefined;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // consume closing ```
      blocks.push({ type: 'codeblock', lang, content: codeLines.join('\n') });
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Heading
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4;
      blocks.push({ type: 'heading', level, segments: parseInlineMarkdown(headingMatch[2]) });
      i++;
      continue;
    }

    // Table
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const headers = splitTableRow(trimmed).map(parseInlineMarkdown);
      i += 2; // skip header and separator
      const rows: InlineSegment[][][] = [];
      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim() !== '') {
        rows.push(splitTableRow(lines[i]).map(parseInlineMarkdown));
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: InlineSegment[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(parseInlineMarkdown(lines[i].trim().replace(/^>\s?/, '')));
        i++;
      }
      blocks.push({ type: 'blockquote', lines: quoteLines });
      continue;
    }

    // Unordered or ordered list
    const ulMatch = /^[-*+]\s+(.+)$/.exec(trimmed);
    const olMatch = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (ulMatch || olMatch) {
      const ordered = Boolean(olMatch);
      const items: InlineSegment[][] = [];
      const itemPattern = ordered ? /^\d+\.\s+(.+)$/ : /^[-*+]\s+(.+)$/;
      while (i < lines.length) {
        const m = itemPattern.exec(lines[i].trim());
        if (!m) break;
        items.push(parseInlineMarkdown(m[1]));
        i++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Paragraph (collect contiguous non-empty, non-block lines)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const current = lines[i].trim();
      if (
        current === '' ||
        current.startsWith('#') ||
        current.startsWith('```') ||
        current.startsWith('>') ||
        /^[-*+]\s+/.test(current) ||
        /^\d+\.\s+/.test(current) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(current)
      ) {
        break;
      }
      paraLines.push(current);
      i++;
    }
    blocks.push({ type: 'paragraph', segments: parseInlineMarkdown(paraLines.join(' ')) });
  }

  return blocks;
}
