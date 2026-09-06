import { useState, type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';

interface MessageContentProps {
  content: string;
}

interface ContentBlock {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

function parseBlocks(text: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const t = text.slice(lastIndex, match.index).trim();
      if (t) blocks.push({ type: 'text', content: t });
    }
    blocks.push({ type: 'code', content: match[2].trim(), language: match[1] || undefined });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const t = text.slice(lastIndex).trim();
    if (t) blocks.push({ type: 'text', content: t });
  }

  if (blocks.length === 0) blocks.push({ type: 'text', content: text });
  return blocks;
}

function formatInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIdx = 0;
  let m;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) nodes.push(text.slice(lastIdx, m.index));
    const key = `${m.index}`;
    if (m[2]) {
      nodes.push(<strong key={key} className="font-semibold italic text-slate-800 dark:text-gray-100">{m[2]}</strong>);
    } else if (m[3]) {
      nodes.push(<strong key={key} className="font-semibold text-slate-800 dark:text-gray-100">{m[3]}</strong>);
    } else if (m[4]) {
      nodes.push(<em key={key} className="italic text-slate-600 dark:text-gray-300">{m[4]}</em>);
    } else if (m[5]) {
      nodes.push(
        <code key={key} className="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-[#1a1a35] border border-slate-300/50 dark:border-gray-700/50 text-blue-300 text-[13px] font-mono">
          {m[5]}
        </code>
      );
    } else if (m[6] && m[7]) {
      const safeHref = /^https?:\/\//i.test(m[7]) ? m[7] : '#';
      nodes.push(
        <a key={key} href={safeHref} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">
          {m[6]}
        </a>
      );
    }
    lastIdx = m.index + m[0].length;
  }

  if (lastIdx < text.length) nodes.push(text.slice(lastIdx));
  return nodes.length > 0 ? nodes : [text];
}

function TextBlock({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^(#{1,3})\s/)![1].length;
      const text = line.replace(/^#{1,3}\s+/, '');
      const cls = level === 1
        ? 'text-base font-bold text-slate-900 dark:text-gray-50 mt-4 mb-2'
        : level === 2
        ? 'text-[15px] font-semibold text-slate-800 dark:text-gray-100 mt-3 mb-1.5'
        : 'text-sm font-semibold text-slate-700 dark:text-gray-200 mt-2.5 mb-1';
      elements.push(<div key={i} className={cls}>{formatInline(text)}</div>);
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-slate-300/50 dark:border-gray-700/50 my-3" />);
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <div key={`q-${i}`} className="border-l-2 border-blue-500/50 pl-3 py-1 my-2 text-sm text-slate-600 dark:text-gray-300 italic">
          {formatInline(quoteLines.join('\n'))}
        </div>
      );
      continue;
    }

    if (/^\d+[.)]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[.)]\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-outside pl-5 space-y-1 my-2">
          {items.map((item, j) => (
            <li key={j} className="text-sm text-slate-700 dark:text-gray-200 leading-relaxed pl-1">
              {formatInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-outside pl-5 space-y-1 my-2">
          {items.map((item, j) => (
            <li key={j} className="text-sm text-slate-700 dark:text-gray-200 leading-relaxed pl-1">
              {formatInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    elements.push(
      <p key={i} className="text-sm text-slate-700 dark:text-gray-200 leading-relaxed">
        {formatInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-300/40 dark:border-gray-700/40 bg-slate-50 dark:bg-[#080816] my-3 group">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-[#10102a] border-b border-slate-300/30 dark:border-gray-700/30">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[11px] font-medium text-slate-400 dark:text-gray-500 uppercase tracking-wider ml-1">
            {language || 'code'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-slate-400 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-400" />
              <span className="text-green-400">Скопировано</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Копировать</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                <td className="px-4 py-0 text-right text-[12px] font-mono text-slate-400 dark:text-gray-600 select-none w-[1%] whitespace-nowrap border-r border-slate-200/40 dark:border-gray-800/40 leading-6">
                  {idx + 1}
                </td>
                <td className="px-4 py-0 text-[13px] font-mono text-slate-600 dark:text-gray-300 whitespace-pre leading-6">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MessageContent({ content }: MessageContentProps) {
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-1">
      {blocks.map((block, i) =>
        block.type === 'code' ? (
          <CodeBlock key={i} code={block.content} language={block.language} />
        ) : (
          <TextBlock key={i} content={block.content} />
        )
      )}
    </div>
  );
}
