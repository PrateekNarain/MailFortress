import React from 'react';
import { normalizeResponseText } from '../utils/mailFormat';

export { normalizeResponseText } from '../utils/mailFormat';

export function StructuredResponsePreview({ text }) {
  if (!text) return null;

  const blocks = [];
  let listItems = [];

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push({ type: 'list', key: `list-${blocks.length}`, items: listItems });
    listItems = [];
  };

  (text || '').split('\n').forEach((rawLine, idx) => {
    const line = rawLine.trim();
    const isBullet = /^-\s+/.test(line);
    const headingMatch = line.match(/^\*\*(.+?)\*\*\s*(.*)$/);

    if (isBullet) {
      listItems.push({ key: `li-${idx}`, text: line.replace(/^-\s+/, '') });
      return;
    }

    flushList();

    if (headingMatch) {
      const [, headingText, trailing] = headingMatch;
      blocks.push({ type: 'heading', key: `heading-${idx}`, text: headingText.trim(), trailing: trailing.trim() });
      return;
    }

    if (line) {
      blocks.push({ type: 'p', key: `p-${idx}`, text: line });
    } else {
      blocks.push({ type: 'spacer', key: `sp-${idx}` });
    }
  });

  flushList();

  return (
    <div className="space-y-3 text-sm text-gray-800">
      {blocks.map((block) => {
        if (block.type === 'p') {
          return (
            <p key={block.key} className="leading-relaxed">
              {block.text}
            </p>
          );
        }
        if (block.type === 'heading') {
          return (
            <div key={block.key} className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">
              {block.text}
              {block.trailing ? <span className="block normal-case text-gray-700 text-sm mt-1">{block.trailing}</span> : null}
            </div>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={block.key} className="list-disc pl-5 space-y-1">
              {block.items.map((item) => (
                <li key={item.key}>{item.text}</li>
              ))}
            </ul>
          );
        }
        return <div key={block.key} className="h-2" />;
      })}
    </div>
  );
}

export default StructuredResponsePreview;
