import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInlineMarkdown, parseMarkdown } from './markdown';

test('parseInlineMarkdown parses bold, italic, and inline code spans', () => {
  const segments = parseInlineMarkdown('Status: **In Progress** at `50%` (*verified*)');
  assert.deepEqual(segments, [
    { type: 'text', value: 'Status: ' },
    { type: 'bold', value: 'In Progress' },
    { type: 'text', value: ' at ' },
    { type: 'code', value: '50%' },
    { type: 'text', value: ' (' },
    { type: 'italic', value: 'verified' },
    { type: 'text', value: ')' },
  ]);
});

test('parseMarkdown parses headings, lists, tables, and blockquotes', () => {
  const md = [
    '# Daily Report',
    '',
    '## Work Summary',
    '- Ground floor brickwork started',
    '- Waterproofing at **50%**',
    '',
    '| Milestone | Progress |',
    '| --- | --- |',
    '| Waterproofing | 50% |',
    '',
    '> Needs supervisor review: unclear cement delivery message',
  ].join('\n');

  const blocks = parseMarkdown(md);
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[1].type, 'heading');
  assert.equal(blocks[2].type, 'list');
  assert.equal(blocks[3].type, 'table');
  assert.equal(blocks[4].type, 'blockquote');
});
