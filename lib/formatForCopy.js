// Converts raw markdown (as produced by the AI) into readable plain text,
// suitable for pasting into places that don't render markdown.
// Main job: turn pipe-tables like `| # | Name |` into aligned, spaced columns
// instead of copying the raw markdown syntax.

function isSeparatorRow(line) {
  // Matches rows like |---|---|  or | :--- | ---: |
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim());
}

function formatTableBlock(block) {
  const lines = block.trim().split("\n").filter(Boolean);
  const rows = lines
    .filter((line) => !isSeparatorRow(line))
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim())
    );

  if (rows.length === 0) return block;

  const colCount = Math.max(...rows.map((r) => r.length));
  const widths = Array(colCount).fill(0);
  rows.forEach((row) => {
    row.forEach((cell, i) => {
      widths[i] = Math.max(widths[i], cell.length);
    });
  });

  return (
    rows
      .map((row) =>
        row
          .map((cell, i) => (cell || "").padEnd(widths[i]))
          .join("  ")
          .trimEnd()
      )
      .join("\n") + "\n"
  );
}

export function formatMarkdownForCopy(markdown) {
  if (!markdown) return "";

  let text = markdown;

  // Replace each contiguous block of pipe-table lines with an aligned plain-text table
  text = text.replace(/((?:^\|.*\|[ \t]*$\n?)+)/gm, (block) => formatTableBlock(block));

  // Strip remaining markdown syntax so the copy reads cleanly
  text = text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

  return text.trim();
}