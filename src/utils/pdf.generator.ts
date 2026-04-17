import PDFDocument from "pdfkit";
import { Response } from "express";

const BRAND_ORANGE = "#f97316";
const DARK = "#1a1612";
const GRAY = "#6b6256";
const LIGHT_GRAY = "#f5f3ee";
const LINE_COLOR = "#e5e0d8";

export async function generateInvoicePDF(invoice: any, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${invoice.invoiceNumber}.pdf"`
    );
    doc.pipe(res);
    doc.on("end", resolve);
    doc.on("error", reject);

    const pageW = doc.page.width;
    const margin = 50;

    // ── Header bar ───────────────────────────────────────────────────────────
    doc.rect(0, 0, pageW, 90).fill(DARK);

    // Logo / Company name
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text("BUILDERSOFT", margin, 28);

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(BRAND_ORANGE)
      .text("CONSTRUCTION MANAGEMENT", margin, 56);

    // Invoice label top-right
    doc
      .fontSize(28)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text("INVOICE", pageW - margin - 140, 22, { width: 140, align: "right" });

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(BRAND_ORANGE)
      .text(invoice.invoiceNumber, pageW - margin - 140, 58, { width: 140, align: "right" });

    // ── Invoice meta block ────────────────────────────────────────────────────
    let y = 115;

    // Status badge
    const statusColor: Record<string, string> = {
      paid: "#065f46", sent: "#1d4ed8", draft: "#6b7280",
      overdue: "#b91c1c", partially_paid: "#b45309", cancelled: "#374151",
    };
    const statusBg: Record<string, string> = {
      paid: "#d1fae5", sent: "#dbeafe", draft: "#f3f4f6",
      overdue: "#fee2e2", partially_paid: "#fef3c7", cancelled: "#f3f4f6",
    };
    const st = invoice.status ?? "draft";
    doc.roundedRect(margin, y, 80, 20, 4).fill(statusBg[st] ?? "#f3f4f6");
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor(statusColor[st] ?? "#6b7280")
      .text(st.toUpperCase().replace("_", " "), margin + 4, y + 6, { width: 72, align: "center" });

    // Dates
    const dates = [
      ["Issue Date", invoice.issueDate],
      ["Due Date", invoice.dueDate],
      ...(invoice.paidDate ? [["Paid Date", invoice.paidDate]] : []),
    ];
    let dateX = margin + 100;
    for (const [label, value] of dates) {
      doc.fontSize(8).font("Helvetica").fillColor(GRAY).text(label, dateX, y);
      doc.fontSize(10).font("Helvetica-Bold").fillColor(DARK).text(value, dateX, y + 12);
      dateX += 120;
    }

    // ── Bill To / Project ─────────────────────────────────────────────────────
    y = 165;
    doc.moveTo(margin, y).lineTo(pageW - margin, y).lineWidth(1).stroke(LINE_COLOR);
    y += 15;

    // Bill To column
    doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND_ORANGE).text("BILL TO", margin, y);
    y += 14;
    if (invoice.client) {
      const c = invoice.client;
      doc.fontSize(11).font("Helvetica-Bold").fillColor(DARK).text(`${c.firstName} ${c.lastName}`, margin, y);
      y += 14;
      if (c.company) {
        doc.fontSize(9).font("Helvetica").fillColor(GRAY).text(c.company, margin, y);
        y += 12;
      }
      if (c.email) {
        doc.fontSize(9).font("Helvetica").fillColor(GRAY).text(c.email, margin, y);
        y += 12;
      }
      if (c.phone) {
        doc.fontSize(9).font("Helvetica").fillColor(GRAY).text(c.phone, margin, y);
        y += 12;
      }
    }

    // Project column (right side)
    if (invoice.project) {
      const projX = pageW / 2 + 20;
      let projY = 180;
      doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND_ORANGE).text("PROJECT", projX, projY);
      projY += 14;
      doc.fontSize(11).font("Helvetica-Bold").fillColor(DARK).text(invoice.project.name, projX, projY);
      projY += 14;
      if (invoice.project.address) {
        doc.fontSize(9).font("Helvetica").fillColor(GRAY).text(invoice.project.address, projX, projY);
      }
    }

    // ── Line Items Table ──────────────────────────────────────────────────────
    y = Math.max(y + 20, 270);
    doc.moveTo(margin, y).lineTo(pageW - margin, y).lineWidth(0.5).stroke(LINE_COLOR);
    y += 12;

    // Table header
    doc.rect(margin, y, pageW - margin * 2, 22).fill(DARK);
    const cols = { desc: margin + 8, qty: 350, unit: 400, price: 440, total: 500 };
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text("DESCRIPTION", cols.desc, y + 7);
    doc.text("QTY", cols.qty, y + 7, { width: 40, align: "right" });
    doc.text("UNIT", cols.unit, y + 7, { width: 35, align: "right" });
    doc.text("UNIT PRICE", cols.price, y + 7, { width: 55, align: "right" });
    doc.text("TOTAL", cols.total, y + 7, { width: 55, align: "right" });
    y += 22;

    // Items
    const items: any[] = invoice.items ?? [];
    items.forEach((item, idx) => {
      const rowH = 22;
      if (idx % 2 === 0) {
        doc.rect(margin, y, pageW - margin * 2, rowH).fill(LIGHT_GRAY);
      }
      doc.fontSize(9).font("Helvetica").fillColor(DARK);
      doc.text(item.description ?? "", cols.desc, y + 7, { width: 280 });
      doc.text(String(item.quantity ?? ""), cols.qty, y + 7, { width: 40, align: "right" });
      doc.text(item.unit ?? "", cols.unit, y + 7, { width: 35, align: "right" });
      doc.text(fmt(item.unitPrice), cols.price, y + 7, { width: 55, align: "right" });
      doc.text(fmt(item.total ?? (Number(item.quantity) * Number(item.unitPrice))), cols.total, y + 7, { width: 55, align: "right" });
      y += rowH;
    });

    doc.moveTo(margin, y).lineTo(pageW - margin, y).lineWidth(0.5).stroke(LINE_COLOR);
    y += 15;

    // ── Totals ────────────────────────────────────────────────────────────────
    const totalsX = pageW - margin - 200;
    const totalsW = 200;

    const addTotalRow = (label: string, value: string, bold = false, highlight = false) => {
      if (highlight) {
        doc.rect(totalsX - 10, y - 4, totalsW + 10, 24).fill(BRAND_ORANGE);
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#ffffff");
        doc.text(label, totalsX, y + 2, { width: 110 });
        doc.text(value, totalsX + 110, y + 2, { width: 80, align: "right" });
        y += 24;
      } else {
        doc.fontSize(9).font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(bold ? DARK : GRAY);
        doc.text(label, totalsX, y, { width: 110 });
        doc.text(value, totalsX + 110, y, { width: 80, align: "right" });
        y += 16;
      }
    };

    addTotalRow("Subtotal", fmt(invoice.subtotal));
    if (Number(invoice.taxAmount) > 0) addTotalRow("Tax", fmt(invoice.taxAmount));
    if (Number(invoice.discount) > 0) addTotalRow("Discount", `-${fmt(invoice.discount)}`);
    doc.moveTo(totalsX, y - 4).lineTo(pageW - margin, y - 4).lineWidth(0.5).stroke(LINE_COLOR);
    addTotalRow("TOTAL", fmt(invoice.totalAmount), true, true);
    y += 8;
    if (Number(invoice.amountPaid) > 0) addTotalRow("Amount Paid", fmt(invoice.amountPaid), false);
    if (Number(invoice.amountDue) > 0) addTotalRow("Balance Due", fmt(invoice.amountDue), true);

    // ── Notes & Terms ─────────────────────────────────────────────────────────
    y += 20;
    doc.moveTo(margin, y).lineTo(pageW - margin, y).lineWidth(0.5).stroke(LINE_COLOR);
    y += 15;

    if (invoice.notes) {
      doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND_ORANGE).text("NOTES", margin, y);
      y += 12;
      doc.fontSize(9).font("Helvetica").fillColor(GRAY).text(invoice.notes, margin, y, { width: 250 });
    }

    if (invoice.terms) {
      doc.fontSize(8).font("Helvetica-Bold").fillColor(BRAND_ORANGE).text("TERMS & CONDITIONS", pageW / 2, y - 12);
      doc.fontSize(9).font("Helvetica").fillColor(GRAY).text(invoice.terms, pageW / 2, y, { width: 250 });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.rect(0, doc.page.height - 40, pageW, 40).fill(DARK);
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(GRAY)
      .text(
        "Generated by Buildersoft Construction CMS",
        margin, doc.page.height - 27,
        { width: pageW - margin * 2, align: "center" }
      );

    doc.end();
  });
}

function fmt(val: any): string {
  return `$${Number(val || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}
