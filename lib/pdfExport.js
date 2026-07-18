// Client-side PDF export helper using jsPDF. Renders a lightweight markdown
// parser (headings, bullets, code blocks, Mermaid diagrams, paragraphs) with
// brand colors, plus proper Urdu/Arabic script support (jsPDF's built-in
// fonts only cover Latin script, so Urdu text needs an embedded font, letter
// shaping, and right-to-left reordering to render correctly).

const PAGE = { width: 595.28, height: 841.89 }; // A4 in pt
const MARGIN_X = 50;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 60;
const CONTENT_WIDTH = PAGE.width - MARGIN_X * 2;

const COLORS = {
  accent: [77, 224, 192], // brand teal (--signal)
  bannerBg: [11, 14, 20], // near-black, matches app's "ink"
  heading: [15, 23, 42], // dark navy
  text: [51, 65, 85], // slate-700
  muted: [100, 116, 139], // slate-500
  codeBg: [241, 245, 249], // slate-100
  bubbleBg: [224, 250, 244], // light teal tint for question bubbles
  calloutBg: [248, 250, 251], // very subtle tint behind paragraph callouts
};

const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const ARABIC_FONT_NAME = "NotoNaskhArabic";
const ARABIC_FONT_URL = "/fonts/NotoNaskhArabic-Regular.ttf";

function containsArabic(text) {
  return ARABIC_RANGE.test(text);
}

function isArabicChar(ch) {
  return ARABIC_RANGE.test(ch);
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Embeds the Urdu/Arabic-capable font into this jsPDF document (once per doc).
async function ensureUrduFont(doc) {
  if (doc.__urduFontStatus) return doc.__urduFontStatus === "ok";
  try {
    const res = await fetch(ARABIC_FONT_URL);
    if (!res.ok) throw new Error("Font file not found");
    const buffer = await res.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    doc.addFileToVFS("NotoNaskhArabic-Regular.ttf", base64);
    doc.addFont("NotoNaskhArabic-Regular.ttf", ARABIC_FONT_NAME, "normal");
    doc.__urduFontStatus = "ok";
    return true;
  } catch (err) {
    console.error(
      "Couldn't load the Urdu/Arabic font for PDF export — make sure " +
        "public/fonts/NotoNaskhArabic-Regular.ttf exists in the project.",
      err
    );
    doc.__urduFontStatus = "failed";
    return false;
  }
}

// Reshapes Arabic/Urdu letters into their correct joined presentation forms.
function reshapeArabic(text) {
  try {
    // eslint-disable-next-line global-require
    const { ArabicReshaper } = require("arabic-persian-reshaper");
    return ArabicReshaper.convertArabic(text);
  } catch (err) {
    return text;
  }
}

// Reorders a shaped line into visual right-to-left order for a strictly
// left-to-right text engine like jsPDF: reverses each contiguous Arabic run,
// then reverses the order of runs, while keeping embedded Latin/number runs
// (names, figures) in their own correct reading order.
function toVisualRTL(shapedText) {
  const runs = [];
  let current = "";
  let currentIsArabic = null;

  for (const ch of shapedText) {
    const neutral = /[\s.,!?؟،؛:()[\]"'\-]/.test(ch);
    const arabic = isArabicChar(ch);
    const belongsArabic = neutral ? currentIsArabic : arabic;

    if (currentIsArabic === null || belongsArabic === currentIsArabic) {
      current += ch;
      if (currentIsArabic === null) currentIsArabic = belongsArabic ?? arabic;
    } else {
      runs.push({ text: current, arabic: currentIsArabic });
      current = ch;
      currentIsArabic = belongsArabic ?? arabic;
    }
  }
  if (current) runs.push({ text: current, arabic: currentIsArabic });

  return runs
    .map((r) => (r.arabic ? { ...r, text: [...r.text].reverse().join("") } : r))
    .reverse()
    .map((r) => r.text)
    .join("");
}

function prepareText(text) {
  if (!containsArabic(text)) {
    return { text, isArabic: false };
  }
  return { text: toVisualRTL(reshapeArabic(text)), isArabic: true };
}

async function getJsPDF() {
  const { jsPDF } = await import("jspdf");
  return jsPDF;
}

let mermaidInstance = null;
async function getMermaid() {
  if (!mermaidInstance) {
    const mod = await import("mermaid");
    mermaidInstance = mod.default;
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: "neutral",
      fontFamily: "Helvetica, Arial, sans-serif",
      flowchart: { htmlLabels: false },
      class: { htmlLabels: false },
      state: { htmlLabels: false },
      er: { htmlLabels: false },
      htmlLabels: false,
    });
  }
  return mermaidInstance;
}

function parseSvgSize(svgString) {
  const viewBoxMatch = svgString.match(/viewBox="[\d.\-]+\s[\d.\-]+\s([\d.]+)\s([\d.]+)"/);
  if (viewBoxMatch) {
    return { width: parseFloat(viewBoxMatch[1]), height: parseFloat(viewBoxMatch[2]) };
  }
  const widthMatch = svgString.match(/width="([\d.]+)(?:px)?"/);
  const heightMatch = svgString.match(/height="([\d.]+)(?:px)?"/);
  return {
    width: widthMatch ? parseFloat(widthMatch[1]) : 600,
    height: heightMatch ? parseFloat(heightMatch[1]) : 380,
  };
}

async function renderMermaidToPng(code) {
  const mermaid = await getMermaid();
  const id = `pdf-mermaid-${Math.random().toString(36).slice(2)}`;
  const { svg } = await mermaid.render(id, code);
  const { width, height } = parseSvgSize(svg);

  return new Promise((resolve, reject) => {
    const scale = 2;
    const img = new Image();
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve({ dataUrl: canvas.toDataURL("image/png"), width, height });
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function stripInline(text) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function parseMarkdownBlocks(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const fenceMatch = line.match(/^```(\w*)/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || "";
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      const code = codeLines.join("\n");
      blocks.push(lang === "mermaid" ? { type: "mermaid", code } : { type: "code", code });
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2] });
      i++;
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)/);
    if (bulletMatch) {
      blocks.push({ type: "bullet", text: bulletMatch[1] });
      i++;
      continue;
    }

    const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      blocks.push({ type: "numbered", number: numberedMatch[1], text: numberedMatch[2] });
      i++;
      continue;
    }

    if (line.trim() === "") {
      blocks.push({ type: "space" });
      i++;
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
    i++;
  }

  return blocks;
}

function addPage(doc) {
  doc.addPage();
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 0, PAGE.width, 4, "F");
  return MARGIN_TOP;
}

// Sets the right font for this text (embedded Urdu font if needed), applies
// shaping/RTL reordering, and returns { text, isArabic } ready to draw.
async function setTextStyle(doc, rawText, { size, bold = false } = {}) {
  const { text, isArabic } = prepareText(stripInline(rawText));

  if (isArabic) {
    const loaded = await ensureUrduFont(doc);
    if (loaded) {
      doc.setFont(ARABIC_FONT_NAME, "normal");
    } else {
      doc.setFont("helvetica", bold ? "bold" : "normal");
    }
  } else {
    doc.setFont("helvetica", bold ? "bold" : "normal");
  }

  if (size) doc.setFontSize(size);
  return { text, isArabic };
}

async function renderBlocks(doc, blocks, startY) {
  let y = startY;

  const ensureSpace = (needed) => {
    if (y + needed > PAGE.height - MARGIN_BOTTOM) {
      y = addPage(doc);
    }
  };

  for (const block of blocks) {
    if (block.type === "space") {
      y += 8;
      continue;
    }

    if (block.type === "heading") {
      const sizeByLevel = { 1: 16, 2: 14, 3: 12.5, 4: 11.5, 5: 11, 6: 10.5 };
      const fontSize = sizeByLevel[block.level] || 11;
      const { text, isArabic } = await setTextStyle(doc, block.text, { size: fontSize, bold: true });
      doc.setTextColor(...COLORS.heading);
      const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
      ensureSpace(lines.length * (fontSize + 4) + 14);
      y += 8;
      for (const line of lines) {
        if (isArabic) {
          doc.text(line, PAGE.width - MARGIN_X, y, { align: "right" });
        } else {
          doc.text(line, MARGIN_X, y);
        }
        y += fontSize + 4;
      }
      y += 4;
      continue;
    }

    if (block.type === "bullet" || block.type === "numbered") {
      const indent = 16;
      const { text, isArabic } = await setTextStyle(doc, block.text, { size: 10.5 });
      const lines = doc.splitTextToSize(text, CONTENT_WIDTH - indent);
      ensureSpace(lines.length * 15 + 4);

      if (!isArabic) {
        if (block.type === "bullet") {
          doc.setFillColor(...COLORS.accent);
          doc.circle(MARGIN_X + 3, y - 3, 1.6, "F");
        } else {
          doc.setTextColor(...COLORS.muted);
          doc.text(`${block.number}.`, MARGIN_X, y);
        }
      }

      doc.setTextColor(...COLORS.text);
      for (const line of lines) {
        if (isArabic) {
          doc.text(line, PAGE.width - MARGIN_X, y, { align: "right" });
        } else {
          doc.text(line, MARGIN_X + indent, y);
        }
        y += 15;
      }

      if (isArabic) {
        doc.setFillColor(...COLORS.accent);
        doc.rect(PAGE.width - MARGIN_X + 4, y - lines.length * 15 - 3, 2, lines.length * 15, "F");
      }
      y += 2;
      continue;
    }

    if (block.type === "code") {
      doc.setFont("courier", "normal");
      doc.setFontSize(9);
      const codeLines = block.code
        .split("\n")
        .flatMap((l) => doc.splitTextToSize(l || " ", CONTENT_WIDTH - 20));
      const blockHeight = codeLines.length * 12 + 16;

      if (y + blockHeight > PAGE.height - MARGIN_BOTTOM) {
        y = addPage(doc);
      }

      doc.setFillColor(...COLORS.codeBg);
      doc.setDrawColor(...COLORS.accent);
      doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, blockHeight, 3, 3, "FD");

      doc.setTextColor(...COLORS.heading);
      let cy = y + 14;
      for (const line of codeLines) {
        doc.text(line, MARGIN_X + 10, cy);
        cy += 12;
      }
      y += blockHeight + 10;
      continue;
    }

    if (block.type === "mermaid") {
      try {
        const { dataUrl, width, height } = await renderMermaidToPng(block.code);
        const scale = Math.min(1, CONTENT_WIDTH / width);
        const imgWidth = width * scale;
        const imgHeight = height * scale;

        if (y + imgHeight + 20 > PAGE.height - MARGIN_BOTTOM) {
          y = addPage(doc);
        }

        doc.setDrawColor(...COLORS.accent);
        doc.roundedRect(MARGIN_X - 4, y - 4, imgWidth + 8, imgHeight + 8, 4, 4, "S");
        doc.addImage(dataUrl, "PNG", MARGIN_X, y, imgWidth, imgHeight);
        y += imgHeight + 16;
      } catch (err) {
        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.muted);
        const lines = doc.splitTextToSize(`[Diagram couldn't be rendered]`, CONTENT_WIDTH);
        ensureSpace(lines.length * 12 + 10);
        for (const line of lines) {
          doc.text(line, MARGIN_X, y);
          y += 12;
        }
        y += 8;
      }
      continue;
    }

    // paragraph — rendered as a subtle callout box with a colored accent bar,
    // on the right for Arabic (matching its reading direction) or the left
    // for everything else
    const { text, isArabic } = await setTextStyle(doc, block.text, { size: 10.5 });
    const indent = 14;
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH - indent);
    const blockHeight = lines.length * 15 + 10;
    ensureSpace(blockHeight);

    doc.setFillColor(...COLORS.calloutBg);
    doc.roundedRect(MARGIN_X, y - 11, CONTENT_WIDTH, blockHeight, 3, 3, "F");
    doc.setFillColor(...COLORS.accent);
    if (isArabic) {
      doc.rect(PAGE.width - MARGIN_X - 2.5, y - 11, 2.5, blockHeight, "F");
    } else {
      doc.rect(MARGIN_X, y - 11, 2.5, blockHeight, "F");
    }

    doc.setTextColor(...COLORS.text);
    for (const line of lines) {
      if (isArabic) {
        doc.text(line, PAGE.width - MARGIN_X - indent, y, { align: "right" });
      } else {
        doc.text(line, MARGIN_X + indent, y);
      }
      y += 15;
    }
    y += 8;
  }

  return y;
}

function drawHeaderBanner(doc, title) {
  doc.setFillColor(...COLORS.bannerBg);
  doc.rect(0, 0, PAGE.width, 46, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.accent);
  doc.text("MultiMind", MARGIN_X, 29);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(title, PAGE.width - MARGIN_X, 29, { align: "right" });
}

function drawFooters(doc) {
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.muted);
    doc.text("Generated by MultiMind", MARGIN_X, PAGE.height - 30);
    doc.text(`Page ${p} of ${totalPages}`, PAGE.width - MARGIN_X, PAGE.height - 30, {
      align: "right",
    });
  }
}

export async function exportTextToPdf(rawText, filename = "multimind-export.pdf") {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  drawHeaderBanner(doc, "Answer");
  const y = MARGIN_TOP + 40;

  const blocks = parseMarkdownBlocks(rawText);
  await renderBlocks(doc, blocks, y);

  drawFooters(doc);
  doc.save(filename);
}

export async function exportConversationToPdf(turns, title = "MultiMind Conversation") {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  drawHeaderBanner(doc, title);
  let y = MARGIN_TOP + 40;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];

    const { text: qText, isArabic: qIsArabic } = await setTextStyle(
      doc,
      `Q${i + 1}: ${turn.prompt}`,
      { size: 10.5, bold: true }
    );
    const qLines = doc.splitTextToSize(qText, CONTENT_WIDTH - 20);
    const qHeight = qLines.length * 14 + 14;

    if (y + qHeight > PAGE.height - MARGIN_BOTTOM) {
      y = addPage(doc);
    }

    doc.setFillColor(...COLORS.bubbleBg);
    doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, qHeight, 4, 4, "F");
    doc.setTextColor(...COLORS.heading);
    let qy = y + 16;
    for (const line of qLines) {
      if (qIsArabic) {
        doc.text(line, PAGE.width - MARGIN_X - 10, qy, { align: "right" });
      } else {
        doc.text(line, MARGIN_X + 10, qy);
      }
      qy += 14;
    }
    y += qHeight + 10;

    if (turn.best?.type === "image") {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(...COLORS.muted);
      if (y + 14 > PAGE.height - MARGIN_BOTTOM) y = addPage(doc);
      doc.text("[Generated image — not included in PDF export]", MARGIN_X, y);
      y += 20;
    } else if (turn.best?.text) {
      const blocks = parseMarkdownBlocks(turn.best.text);
      y = await renderBlocks(doc, blocks, y);
    }

    y += 14;
  }

  drawFooters(doc);
  doc.save("multimind-conversation.pdf");
}