import { test, expect, describe } from "bun:test";
import { parseExport } from "./parser";

const SAMPLE_EXPORT = `
 * ▐▛███▜▌ *   Claude Code v2.0.76
* ▝▜█████▛▘ *  Opus 4.5 · Claude Max
 *  ▘▘ ▝▝  *   ~/dev/railway/mono

> investigate this
https://linear.app/railway/issue/PRO-5419/reported-referral-link-not-working


⏺ /railway-dev:investigate

⏺ plugin:linear:linear - get_issue (MCP)(id: "PRO-5419")
  ⎿  {
       "id": "05012372-733b-4001-bddb-d9d54928b851",
       "identifier": "PRO-5419",
     … +103 lines (ctrl+o to expand)

⏺ plugin:linear:linear - list_comments (MCP)(issueId: "PRO-5419")
  ⎿  [
       {
         "id": "839059df-e246-4103-8be4-aedd16131011",
     … +120 lines (ctrl+o to expand)

⏺ This is an urgent issue with 9 linked Central Station threads. Let me fetch all of them to understand the pattern:

⏺ Bash(python /Users/jr/dev/railway/railway-dev-claude-plugin/skills/central-sta
      tion/scripts/fetch_thread.py
      "https://station.railway.com/support/my-referal-link-doesn…)
  ⎿  {
       "data": {
         "thread": {
     … +278 lines (ctrl+o to expand)

⏺ Bash(python /Users/jr/dev/railway/railway-dev-claude-plugin/skills/central-sta
      tion/scripts/fetch_thread.py
      "https://station.railway.com/support/referral-credit-not-a…)
  ⎿  {
       "data": {
         "thread": {
     … +106 lines (ctrl+o to expand)

⏺ Issue Overview

  | Field      | Value                              |
  |------------|------------------------------------|
  | Title      | Reported Referral Link Not Working |

⏺ Read(packages/frontend/src/pages/index.tsx)
  ⎿  Read 122 lines

⏺ 🚨 FOUND THE BUG!

> yes fix it please

⏺ Update(packages/frontend/src/pages/index.tsx)
  ⎿  Added 5 lines

⏺ Let me verify the fix:

⏺ Search(pattern: "useQueryParamToLocalStorage", path: "packages/frontend",
        output_mode: "content")
  ⎿  Found 12 lines
`.trim();

describe("parseExport", () => {
  test("parses header correctly", () => {
    const result = parseExport(SAMPLE_EXPORT);
    expect(result.header.version).toBe("v2.0.76");
    expect(result.header.model).toBe("Opus 4.5");
    expect(result.header.plan).toBe("Claude Max");
  });

  test("parses user messages", () => {
    const result = parseExport(SAMPLE_EXPORT);
    const userTurns = result.turns.filter(t => t.role === "user");
    expect(userTurns.length).toBeGreaterThanOrEqual(2);
    expect(userTurns[0]!.content[0]).toEqual({
      type: "text",
      text: expect.stringContaining("investigate this")
    });
  });

  test("parses skill invocations", () => {
    const result = parseExport(SAMPLE_EXPORT);
    const assistantTurns = result.turns.filter(t => t.role === "assistant");
    const skillContent = assistantTurns[0]!.content.find(
      c => c.type === "text" && c.text.startsWith("/")
    );
    expect(skillContent).toBeDefined();
  });

  test("parses MCP tool calls", () => {
    const result = parseExport(SAMPLE_EXPORT);
    const allContent = result.turns.flatMap(t => t.content);
    const mcpTools = allContent.filter(
      c => c.type === "tool" && c.tool.name === "get_issue"
    );
    expect(mcpTools.length).toBeGreaterThanOrEqual(1);
  });

  test("parses multiline Bash tool calls", () => {
    const result = parseExport(SAMPLE_EXPORT);
    const allContent = result.turns.flatMap(t => t.content);
    const bashTools = allContent.filter(
      c => c.type === "tool" && c.tool.name === "Bash"
    );
    expect(bashTools.length).toBeGreaterThanOrEqual(2);
  });

  test("parses simple tool calls like Read", () => {
    const result = parseExport(SAMPLE_EXPORT);
    const allContent = result.turns.flatMap(t => t.content);
    const readTools = allContent.filter(
      c => c.type === "tool" && c.tool.name === "Read"
    );
    expect(readTools.length).toBeGreaterThanOrEqual(1);
  });

  test("parses text messages after tool calls", () => {
    const result = parseExport(SAMPLE_EXPORT);
    const allContent = result.turns.flatMap(t => t.content);
    const foundBugText = allContent.find(
      c => c.type === "text" && c.text.includes("FOUND THE BUG")
    );
    expect(foundBugText).toBeDefined();
  });

  test("parses Search tool with multiline params", () => {
    const result = parseExport(SAMPLE_EXPORT);
    const allContent = result.turns.flatMap(t => t.content);
    const searchTools = allContent.filter(
      c => c.type === "tool" && c.tool.name === "Search"
    );
    expect(searchTools.length).toBeGreaterThanOrEqual(1);
  });

  test("has correct number of turns", () => {
    const result = parseExport(SAMPLE_EXPORT);
    // Should have at least: user1, assistant1, user2, assistant2
    expect(result.turns.length).toBeGreaterThanOrEqual(4);
  });

  test("parses multiline text content with tables", () => {
    const input = `
> hello

⏺ Issue Overview

  | Field      | Value    |
  |------------|----------|
  | Title      | Bug Fix  |
  | Status     | Open     |

  Some more text here.

⏺ Another message
`.trim();

    const result = parseExport(input);
    const allContent = result.turns.flatMap(t => t.content);
    const issueOverview = allContent.find(
      c => c.type === "text" && c.text.includes("Issue Overview")
    );
    expect(issueOverview).toBeDefined();
    // Should include the table
    expect((issueOverview as any).text).toContain("| Field");
    expect((issueOverview as any).text).toContain("Bug Fix");
  });

  test("does not parse --- as tool call", () => {
    const input = `
> hello

⏺ Alternative (better): Add it to _app.tsx so it works globally on ALL pages.

  ---

  Would you like me to implement the fix?
`.trim();

    const result = parseExport(input);
    const allContent = result.turns.flatMap(t => t.content);
    const tools = allContent.filter(c => c.type === "tool");
    expect(tools.length).toBe(0);

    const textContent = allContent.filter(c => c.type === "text");
    const hasTripleDash = textContent.some(c => (c as any).text.includes("---"));
    expect(hasTripleDash).toBe(true);
  });

  test("parses multiline MCP tool calls", () => {
    const input = `
> test

⏺ ide - getDiagnostics (MCP)(uri: "file:///Users/jr/dev/railway/mono/packages/fr
                            ontend/src/pages/index.tsx")
  ⎿ [
      { "error": "none" }
    ]

⏺ Done
`.trim();

    const result = parseExport(input);
    const allContent = result.turns.flatMap(t => t.content);
    const mcpTools = allContent.filter(
      c => c.type === "tool" && c.tool.name === "getDiagnostics"
    );
    expect(mcpTools.length).toBe(1);
    expect((mcpTools[0] as any).tool.params).toContain("file:///Users/jr");
  });
});
