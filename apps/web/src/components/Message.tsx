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

type SegmentType = "text" | "table" | "output";

function TextBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const segments: { type: SegmentType; content: string }[] = [];
  let currentSegment: { type: SegmentType; lines: string[] } | null = null;

  const pushSegment = () => {
    if (currentSegment) {
      segments.push({ type: currentSegment.type, content: currentSegment.lines.join("\n") });
    }
  };

  for (const line of lines) {
    const isTableLine = line.trim().startsWith("|") || (line.includes("|") && line.trim().match(/^\|?[-|:]+\|?$/));
    const isOutputLine = line.includes("⎿");

    let segmentType: SegmentType = "text";
    if (isTableLine) segmentType = "table";
    else if (isOutputLine) segmentType = "output";

    if (currentSegment && currentSegment.type === segmentType) {
      currentSegment.lines.push(line);
    } else {
      pushSegment();
      currentSegment = { type: segmentType, lines: [line] };
    }
  }
  pushSegment();

  return (
    <div className="message-text">
      {segments.map((seg, i) => {
        if (seg.type === "table") {
          return <div key={i} className="table-block">{seg.content}</div>;
        }
        if (seg.type === "output") {
          const cleaned = seg.content
            .split("\n")
            .map(l => l.replace(/^\s*⎿\s*/, ""))
            .join("\n");
          return <pre key={i} className="output-block">{cleaned}</pre>;
        }
        return <span key={i}>{seg.content}</span>;
      })}
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
