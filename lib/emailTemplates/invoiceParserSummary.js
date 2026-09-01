// HTML for the Invoice Parser Agent's run summary email. Kept in its own
// file (per the spec) rather than inline in the node executor, and kept
// framework-free (no dependency on lib/email.js's Nodemailer transport)
// since this email goes out through the Gmail API as the user's own
// connected account (lib/googleClient.js's gmailSendHtml), not through
// the app's own SMTP sender.
//
// Inline CSS throughout — Gmail and Outlook strip/ignore a real <style>
// tag, so every rule that matters has to live on the element itself.

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * @param {object} params
 * @param {string} params.fileName - the source file that was processed
 * @param {string} params.fileWebViewLink - clickable link to that file
 * @param {number} params.rowCount - rows successfully extracted + appended
 * @param {number} params.failedCount - rows/items that couldn't be parsed
 * @param {string} params.sheetUrl - clickable link to the destination sheet
 */
export function invoiceParserSummaryHtml({ fileName, fileWebViewLink, rowCount, failedCount, sheetUrl }) {
  const failedNote =
    failedCount > 0
      ? `<p style="margin:0 0 18px;padding:12px 14px;border-radius:10px;background:#fef3c7;border:1px solid #fde68a;font-size:14px;line-height:20px;color:#92400e;">
           ${failedCount} item${failedCount === 1 ? "" : "s"} could not be processed and ${failedCount === 1 ? "was" : "were"} skipped — you may want to check the source file.
         </p>`
      : "";

  return `
    <div style="max-width:560px;margin:0 auto;padding:32px;font-family:Inter,Arial,sans-serif;color:#111827;background:#ffffff;">
      <div style="border:1px solid #e5e7eb;border-radius:16px;padding:28px;background:#f9fafb;">
        <div style="font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#2563eb;">MultiMind &middot; Invoice Parser Agent</div>
        <h1 style="margin:14px 0 10px;font-size:26px;line-height:32px;font-weight:800;color:#0f172a;">
          ${rowCount} row${rowCount === 1 ? "" : "s"} extracted from ${escapeHtml(fileName)}
        </h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:24px;color:#475569;">
          A new file was found in your connected Drive folder, its data was extracted, and the rows below were added to your spreadsheet.
        </p>

        ${failedNote}

        <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 22px;">
          <tr>
            <td style="padding:10px 0;font-size:14px;color:#64748b;border-top:1px solid #e5e7eb;">Source file</td>
            <td style="padding:10px 0;font-size:14px;color:#0f172a;text-align:right;border-top:1px solid #e5e7eb;">
              <a href="${escapeHtml(fileWebViewLink)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(fileName)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:14px;color:#64748b;border-top:1px solid #e5e7eb;">Rows added</td>
            <td style="padding:10px 0;font-size:14px;color:#0f172a;text-align:right;border-top:1px solid #e5e7eb;">${rowCount}</td>
          </tr>
        </table>

        <a href="${escapeHtml(sheetUrl)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#2563eb;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
          View in Sheet
        </a>

        <p style="margin:22px 0 0;font-size:13px;line-height:20px;color:#94a3b8;">
          This is an automated message from a Flow you set up in MultiMind.
        </p>
      </div>
    </div>
  `;
}
