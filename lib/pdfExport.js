// Client-side PDF export helper. Runs entirely in the browser via jsPDF —
// no server round-trip needed, works for both a single answer and a full
// conversation transcript.

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```(\w*)\n?/g, "").replace(/```/g, ""))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*]\s+/gm, "• ");
}

async function getJsPDF() {
  const { jsPDF } = await import("jspdf");
  return jsPDF;
}

function layoutBody(doc, text, marginX, startY, maxY, lineHeight, pageWidth, addPage) {
  const usableWidth = pageWidth - marginX * 2;
  const paragraphs = text.split("\n");
  let y = startY;

  for (const para of paragraphs) {
    if (para.trim() === "") {
      y += lineHeight * 0.6;
      continue;
    }
    const lines = doc.splitTextToSize(para, usableWidth);
    for (const line of lines) {
      if (y > maxY) {
        addPage();
        y = startY;
      }
      doc.text(line, marginX, y);
      y += lineHeight;
    }
  }
  return y;
}

export async function exportTextToPdf(rawText, filename = "multimind-export.pdf") {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const marginTop = 56;
  const maxY = pageHeight - 56;
  const lineHeight = 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);

  const addPage = () => doc.addPage();

  layoutBody(doc, stripMarkdown(rawText), marginX, marginTop, maxY, lineHeight, pageWidth, addPage);

  doc.save(filename);
}

export async function exportConversationToPdf(turns, title = "MultiMind Conversation") {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const marginTop = 56;
  const maxY = pageHeight - 56;
  const lineHeight = 16;

  const addPage = () => doc.addPage();

  // Title page header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(10, 10, 10);
  doc.text(title, marginX, marginTop);

  let y = marginTop + 28;

  turns.forEach((turn, i) => {
    if (y > maxY - 40) {
      addPage();
      y = marginTop;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    y = layoutBody(
      doc,
      `Q${i + 1}: ${turn.prompt}`,
      marginX,
      y,
      maxY,
      lineHeight,
      pageWidth,
      addPage
    );

    y += 4;

    if (turn.best?.type === "image") {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      if (y > maxY) {
        addPage();
        y = marginTop;
      }
      doc.text("[Generated image — not included in PDF text export]", marginX, y);
      y += lineHeight;
    } else if (turn.best?.text) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(50, 50, 50);
      y = layoutBody(
        doc,
        stripMarkdown(turn.best.text),
        marginX,
        y,
        maxY,
        lineHeight,
        pageWidth,
        addPage
      );
    }

    y += 18;
  });

  doc.save("multimind-conversation.pdf");
}