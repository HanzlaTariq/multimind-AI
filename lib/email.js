import nodemailer from "nodemailer";
import User from "@/models/User";

const LOW_CREDIT_THRESHOLD = 30;

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function fromAddress() {
  const from = process.env.GMAIL_FROM_EMAIL || process.env.GMAIL_USER;
  return `MultiMind <${from}>`;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function firstName(name = "") {
  return name.trim().split(/\s+/)[0] || "there";
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function baseEmailHtml({ eyebrow, title, body, actionHtml = "", footer = "" }) {
  return `
    <div style="max-width:560px;margin:0 auto;padding:32px;font-family:Inter,Arial,sans-serif;color:#111827;background:#ffffff;">
      <div style="border:1px solid #e5e7eb;border-radius:16px;padding:28px;background:#f9fafb;">
        <div style="font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#2563eb;">${escapeHtml(eyebrow)}</div>
        <h1 style="margin:14px 0 10px;font-size:28px;line-height:34px;font-weight:800;color:#0f172a;">${escapeHtml(title)}</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:24px;color:#475569;">${escapeHtml(body)}</p>
        ${actionHtml}
        ${
          footer
            ? `<p style="margin:18px 0 0;font-size:15px;line-height:24px;color:#475569;">${escapeHtml(footer)}</p>`
            : ""
        }
      </div>
    </div>
  `;
}

function signupOtpHtml({ name, otp }) {
  return baseEmailHtml({
    eyebrow: "MultiMind",
    title: "Verify your email",
    body: `Hi ${firstName(name)}, welcome to MultiMind. Use this one-time code to finish creating your account.`,
    actionHtml: `
      <div style="margin:24px 0;padding:18px;border-radius:12px;text-align:center;font-size:32px;line-height:40px;font-weight:800;letter-spacing:0.18em;color:#0f172a;background:#ffffff;border:1px solid #dbeafe;">
        ${escapeHtml(otp)}
      </div>
    `,
    footer: "This code expires in 10 minutes. If you did not request this, you can safely ignore this email.",
  });
}

function lowCreditHtml({ name, credits, upgradeUrl }) {
  return baseEmailHtml({
    eyebrow: "MultiMind credits",
    title: "Your credits are running low",
    body: `Hi ${firstName(name)}, you have ${credits} credits left. Upgrade to Pro to keep using MultiMind without waiting for your monthly reset.`,
    actionHtml: `
      <a href="${escapeHtml(upgradeUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
        Upgrade to Pro
      </a>
    `,
    footer: "Pro includes 8,000 credits per month, smart model routing, and full conversation history.",
  });
}

export async function sendSignupOtpEmail({ name, email, otp }) {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD are not configured");
  }

  return transporter.sendMail({
    from: fromAddress(),
    to: email,
    subject: "Your MultiMind verification code",
    html: signupOtpHtml({ name, otp }),
  });
}

export async function sendLowCreditEmail({ name, email, credits }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("Low credit email skipped: Gmail SMTP is not configured");
    return null;
  }

  return transporter.sendMail({
    from: fromAddress(),
    to: email,
    subject: "Your MultiMind credits are running low",
    html: lowCreditHtml({
      name,
      credits,
      upgradeUrl: `${appUrl()}/dashboard/settings`,
    }),
  });
}

export async function sendLowCreditEmailIfNeeded(user) {
  if (!user || (user.credits ?? 0) >= LOW_CREDIT_THRESHOLD || user.lowCreditEmailSentAt) {
    return;
  }

  try {
    const result = await sendLowCreditEmail({
      name: user.name,
      email: user.email,
      credits: user.credits ?? 0,
    });

    if (result?.error) {
      console.error("Low credit email error:", result.error);
      return;
    }

    await User.updateOne(
      { _id: user._id, lowCreditEmailSentAt: null },
      { $set: { lowCreditEmailSentAt: new Date() } }
    );
  } catch (error) {
    console.error("Low credit email error:", error);
  }
}
