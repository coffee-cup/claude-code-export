import { useState } from "react";
import type { Turn, MessageContent, ToolCall } from "../parser";

function ToolCallBlock({ tool }: { tool: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const hasOutput = tool.output && tool.output.trim().length > 0;

  return (
    <div className="tool-call">
      <div className="tool-header" onClick={() => hasOutput && setExpanded(!expanded)}>
        <span className="tool-icon">⚡</span>
        <span className="tool-name">{tool.name}</span>
        <span className="tool-params">({tool.params})</span>
        {hasOutput && (
          <span className="tool-expand">{expanded ? "▼" : "▶"}</span>
        )}
      </div>
      {expanded && tool.output && (
        <pre className="tool-output">{tool.output}</pre>
      )}
    </div>
  );
}

function TextBlock({ text }: { text: string }) {
  // Split text into segments: regular text vs table blocks
  const lines = text.split("\n");
  const segments: { type: "text" | "table"; content: string }[] = [];
  let currentSegment: { type: "text" | "table"; lines: string[] } | null = null;

  for (const line of lines) {
    const isTableLine = line.trim().startsWith("|") || (line.includes("|") && line.trim().match(/^\|?[-|:]+\|?$/));

    if (isTableLine) {
      if (currentSegment?.type === "table") {
        currentSegment.lines.push(line);
      } else {
        if (currentSegment) segments.push({ type: currentSegment.type, content: currentSegment.lines.join("\n") });
        currentSegment = { type: "table", lines: [line] };
      }
    } else {
      if (currentSegment?.type === "text") {
        currentSegment.lines.push(line);
      } else {
        if (currentSegment) segments.push({ type: currentSegment.type, content: currentSegment.lines.join("\n") });
        currentSegment = { type: "text", lines: [line] };
      }
    }
  }
  if (currentSegment) segments.push({ type: currentSegment.type, content: currentSegment.lines.join("\n") });

  return (
    <div className="message-text">
      {segments.map((seg, i) =>
        seg.type === "table" ? (
          <div key={i} className="table-block">{seg.content}</div>
        ) : (
          <span key={i}>{seg.content}</span>
        )
      )}
    </div>
  );
}

function ContentBlock({ content }: { content: MessageContent }) {
  if (content.type === "text") {
    if (content.text.startsWith("/")) {
      return (
        <div className="skill-invocation">
          <span className="skill-icon">▶</span>
          <span>{content.text}</span>
        </div>
      );
    }
    return <TextBlock text={content.text} />;
  }
  return <ToolCallBlock tool={content.tool} />;
}

export function Message({ turn }: { turn: Turn }) {
  return (
    <div className={`message message-${turn.role}`}>
      {turn.content.map((c, i) => (
        <ContentBlock key={i} content={c} />
      ))}
    </div>
  );
}
