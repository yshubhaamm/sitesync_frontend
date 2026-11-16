import React from 'react';
import { parseMarkdown, type InlineSegment } from '../utils/markdown';

function renderInline(segments: InlineSegment[]) {
  return segments.map((seg, idx) => {
    if (seg.type === 'bold') {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {seg.value}
        </strong>
      );
    }
    if (seg.type === 'italic') {
      return (
        <em key={idx} className="italic">
          {seg.value}
        </em>
      );
    }
    if (seg.type === 'code') {
      return (
        <code
          key={idx}
          className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded"
        >
          {seg.value}
        </code>
      );
    }
    return <React.Fragment key={idx}>{seg.value}</React.Fragment>;
  });
}

export function MarkdownReportView({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown);

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No markdown content returned for this report.
      </p>
    );
  }

  return (
    <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            if (block.level === 1) {
              return (
                <h2
                  key={idx}
                  className="text-xl font-bold text-[#0F294A] border-b border-slate-200 pb-2"
                >
                  {renderInline(block.segments)}
                </h2>
              );
            }
            if (block.level === 2) {
              return (
                <h3 key={idx} className="text-base font-semibold text-slate-900 pt-2">
                  {renderInline(block.segments)}
                </h3>
              );
            }
            return (
              <h4 key={idx} className="text-sm font-semibold text-slate-800 pt-1">
                {renderInline(block.segments)}
              </h4>
            );
          }

          case 'paragraph':
            return <p key={idx}>{renderInline(block.segments)}</p>;

          case 'list':
            return block.ordered ? (
              <ol key={idx} className="list-decimal pl-5 space-y-1.5">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{renderInline(item)}</li>
                ))}
              </ol>
            ) : (
              <ul key={idx} className="list-disc pl-5 space-y-1.5">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{renderInline(item)}</li>
                ))}
              </ul>
            );

          case 'blockquote':
            return (
              <blockquote
                key={idx}
                className="bg-amber-50/70 border border-amber-200 rounded-md px-4 py-2.5 text-amber-900 space-y-1"
              >
                {block.lines.map((line, lineIdx) => (
                  <p key={lineIdx}>{renderInline(line)}</p>
                ))}
              </blockquote>
            );

          case 'codeblock':
            return (
              <pre
                key={idx}
                className="bg-slate-950 text-slate-100 rounded-md p-3.5 font-mono text-xs overflow-x-auto"
              >
                {block.content}
              </pre>
            );

          case 'table':
            return (
              <div key={idx} className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                    <tr>
                      {block.headers.map((header, hIdx) => (
                        <th key={hIdx} className="px-3 py-2">
                          {renderInline(header)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 text-slate-700">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'hr':
            return <hr key={idx} className="border-slate-200" />;
        }
      })}
    </div>
  );
}
