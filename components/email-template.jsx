import * as React from "react";

const container = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "32px",
  fontFamily: "Inter, Arial, sans-serif",
  color: "#111827",
  background: "#ffffff",
};

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "28px",
  background: "#f9fafb",
};

const brand = {
  fontSize: "14px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#2563eb",
};

const title = {
  margin: "14px 0 10px",
  fontSize: "28px",
  lineHeight: "34px",
  fontWeight: 800,
  color: "#0f172a",
};

const text = {
  margin: "0 0 18px",
  fontSize: "15px",
  lineHeight: "24px",
  color: "#475569",
};

const otpBox = {
  margin: "24px 0",
  padding: "18px",
  borderRadius: "12px",
  textAlign: "center",
  fontSize: "32px",
  lineHeight: "40px",
  fontWeight: 800,
  letterSpacing: "0.18em",
  color: "#0f172a",
  background: "#ffffff",
  border: "1px solid #dbeafe",
};

const button = {
  display: "inline-block",
  padding: "12px 18px",
  borderRadius: "10px",
  background: "#2563eb",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 700,
  textDecoration: "none",
};

export function SignupOtpEmail({ firstName = "there", otp }) {
  return (
    <div style={container}>
      <div style={card}>
        <div style={brand}>MultiMind</div>
        <h1 style={title}>Verify your email</h1>
        <p style={text}>
          Hi {firstName}, welcome to MultiMind. Use this one-time code to finish creating your
          account.
        </p>
        <div style={otpBox}>{otp}</div>
        <p style={text}>
          This code expires in 10 minutes. If you did not request this, you can safely ignore this
          email.
        </p>
      </div>
    </div>
  );
}

export function LowCreditEmail({ firstName = "there", credits = 0, upgradeUrl }) {
  return (
    <div style={container}>
      <div style={card}>
        <div style={brand}>MultiMind credits</div>
        <h1 style={title}>Your credits are running low</h1>
        <p style={text}>
          Hi {firstName}, you have {credits} credits left. Upgrade to Pro to keep using MultiMind
          without waiting for your monthly reset.
        </p>
        <a href={upgradeUrl} style={button}>
          Upgrade to Pro
        </a>
        <p style={{ ...text, marginTop: "18px", marginBottom: 0 }}>
          Pro includes 8,000 credits per month, smart model routing, and full conversation history.
        </p>
      </div>
    </div>
  );
}
