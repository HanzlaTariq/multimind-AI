// Client-side PDF export helper using jsPDF. Renders a lightweight markdown
// parser (headings, bullets, code blocks, Mermaid diagrams, paragraphs) with
// brand colors instead of dumping plain unstyled text.

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
};

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
    const scale = 2; // render at 2x for crisp print quality
    const img = new Image();
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: canvas.toDataURL("image/png"), width, height });
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
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fontSize);
      doc.setTextColor(...COLORS.heading);
      const lines = doc.splitTextToSize(stripInline(block.text), CONTENT_WIDTH);
      ensureSpace(lines.length * (fontSize + 4) + 14);
      y += 8;
      for (const line of lines) {
        doc.text(line, MARGIN_X, y);
        y += fontSize + 4;
      }
      y += 4;
      continue;
    }

    if (block.type === "bullet" || block.type === "numbered") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      const indent = 16;
      const lines = doc.splitTextToSize(stripInline(block.text), CONTENT_WIDTH - indent);
      ensureSpace(lines.length * 15 + 4);

      if (block.type === "bullet") {
        doc.setFillColor(...COLORS.accent);
        doc.circle(MARGIN_X + 3, y - 3, 1.6, "F");
      } else {
        doc.setTextColor(...COLORS.muted);
        doc.text(`${block.number}.`, MARGIN_X, y);
      }

      doc.setTextColor(...COLORS.text);
      for (const line of lines) {
        doc.text(line, MARGIN_X + indent, y);
        y += 15;
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

    // paragraph
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...COLORS.text);
    const lines = doc.splitTextToSize(stripInline(block.text), CONTENT_WIDTH);
    ensureSpace(lines.length * 15 + 4);
    for (const line of lines) {
      doc.text(line, MARGIN_X, y);
      y += 15;
    }
    y += 2;
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

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    const qLines = doc.splitTextToSize(`Q${i + 1}: ${turn.prompt}`, CONTENT_WIDTH - 20);
    const qHeight = qLines.length * 14 + 14;

    if (y + qHeight > PAGE.height - MARGIN_BOTTOM) {
      y = addPage(doc);
    }

    doc.setFillColor(...COLORS.bubbleBg);
    doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, qHeight, 4, 4, "F");
    doc.setTextColor(...COLORS.heading);
    let qy = y + 16;
    for (const line of qLines) {
      doc.text(line, MARGIN_X + 10, qy);
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