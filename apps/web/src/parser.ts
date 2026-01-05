export interface ChatHeader {
  version: string;
  model: string;
  plan: string;
  workingDir: string;
}

export interface ToolCall {
  name: string;
  params: string;
  output?: string;
}

export type MessageContent =
  | { type: "text"; text: string }
  | { type: "tool"; tool: ToolCall };

export interface Turn {
  role: "user" | "assistant";
  content: MessageContent[];
}

export interface ChatExport {
  header: ChatHeader;
  turns: Turn[];
}

function parseHeader(lines: string[]): { header: ChatHeader; endIndex: number } {
  const header: ChatHeader = { version: "", model: "", plan: "", workingDir: "" };
  let endIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Version: "Claude Code v2.0.76"
    const versionMatch = line.match(/Claude Code (v[\d.]+)/);
    if (versionMatch) header.version = versionMatch[1]!;

    // Model and plan on same line: "Opus 4.5 · Claude Max" (may have surrounding chars)
    if (line.includes("·") && !line.includes("Claude Code")) {
      const modelPlanMatch = line.match(/([A-Za-z0-9. ]+)\s*·\s*([A-Za-z0-9 ]+)/);
      if (modelPlanMatch) {
        header.model = modelPlanMatch[1]!.trim();
        header.plan = modelPlanMatch[2]!.trim();
      }
    }

    // Working directory: starts with ~/ or /
    const dirMatch = line.match(/(~\/[\w\-\/.]+|\/[\w\-\/.]+)/);
    if (dirMatch && !line.includes("Claude Code") && !line.includes("·")) {
      header.workingDir = dirMatch[1]!;
    }

    // First user message marks end of header
    if (line.startsWith("> ")) {
      endIndex = i;
      break;
    }
    endIndex = i + 1;
  }

  return { header, endIndex };
}

export function parseExport(input: string): ChatExport {
  const lines = input.split("\n");
  const { header, endIndex } = parseHeader(lines);

  const turns: Turn[] = [];
  let currentTurn: Turn | null = null;
  let currentToolCall: ToolCall | null = null;
  let outputLines: string[] = [];

  // State for multiline tool params
  let collectingParams = false;
  let collectingMcpParams = false;
  let paramLines: string[] = [];
  let toolName = "";

  const finalizeToolCall = () => {
    if (currentToolCall && currentTurn) {
      if (outputLines.length > 0) {
        currentToolCall.output = outputLines.join("\n");
      }
      currentTurn.content.push({ type: "tool", tool: currentToolCall });
    }
    currentToolCall = null;
    outputLines = [];
  };

  const finalizeTurn = () => {
    finalizeToolCall();
    if (currentTurn && currentTurn.content.length > 0) {
      turns.push(currentTurn);
    }
    currentTurn = null;
  };

  for (let i = endIndex; i < lines.length; i++) {
    const line = lines[i]!;

    // Collecting multiline tool params (regular tools)
    if (collectingParams) {
      const hasClosingParen = line.includes(")");

      if (hasClosingParen) {
        paramLines.push(line);
        const fullParams = paramLines.join("\n");
        const lastParen = fullParams.lastIndexOf(")");
        const params = fullParams.substring(0, lastParen).trim();

        currentToolCall = { name: toolName, params };
        collectingParams = false;
        paramLines = [];
        continue;
      } else {
        paramLines.push(line);
        continue;
      }
    }

    // Collecting multiline MCP tool params
    if (collectingMcpParams) {
      const hasClosingParen = line.includes(")");

      if (hasClosingParen) {
        paramLines.push(line.trim());
        const fullParams = paramLines.join("");
        const lastParen = fullParams.lastIndexOf(")");
        const params = fullParams.substring(0, lastParen).trim();

        currentToolCall = { name: toolName, params };
        collectingMcpParams = false;
        paramLines = [];
        continue;
      } else {
        paramLines.push(line.trim());
        continue;
      }
    }

    // User message: "> text"
    if (line.startsWith("> ")) {
      finalizeTurn();
      currentTurn = { role: "user", content: [] };
      const text = line.slice(2);
      if (text.trim()) {
        currentTurn.content.push({ type: "text", text });
      }
      continue;
    }

    // Assistant content: "⏺ text" or "⏺"
    if (line.startsWith("⏺")) {
      if (currentTurn?.role !== "assistant") {
        finalizeTurn();
        currentTurn = { role: "assistant", content: [] };
      } else {
        finalizeToolCall();
      }

      const content = line.slice(1).trim();
      if (!content) continue;

      // Skill invocation: /something
      if (content.startsWith("/")) {
        currentTurn.content.push({ type: "text", text: content });
        continue;
      }

      // MCP tool: "plugin:linear:linear - get_issue (MCP)(id: "PRO-5419")"
      // Can be single-line or multiline
      const mcpMatch = content.match(/^([\w\-:]+)\s*-\s*([\w_]+)\s*\(MCP\)\((.+)\)$/);
      if (mcpMatch) {
        currentToolCall = { name: mcpMatch[2]!, params: mcpMatch[3]!.trim() };
        continue;
      }

      // Multiline MCP tool (starts but doesn't end with closing paren)
      const mcpStartMatch = content.match(/^([\w\-:]+)\s*-\s*([\w_]+)\s*\(MCP\)\((.*)$/);
      if (mcpStartMatch && !content.endsWith(")")) {
        toolName = mcpStartMatch[2]!;
        paramLines = [mcpStartMatch[3]!];
        collectingMcpParams = true;
        continue;
      }

      // Complete single-line tool call: ToolName(params)
      const completeToolMatch = content.match(/^(\w+)\((.+)\)$/);
      if (completeToolMatch) {
        currentToolCall = { name: completeToolMatch[1]!, params: completeToolMatch[2]!.trim() };
        continue;
      }

      // Start of multiline tool call: ToolName(params... (no closing paren)
      const toolStartMatch = content.match(/^(\w+)\((.*)$/);
      if (toolStartMatch && !content.endsWith(")")) {
        toolName = toolStartMatch[1]!;
        paramLines = [toolStartMatch[2]!];
        collectingParams = true;
        continue;
      }

      // Regular text
      currentTurn.content.push({ type: "text", text: content });
      continue;
    }

    // Tool output: line with "⎿"
    if (line.includes("⎿") && currentToolCall) {
      const outputContent = line.replace(/.*⎿\s*/, "");
      outputLines.push(outputContent);
      continue;
    }

    // Indented continuation for tool output
    if (line.match(/^\s+\S/) && currentToolCall) {
      outputLines.push(line.trim());
      continue;
    }

    // Indented continuation for assistant text (tables, lists, etc.)
    if (line.match(/^\s+\S/) && currentTurn?.role === "assistant" && !currentToolCall) {
      const lastContent = currentTurn.content[currentTurn.content.length - 1];
      if (lastContent?.type === "text") {
        // Keep indentation for tables, strip for regular text
        const trimmed = line.trimStart();
        const isTableLine = trimmed.startsWith("|") || /^[-|:]+$/.test(trimmed);
        lastContent.text += "\n" + (isTableLine ? line : trimmed);
      }
      continue;
    }

    // Continuation of user message (non-empty, non-prefixed)
    if (currentTurn?.role === "user" && line.trim() && !line.startsWith("⏺") && !line.includes("⎿")) {
      const lastContent = currentTurn.content[currentTurn.content.length - 1];
      if (lastContent?.type === "text") {
        lastContent.text += "\n" + line;
      } else {
        currentTurn.content.push({ type: "text", text: line.trim() });
      }
    }
  }

  finalizeTurn();

  return { header, turns };
}
