const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// ─── Brand tokens (match the app + transactional emails) ─────────────────────
const INK = "#101014";
const NAVY = "#1e2a4a";
const GOLD = "#C8A45C";
const BODY = "#3f3f46";
const MUTED = "#71717a";
const FAINT = "#a1a1aa";
const LINE = "#e4e4e7";
const WASH = "#fafafa";
const GREEN = "#059669";

const LOGO_PATH = path.join(__dirname, "..", "assets", "elitecrew-logo.png");

// A4: 595.28 x 841.89 pt
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 48; // page margin
const CW = PAGE_W - M * 2; // content width

// Built-in Helvetica has no ₹ glyph, so amounts use "Rs." (WinAnsi-safe).
const money = (value = 0) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) =>
  new Date(value || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ─── Amount in words (Indian numbering: crore / lakh / thousand) ─────────────
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}

function threeDigits(n) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h && rest) return `${ONES[h]} Hundred ${twoDigits(rest)}`;
  if (h) return `${ONES[h]} Hundred`;
  return twoDigits(rest);
}

function amountInWords(amount) {
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const parts = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const below = rupees % 1000;
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (below) parts.push(threeDigits(below));

  let words = parts.length ? `${parts.join(" ")} Rupees` : "";
  if (paise) words += `${words ? " and " : ""}${twoDigits(paise)} Paise`;
  return `${words} Only`;
}

// ─── Small drawing helpers ────────────────────────────────────────────────────
function hr(doc, y, x1 = M, x2 = M + CW, color = LINE, w = 0.7) {
  doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(w).strokeColor(color).stroke().restore();
}

function label(doc, text, x, y, opts = {}) {
  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor(opts.color || FAINT)
    .text(text.toUpperCase(), x, y, { characterSpacing: 1.1, ...opts });
}

async function generateInvoicePdf({
  booking,
  customerName,
  providerName,
  providerGSTin = "",
  providerPhone = "",
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pricing = booking.pricing || {};
    const basePrice = pricing.basePrice || 0;
    const platformFee = pricing.platformFee || 0;
    const discount = pricing.discount || 0;
    const tax = pricing.tax || 0;
    const total = pricing.totalAmount || 0;
    const invoiceNo = booking.bookingNumber || "—";
    const isCOD = booking.paymentMethod === "cash_on_delivery" || booking.paymentMethod === "cash";
    const isPaid = (booking.paymentStatus || "paid").toLowerCase() === "paid";

    // ── Brand rule across the very top ──────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 4).fill(GOLD);

    // ── Header: logo + wordmark left, TAX INVOICE right ─────────────────────
    const headTop = 42;
    let wordmarkX = M;
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, M, headTop - 2, { width: 42, height: 42 });
      wordmarkX = M + 52;
    }
    doc.font("Helvetica-Bold").fontSize(19).fillColor(INK).text("Elite", wordmarkX, headTop, { continued: true });
    doc.fillColor(GOLD).text("Crew");
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(MUTED)
      .text("Professional Home Services", wordmarkX, headTop + 23);

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(INK)
      .text("TAX INVOICE", M, headTop + 1, { width: CW, align: "right" });
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text("Original for Recipient", M, headTop + 22, { width: CW, align: "right" });

    hr(doc, headTop + 48);

    // ── Invoice meta strip: four columns ────────────────────────────────────
    const metaY = headTop + 62;
    const metaCol = CW / 4;
    const metas = [
      ["Invoice No.", invoiceNo],
      ["Invoice Date", formatDate(booking.completedAt)],
      ["Service Date", formatDate(booking.scheduledDate)],
      ["Place of Supply", booking.address?.city || "—"],
    ];
    metas.forEach(([k, v], i) => {
      const x = M + metaCol * i;
      label(doc, k, x, metaY);
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor(INK)
        .text(String(v), x, metaY + 11, { width: metaCol - 12 });
    });

    // ── Parties: service partner / billed to ────────────────────────────────
    const partyY = metaY + 42;
    const boxH = 86;
    const boxW = (CW - 14) / 2;

    // left box — service partner
    doc.roundedRect(M, partyY, boxW, boxH, 6).lineWidth(0.7).strokeColor(LINE).stroke();
    label(doc, "Service Partner (Sold By)", M + 14, partyY + 12);
    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor(INK)
      .text(providerName || "EliteCrew Partner", M + 14, partyY + 26, { width: boxW - 28 });
    doc.font("Helvetica").fontSize(8.5).fillColor(BODY);
    if (providerPhone) doc.text(`Phone: ${providerPhone}`, M + 14, partyY + 42);
    doc
      .fillColor(MUTED)
      .text(
        `GSTIN: ${providerGSTin || "Unregistered"}`,
        M + 14,
        providerPhone ? partyY + 55 : partyY + 42
      );
    doc.text("Facilitated by EliteCrew", M + 14, partyY + boxH - 18);

    // right box — billed to
    const rx = M + boxW + 14;
    doc.roundedRect(rx, partyY, boxW, boxH, 6).lineWidth(0.7).strokeColor(LINE).stroke();
    label(doc, "Billed To / Service Address", rx + 14, partyY + 12);
    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor(INK)
      .text(customerName || "Customer", rx + 14, partyY + 26, { width: boxW - 28 });
    const addr = [booking.address?.text, booking.address?.city, booking.address?.pincode]
      .filter(Boolean)
      .join(", ");
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(BODY)
      .text(addr || "—", rx + 14, partyY + 42, { width: boxW - 28, lineGap: 1.5 });

    // ── Line items table ─────────────────────────────────────────────────────
    const tableY = partyY + boxH + 24;
    const cols = {
      idx: { x: M, w: 26 },
      desc: { x: M + 26, w: 235 },
      sac: { x: M + 261, w: 58 },
      qty: { x: M + 319, w: 40 },
      rate: { x: M + 359, w: 70 },
      amt: { x: M + 429, w: CW - 429 },
    };

    // header row
    doc.rect(M, tableY, CW, 22).fill(INK);
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#ffffff");
    const th = (t, c, align = "left") =>
      doc.text(t.toUpperCase(), cols[c].x + 8, tableY + 8, {
        width: cols[c].w - 16,
        align,
        characterSpacing: 0.8,
      });
    th("#", "idx");
    th("Description", "desc");
    th("SAC", "sac");
    th("Qty", "qty", "right");
    th("Rate", "rate", "right");
    th("Amount", "amt", "right");

    // service row
    const rowY = tableY + 22;
    const rowH = 44;
    doc.rect(M, rowY, CW, rowH).fill("#ffffff");
    doc.font("Helvetica").fontSize(9).fillColor(BODY).text("1", cols.idx.x + 8, rowY + 12);
    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(INK)
      .text(booking.serviceName || "Home Service", cols.desc.x + 8, rowY + 10, {
        width: cols.desc.w - 16,
      });
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(
        `Booking ${invoiceNo} · ${formatDate(booking.scheduledDate)}${booking.scheduledTimeSlot ? " · " + booking.scheduledTimeSlot : ""}`,
        cols.desc.x + 8,
        rowY + 24,
        { width: cols.desc.w - 16 }
      );
    doc.font("Helvetica").fontSize(9).fillColor(BODY);
    doc.text("9987", cols.sac.x + 8, rowY + 12, { width: cols.sac.w - 16 });
    doc.text("1", cols.qty.x + 8, rowY + 12, { width: cols.qty.w - 16, align: "right" });
    doc.text(money(basePrice), cols.rate.x + 8, rowY + 12, { width: cols.rate.w - 16, align: "right" });
    doc
      .font("Helvetica-Bold")
      .fillColor(INK)
      .text(money(basePrice), cols.amt.x + 8, rowY + 12, { width: cols.amt.w - 16, align: "right" });

    hr(doc, rowY + rowH);
    // column hairlines on the item row
    [cols.desc.x, cols.sac.x, cols.qty.x, cols.rate.x, cols.amt.x].forEach((x) => {
      doc.save().moveTo(x, tableY + 22).lineTo(x, rowY + rowH).lineWidth(0.5).strokeColor(LINE).stroke().restore();
    });
    doc.save().rect(M, tableY, CW, rowH + 22).lineWidth(0.7).strokeColor(LINE).stroke().restore();

    // ── Totals (right) + words/payment (left) ───────────────────────────────
    const sumY = rowY + rowH + 18;
    const sumW = 240;
    const sumX = M + CW - sumW;

    const sumRows = [
      ["Subtotal", money(basePrice)],
      ["Platform Fee", money(platformFee)],
    ];
    if (discount > 0) sumRows.push(["Discount", `- ${money(discount)}`]);
    sumRows.push(["CGST @ 9%", money(tax / 2)], ["SGST @ 9%", money(tax / 2)]);

    let sy = sumY;
    sumRows.forEach(([k, v]) => {
      doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(k, sumX, sy, { width: sumW - 100 });
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(k === "Discount" ? GREEN : INK)
        .text(v, sumX + sumW - 110, sy, { width: 110, align: "right" });
      sy += 17;
    });

    hr(doc, sy + 2, sumX, sumX + sumW);
    const totalBandY = sy + 10;
    doc.roundedRect(sumX, totalBandY, sumW, 34, 6).fill(INK);
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#ffffff")
      .text("GRAND TOTAL", sumX + 14, totalBandY + 12, { characterSpacing: 1 });
    doc
      .font("Helvetica-Bold")
      .fontSize(12.5)
      .fillColor(GOLD)
      .text(money(total), sumX + sumW - 130, totalBandY + 10, { width: 116, align: "right" });

    // left column: amount in words
    const leftW = CW - sumW - 24;
    label(doc, "Amount in Words", M, sumY);
    doc
      .font("Helvetica-BoldOblique")
      .fontSize(9)
      .fillColor(BODY)
      .text(amountInWords(total), M, sumY + 12, { width: leftW, lineGap: 2 });

    // left column: payment info
    const payY = sumY + 46;
    doc.roundedRect(M, payY, leftW, 58, 6).fill(WASH);
    doc.save().roundedRect(M, payY, leftW, 58, 6).lineWidth(0.7).strokeColor(LINE).stroke().restore();
    label(doc, "Payment Information", M + 14, payY + 11, { color: MUTED });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(BODY)
      .text(`Method: ${isCOD ? "Cash on Delivery" : "Paid Online"}`, M + 14, payY + 25);
    doc.text(`Status: ${(booking.paymentStatus || "paid").toUpperCase()}`, M + 14, payY + 39);

    // PAID stamp — slightly rotated, like a real rubber stamp
    if (isPaid) {
      const stampX = sumX - 90;
      const stampY = totalBandY - 2;
      doc.save();
      doc.rotate(-9, { origin: [stampX + 34, stampY + 16] });
      doc.roundedRect(stampX, stampY, 68, 30, 4).lineWidth(1.6).strokeColor(GREEN).stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor(GREEN)
        .text("PAID", stampX, stampY + 8, { width: 68, align: "center", characterSpacing: 2 });
      doc.restore();
    }

    // ── Signature block ──────────────────────────────────────────────────────
    const signY = Math.max(payY + 90, totalBandY + 70);
    hr(doc, signY);
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(MUTED)
      .text("For EliteCrew", M + CW - 160, signY + 14, { width: 160, align: "right" });
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, M + CW - 34, signY + 26, { width: 26, height: 26 });
    }
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(FAINT)
      .text("Authorised Signatory", M + CW - 160, signY + 58, { width: 160, align: "right" });

    // declaration (left of signature)
    label(doc, "Declaration", M, signY + 14);
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(
        "Services listed above are rendered by the service partner named on this invoice. EliteCrew acts as a facilitator between the customer and the service partner. This is a computer-generated invoice and does not require a physical signature.",
        M,
        signY + 26,
        { width: CW - 200, lineGap: 2 }
      );

    // ── Page footer ──────────────────────────────────────────────────────────
    const footY = PAGE_H - 54;
    hr(doc, footY);
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(INK)
      .text("Thank you for choosing EliteCrew", M, footY + 12, { width: CW, align: "center" });
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(FAINT)
      .text(
        `Invoice ${invoiceNo} · Generated on ${formatDate(Date.now())} · EliteCrew — Professional Home Services`,
        M,
        footY + 25,
        { width: CW, align: "center" }
      );

    doc.end();
  });
}

module.exports = { generateInvoicePdf };
