const nodemailer = require("nodemailer");
const { generateInvoicePdf } = require("./invoicePdf");

// All clickable links in emails use this base URL.
// Set FRONTEND_URL in production .env to your real domain.
const FRONTEND_URL = (process.env.FRONTEND_URL || "${FRONTEND_URL}").replace(/\/$/, "");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Design tokens (must stay email-client safe: tables, inline CSS, no flex,
//     no gradients, no shadows — flat surfaces with hairline borders) ─────────

const C = {
  ink: "#09090b",      // primary text / black surfaces
  body: "#52525b",     // body copy
  muted: "#a1a1aa",    // secondary text
  faint: "#d4d4d8",    // faintest text
  line: "#e4e4e7",     // hairline borders
  wash: "#fafafa",     // soft panel background
  page: "#f4f4f5",     // page background
  gold: "#C8A45C",     // brand accent
  success: "#059669",
  successWash: "#ecfdf5",
  successLine: "#a7f3d0",
  successInk: "#065f46",
  danger: "#dc2626",
  dangerWash: "#fef2f2",
  dangerLine: "#fecaca",
  dangerInk: "#7f1d1d",
  warning: "#b45309",
  warningWash: "#fffbeb",
  warningLine: "#fde68a",
  warningInk: "#78350f",
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif";

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Shared building blocks ──────────────────────────────────────────────────

const PILL_TONES = {
  neutral: { bg: "#27272a", color: "#e4e4e7" },
  gold:    { bg: C.gold,    color: "#09090b" },
  success: { bg: C.success, color: "#ffffff" },
  danger:  { bg: C.danger,  color: "#ffffff" },
  warning: { bg: "#d97706", color: "#ffffff" },
};

function headerPill(label, tone) {
  const t = PILL_TONES[tone] || PILL_TONES.neutral;
  return `<span style="display:inline-block;background:${t.bg};color:${t.color};font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:5px 14px;border-radius:100px;">${label}</span>`;
}

function ctaButton(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td align="center" style="padding:4px 0 0;">
      <a href="${href}" style="display:inline-block;background:${C.ink};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 36px;border-radius:10px;border:1px solid ${C.ink};">${label}</a>
    </td>
  </tr></table>`;
}

function notice(tone, title, text) {
  const map = {
    success: { bg: C.successWash, line: C.successLine, title: C.success, ink: C.successInk },
    danger:  { bg: C.dangerWash,  line: C.dangerLine,  title: C.danger,  ink: C.dangerInk },
    warning: { bg: C.warningWash, line: C.warningLine, title: C.warning, ink: C.warningInk },
    neutral: { bg: C.wash,        line: C.line,        title: C.ink,     ink: C.body },
  };
  const t = map[tone] || map.neutral;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr><td style="background:${t.bg};border:1px solid ${t.line};border-radius:10px;padding:14px 18px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${t.title};">${title}</p>
      <p style="margin:0;font-size:13px;color:${t.ink};line-height:1.6;">${text}</p>
    </td></tr>
  </table>`;
}

function detailTable(rows) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${C.line};border-radius:10px;margin:0 0 24px;">
    ${rows
      .map(
        ([label, value], i) => `<tr>
      <td style="padding:12px 18px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.muted};width:38%;${i > 0 ? `border-top:1px solid ${C.line};` : ""}">${label}</td>
      <td style="padding:12px 18px;font-size:14px;font-weight:600;color:${C.ink};${i > 0 ? `border-top:1px solid ${C.line};` : ""}">${value}</td>
    </tr>`
      )
      .join("")}
  </table>`;
}

function checklist(items) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    ${items
      .map(
        (item) => `<tr>
      <td style="width:26px;padding:6px 0;vertical-align:top;">
        <span style="display:inline-block;width:18px;height:18px;background:${C.successWash};border:1px solid ${C.successLine};border-radius:100px;text-align:center;line-height:17px;font-size:11px;font-weight:700;color:${C.success};">&#10003;</span>
      </td>
      <td style="padding:6px 0 6px 10px;font-size:14px;color:#27272a;line-height:1.5;vertical-align:top;">${item}</td>
    </tr>`
      )
      .join("")}
  </table>`;
}

/**
 * One shell for every EliteCrew email so each message a user receives — OTP,
 * approval, booking, invoice — looks like it came from the same company.
 */
function renderEmail({ preheader, badge, badgeTone, bodyHtml, recipientEmail, reason }) {
  const year = new Date().getFullYear();
  const sentTo = recipientEmail
    ? `This email was sent to <span style="color:#71717a;">${esc(recipientEmail)}</span>. `
    : "";
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>EliteCrew</title>
</head>
<body style="margin:0;padding:0;background-color:${C.page};font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.page};">
<tr><td align="center" style="padding:36px 16px 48px;">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
    style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${C.line};border-radius:10px;">

    <!-- Brand header -->
    <tr>
      <td style="background:${C.ink};padding:26px 40px;border-radius:9px 9px 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:middle;">
            <span style="font-size:21px;font-weight:800;color:#ffffff;letter-spacing:-0.4px;">Elite<span style="color:${C.gold};">Crew</span></span>
          </td>
          <td align="right" style="vertical-align:middle;">
            ${headerPill(badge, badgeTone)}
          </td>
        </tr></table>
      </td>
    </tr>
    <tr><td style="background:${C.gold};height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- Body -->
    <tr><td style="padding:40px 40px 36px;">${bodyHtml}</td></tr>

    <!-- Footer -->
    <tr>
      <td style="background:${C.wash};border-top:1px solid ${C.line};padding:22px 40px;border-radius:0 0 9px 9px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:middle;">
            <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:${C.ink};">Elite<span style="color:${C.gold};">Crew</span></p>
            <p style="margin:0;font-size:12px;color:${C.muted};">Professional Home Services</p>
          </td>
          <td align="right" style="vertical-align:middle;">
            <p style="margin:0;font-size:11px;color:${C.faint};text-align:right;line-height:1.6;">Automated notification<br/>Please do not reply to this email</p>
          </td>
        </tr></table>
      </td>
    </tr>
  </table>

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;margin-top:18px;">
    <tr><td align="center" style="padding:0 8px;">
      <p style="margin:0 0 4px;font-size:12px;color:${C.muted};line-height:1.6;">${sentTo}${reason}</p>
      <p style="margin:0;font-size:11px;color:${C.faint};">&copy; ${year} EliteCrew &middot; Professional Home Services</p>
    </td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`;
}

async function sendMail({ to, subject, html, text, attachments }) {
  await transporter.sendMail({
    from: `"EliteCrew" <${process.env.SMTP_FROM}>`,
    to,
    subject,
    html,
    text,
    attachments,
  });
}

// ─── OTP / verification emails ───────────────────────────────────────────────

function buildOTPEmail(otp, purpose, recipientEmail) {
  const isReset = purpose === "forgot_password";
  const isProvider = purpose === "provider_email_verify";

  const subject = isReset
    ? "Reset your EliteCrew password"
    : `${otp} is your EliteCrew verification code`;

  const badge = isReset ? "Password Reset" : isProvider ? "Partner Verification" : "Email Verification";
  const headline = isReset ? "Reset your password" : "Confirm your email address";

  const intro = isReset
    ? "We received a request to reset the password on your EliteCrew account. Enter the code below to continue. If you didn't make this request, no action is needed — your account remains secure."
    : isProvider
    ? "Welcome to EliteCrew. To keep our platform safe for customers and partners, please confirm your email address with the code below to continue your registration."
    : "Welcome to EliteCrew. Enter the code below to confirm your email address and activate your account.";

  const bodyHtml = `
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.3px;line-height:1.3;">${headline}</h1>
    <p style="margin:0 0 32px;font-size:14px;color:${C.body};line-height:1.7;">${intro}</p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px;">
      <tr><td align="center" style="background:${C.wash};border:1px solid ${C.line};border-radius:10px;padding:28px 20px 24px;">
        <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${C.muted};">Your verification code</p>
        <p style="margin:0;font-size:38px;font-weight:700;letter-spacing:12px;color:${C.ink};font-family:'Courier New',Courier,monospace;text-indent:12px;">${esc(otp)}</p>
      </td></tr>
    </table>

    <p style="margin:0 0 32px;font-size:12px;color:${C.muted};text-align:center;">
      Code expires in <strong style="color:${C.ink};">10 minutes</strong> &nbsp;&middot;&nbsp; Maximum <strong style="color:${C.ink};">5 attempts</strong>
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td style="border-top:1px solid ${C.line};padding:20px 0 0;">
        <p style="margin:0;font-size:12px;color:${C.muted};line-height:1.7;">
          <strong style="color:${C.body};">Keep this code private.</strong>
          EliteCrew staff will never call, message, or email you asking for this code.
          Anyone who asks for it is not from EliteCrew.
        </p>
      </td></tr>
    </table>`;

  const reason = isReset
    ? "You received this email because a password reset was requested for your account."
    : "You received this email because this address was used to sign up on EliteCrew.";

  const html = renderEmail({
    preheader: isReset
      ? "Use this code to reset your EliteCrew password. It expires in 10 minutes."
      : "Your EliteCrew verification code expires in 10 minutes.",
    badge,
    badgeTone: isReset ? "danger" : "gold",
    bodyHtml,
    recipientEmail,
    reason,
  });

  const text = `${headline}

${intro}

Your verification code: ${otp}

The code expires in 10 minutes (maximum 5 attempts).

Keep this code private. EliteCrew staff will never call, message, or email you asking for this code.

— EliteCrew · Professional Home Services`;

  return { subject, html, text };
}

async function sendOTPEmail(to, otp, purpose) {
  const { subject, html, text } = buildOTPEmail(otp, purpose, to);
  await sendMail({ to, subject, html, text });
}

// ─── Provider decision emails (approved / rejected / suspended) ──────────────

function buildDecisionEmail(providerName, decision, remarks, recipientEmail) {
  const name = esc(providerName);
  const safeRemarks = esc(remarks);

  if (decision === "approved") {
    const subject = "You're approved — welcome to EliteCrew";
    const bodyHtml = `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
        <tr><td style="background:${C.successWash};border:1px solid ${C.successLine};border-radius:100px;width:52px;height:52px;text-align:center;vertical-align:middle;">
          <span style="font-size:24px;font-weight:700;color:${C.success};line-height:52px;">&#10003;</span>
        </td></tr>
      </table>
      <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.3px;line-height:1.3;">Congratulations, ${name} — you're approved</h1>
      <p style="margin:0 0 28px;font-size:14px;color:${C.body};line-height:1.7;">
        Our team has reviewed and verified your application. Your EliteCrew partner profile is now
        <strong style="color:${C.ink};">live</strong>, and customers in your area can find and book your services.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${C.line};border-radius:10px;margin:0 0 24px;">
        <tr><td style="padding:22px 24px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};">What you can do now</p>
          ${checklist([
            "Receive job requests from customers near you",
            "Set your availability and working hours",
            "Build your rating with every completed job",
            "Get paid securely through the platform",
          ])}
        </td></tr>
      </table>

      ${notice(
        "neutral",
        "Tip from the team",
        "Partners with an up-to-date availability schedule and a complete profile receive significantly more bookings in their first month."
      )}

      ${ctaButton(`${FRONTEND_URL}/login`, "Open your dashboard")}`;

    const html = renderEmail({
      preheader: "Your partner profile is live. Customers in your area can now book your services.",
      badge: "Approved",
      badgeTone: "success",
      bodyHtml,
      recipientEmail,
      reason: "You received this email because you applied to become an EliteCrew service partner.",
    });

    const text = `Congratulations, ${providerName} — you're approved

Our team has reviewed and verified your application. Your EliteCrew partner profile is now live, and customers in your area can find and book your services.

What you can do now:
- Receive job requests from customers near you
- Set your availability and working hours
- Build your rating with every completed job
- Get paid securely through the platform

Open your dashboard: ${FRONTEND_URL}/login

— EliteCrew · Professional Home Services`;

    return { subject, html, text };
  }

  if (decision === "rejected") {
    const subject = "An update on your EliteCrew application";
    const remarksBlock = remarks ? notice("danger", "Note from our review team", safeRemarks) : "";

    const bodyHtml = `
      <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.3px;line-height:1.3;">Hi ${name},</h1>
      <p style="margin:0 0 24px;font-size:14px;color:${C.body};line-height:1.7;">
        Thank you for applying to become an EliteCrew service partner. After carefully reviewing your
        application, we're unable to approve it at this time.
      </p>

      ${remarksBlock}

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${C.line};border-radius:10px;margin:0 0 24px;">
        <tr><td style="padding:22px 24px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};">The most common reasons</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td style="padding:5px 0;font-size:13px;color:${C.body};line-height:1.6;">&middot;&nbsp; KYC documents missing or unclear (Aadhaar, PAN, selfie)</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:${C.body};line-height:1.6;">&middot;&nbsp; Incomplete profile information</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:${C.body};line-height:1.6;">&middot;&nbsp; Listed services don't match the experience provided</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:${C.body};line-height:1.6;">&middot;&nbsp; Partner agreement not fully accepted</td></tr>
          </table>
        </td></tr>
      </table>

      <p style="margin:0 0 28px;font-size:14px;color:${C.body};line-height:1.7;">
        You're welcome to <strong style="color:${C.ink};">update and resubmit your application</strong> once
        the points above are addressed. Clear document photos and a complete profile make approval much faster.
      </p>

      ${ctaButton(`${FRONTEND_URL}/login`, "Update my application")}`;

    const html = renderEmail({
      preheader: "Your application needs some changes before it can be approved. You can update and resubmit anytime.",
      badge: "Application Update",
      badgeTone: "neutral",
      bodyHtml,
      recipientEmail,
      reason: "You received this email because you applied to become an EliteCrew service partner.",
    });

    const text = `Hi ${providerName},

Thank you for applying to become an EliteCrew service partner. After carefully reviewing your application, we're unable to approve it at this time.
${remarks ? `\nNote from our review team: ${remarks}\n` : ""}
The most common reasons:
- KYC documents missing or unclear (Aadhaar, PAN, selfie)
- Incomplete profile information
- Listed services don't match the experience provided
- Partner agreement not fully accepted

You're welcome to update and resubmit your application once the points above are addressed.

Update my application: ${FRONTEND_URL}/login

— EliteCrew · Professional Home Services`;

    return { subject, html, text };
  }

  if (decision === "suspended") {
    const subject = "Your EliteCrew partner account has been suspended";
    const remarksBlock = remarks ? notice("warning", "Reason for suspension", safeRemarks) : "";

    const bodyHtml = `
      <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.3px;line-height:1.3;">Hi ${name},</h1>
      <p style="margin:0 0 24px;font-size:14px;color:${C.body};line-height:1.7;">
        Your EliteCrew partner account has been <strong style="color:${C.ink};">temporarily suspended</strong>.
        While suspended, you will not receive new job requests and your profile is hidden from customers.
      </p>

      ${remarksBlock}

      <p style="margin:0 0 28px;font-size:14px;color:${C.body};line-height:1.7;">
        To understand what happened and the steps to restore your account, please get in touch with our
        support team — we'll walk you through it.
      </p>

      ${ctaButton(`${FRONTEND_URL}/login`, "Contact support")}`;

    const html = renderEmail({
      preheader: "Your partner account is temporarily suspended. Contact support to resolve this.",
      badge: "Account Suspended",
      badgeTone: "warning",
      bodyHtml,
      recipientEmail,
      reason: "You received this email because of a status change on your EliteCrew partner account.",
    });

    const text = `Hi ${providerName},

Your EliteCrew partner account has been temporarily suspended. While suspended, you will not receive new job requests and your profile is hidden from customers.
${remarks ? `\nReason for suspension: ${remarks}\n` : ""}
To understand what happened and the steps to restore your account, please contact our support team.

Contact support: ${FRONTEND_URL}/login

— EliteCrew · Professional Home Services`;

    return { subject, html, text };
  }

  return null;
}

async function sendProviderDecisionEmail(to, providerName, decision, remarks) {
  const result = buildDecisionEmail(providerName, decision, remarks, to);
  if (!result) return;
  await sendMail({ to, subject: result.subject, html: result.html, text: result.text });
}

// ─── Booking notification emails ─────────────────────────────────────────────

function bookingDetailRows(b) {
  const date = new Date(b.scheduledDate).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const slot = b.scheduledTimeSlot || "";
  return [
    ["Booking No.", esc(b.bookingNumber || "—")],
    ["Service", esc(b.serviceName)],
    ["Date", esc(date + (slot ? " · " + slot : ""))],
    ["Address", esc(`${b.address?.text || ""}, ${b.address?.city || ""}`)],
    ["Payment", b.paymentMethod === "cash_on_delivery" ? "Cash on Delivery" : "Online"],
    ["Total", `₹${(b.pricing?.totalAmount || 0).toLocaleString("en-IN")}`],
  ];
}

function bookingDetailsText(b) {
  return bookingDetailRows(b)
    .map(([label, value]) => `${label}: ${value.replace(/&amp;/g, "&")}`)
    .join("\n");
}

// Booking confirmed → customer
async function sendBookingConfirmedEmail(to, name, booking) {
  const safeName = esc(name);
  const bodyHtml = `
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.3px;line-height:1.3;">Your booking is confirmed</h1>
    <p style="margin:0 0 24px;font-size:14px;color:${C.body};line-height:1.7;">
      Hi <strong style="color:${C.ink};">${safeName}</strong>, we've received your booking.
      We're matching you with the best available professional — you'll get another update
      the moment your technician is confirmed.
    </p>

    ${detailTable(bookingDetailRows(booking))}

    ${notice(
      "neutral",
      "Your start-of-job OTP",
      "A 4-digit OTP is shown on your booking page. Share it with the technician only when they arrive — it confirms the right professional is at your door and starts the job."
    )}

    ${ctaButton(`${FRONTEND_URL}/bookings/${booking._id}`, "View my booking")}`;

  const html = renderEmail({
    preheader: `Booking ${booking.bookingNumber || ""} received — we're assigning your professional now.`,
    badge: "Booking Confirmed",
    badgeTone: "gold",
    bodyHtml,
    recipientEmail: to,
    reason: "You received this email because you placed a booking on EliteCrew.",
  });

  const text = `Your booking is confirmed

Hi ${name}, we've received your booking. We're matching you with the best available professional — you'll get another update the moment your technician is confirmed.

${bookingDetailsText(booking)}

Your start-of-job OTP: a 4-digit OTP is shown on your booking page. Share it with the technician only when they arrive.

View my booking: ${FRONTEND_URL}/bookings/${booking._id}

— EliteCrew · Professional Home Services`;

  await sendMail({
    to,
    subject: `Booking confirmed · ${booking.serviceName} · ${booking.bookingNumber || ""} — EliteCrew`,
    html,
    text,
  });
}

// New job assigned → provider
async function sendNewJobEmail(to, providerName, booking, customerName = "") {
  const date = new Date(booking.scheduledDate).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const rows = bookingDetailRows(booking);
  if (customerName) rows.splice(1, 0, ["Customer", esc(customerName)]);

  const bodyHtml = `
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.3px;line-height:1.3;">You have a new job request</h1>
    <p style="margin:0 0 24px;font-size:14px;color:${C.body};line-height:1.7;">
      Hi <strong style="color:${C.ink};">${esc(providerName)}</strong>, a customer has booked your service.
      Please review the details and respond from your dashboard.
    </p>

    ${detailTable(rows)}

    ${notice(
      "warning",
      "Action required",
      "Accept this job from your dashboard as soon as possible. If there's no response in time, the job will be offered to another partner."
    )}

    ${ctaButton(`${FRONTEND_URL}/dashboard/provider/orders`, "Review job request")}`;

  const html = renderEmail({
    preheader: `${booking.serviceName} on ${date} — accept from your dashboard before it's reassigned.`,
    badge: "New Job",
    badgeTone: "warning",
    bodyHtml,
    recipientEmail: to,
    reason: "You received this email because you're a registered EliteCrew service partner.",
  });

  const text = `You have a new job request

Hi ${providerName}, a customer has booked your service. Please review the details and respond from your dashboard.

${customerName ? `Customer: ${customerName}\n` : ""}${bookingDetailsText(booking)}

Action required: accept this job from your dashboard as soon as possible. If there's no response in time, the job will be offered to another partner.

Review job request: ${FRONTEND_URL}/dashboard/provider/orders

— EliteCrew · Professional Home Services`;

  await sendMail({
    to,
    subject: `New job request: ${booking.serviceName} on ${date} — EliteCrew`,
    html,
    text,
  });
}

// Provider accepted → customer
async function sendJobAcceptedEmail(to, customerName, booking, providerName) {
  const bodyHtml = `
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.3px;line-height:1.3;">Your professional is confirmed</h1>
    <p style="margin:0 0 24px;font-size:14px;color:${C.body};line-height:1.7;">
      Hi <strong style="color:${C.ink};">${esc(customerName)}</strong>,
      <strong style="color:${C.ink};">${esc(providerName)}</strong> has accepted your booking
      and will arrive as scheduled.
    </p>

    ${detailTable(bookingDetailRows(booking))}

    ${notice(
      "success",
      "When your technician arrives",
      "Share the 4-digit OTP from your booking page with the technician at your door. The job starts only after you share it — that's how we keep every visit verified and safe."
    )}

    ${ctaButton(`${FRONTEND_URL}/bookings/${booking._id}`, "View booking & OTP")}`;

  const html = renderEmail({
    preheader: `${providerName} has accepted your booking and will arrive as scheduled.`,
    badge: "Professional Confirmed",
    badgeTone: "success",
    bodyHtml,
    recipientEmail: to,
    reason: "You received this email because you placed a booking on EliteCrew.",
  });

  const text = `Your professional is confirmed

Hi ${customerName}, ${providerName} has accepted your booking and will arrive as scheduled.

${bookingDetailsText(booking)}

When your technician arrives: share the 4-digit OTP from your booking page with the technician at your door. The job starts only after you share it.

View booking & OTP: ${FRONTEND_URL}/bookings/${booking._id}

— EliteCrew · Professional Home Services`;

  await sendMail({
    to,
    subject: `${providerName} is confirmed for your ${booking.serviceName} — EliteCrew`,
    html,
    text,
  });
}

// Job completed → customer receipt with PDF invoice
async function sendJobCompletedEmail(to, customerName, booking, providerInfo = {}) {
  const total = booking.pricing?.totalAmount || 0;
  const invoicePdf = await generateInvoicePdf({
    booking,
    customerName,
    providerName: providerInfo.providerName,
    providerPhone: providerInfo.providerPhone,
  });

  const bodyHtml = `
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.3px;line-height:1.3;">Service complete — your invoice is ready</h1>
    <p style="margin:0 0 24px;font-size:14px;color:${C.body};line-height:1.7;">
      Hi <strong style="color:${C.ink};">${esc(customerName)}</strong>, your
      <strong style="color:${C.ink};">${esc(booking.serviceName)}</strong> service has been completed.
      Your PDF invoice is attached, and a printable copy is always available on your booking page.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${C.line};border-radius:10px;margin:0 0 24px;">
      <tr>
        <td style="background:${C.ink};padding:20px 24px;border-radius:9px 9px 0 0;">
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.muted};">Amount paid</p>
          <p style="margin:0;font-size:26px;font-weight:800;color:#ffffff;">₹${total.toLocaleString("en-IN")}</p>
        </td>
      </tr>
      <tr><td style="padding:16px 24px;">
        <p style="margin:0 0 6px;font-size:13px;color:${C.body};">Invoice No: <strong style="color:${C.ink};">${esc(booking.bookingNumber)}</strong></p>
        <p style="margin:0;font-size:13px;color:${C.body};">Payment method: <strong style="color:${C.ink};">${booking.paymentMethod === "cash_on_delivery" ? "Cash on Delivery" : "Online"}</strong></p>
      </td></tr>
    </table>

    ${notice(
      "neutral",
      "For your records",
      "Keep this invoice as proof of payment. It's also useful for your service history and any future request with the same professional."
    )}

    ${ctaButton(`${FRONTEND_URL}/bookings/${booking._id}`, "View invoice")}`;

  const html = renderEmail({
    preheader: `Invoice ${booking.bookingNumber} for ₹${total.toLocaleString("en-IN")} is attached.`,
    badge: "Invoice",
    badgeTone: "success",
    bodyHtml,
    recipientEmail: to,
    reason: "You received this email because a booking you placed on EliteCrew was completed.",
  });

  const text = `Service complete — your invoice is ready

Hi ${customerName}, your ${booking.serviceName} service has been completed. Your PDF invoice is attached.

Amount paid: ₹${total.toLocaleString("en-IN")}
Invoice No: ${booking.bookingNumber}
Payment method: ${booking.paymentMethod === "cash_on_delivery" ? "Cash on Delivery" : "Online"}

View invoice: ${FRONTEND_URL}/bookings/${booking._id}

— EliteCrew · Professional Home Services`;

  await sendMail({
    to,
    subject: `Your invoice ${booking.bookingNumber} — EliteCrew`,
    html,
    text,
    attachments: [
      {
        filename: `EliteCrew-Invoice-${booking.bookingNumber || booking._id}.pdf`,
        content: invoicePdf,
        contentType: "application/pdf",
      },
    ],
  });
}

module.exports = {
  sendOTPEmail,
  sendProviderDecisionEmail,
  sendBookingConfirmedEmail,
  sendNewJobEmail,
  sendJobAcceptedEmail,
  sendJobCompletedEmail,
};
