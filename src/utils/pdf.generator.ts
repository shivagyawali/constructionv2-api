import PDFDocument from "pdfkit";
import { Response } from "express";
import { Invoice } from "../entities/Invoice.entity";
import { format } from "date-fns";

export async function generateInvoicePDF(invoice: Invoice, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`
      );
      doc.pipe(res);

      // ── Header ──────────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 100).fill("#1c1917");
      doc.fill("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(26)
        .text("BUILDERSOFT", 50, 30);
      doc.font("Helvetica")
        .fontSize(10)
        .fillColor("#a8a29e")
        .text("Construction Management", 50, 60);
      doc.fill("#f59e0b")
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("INVOICE", 400, 38, { align: "right" });
      doc.fill("#ffffff")
        .font("Helvetica")
        .fontSize(11)
        .text(invoice.invoiceNumber, 50, 78, { width: doc.page.width - 100, align: "right" });

      // ── Invoice Meta ─────────────────────────────────────────────
      doc.fillColor("#1c1917");
      let y = 130;

      const metaLeft = 50;
      const metaRight = 320;

      // Bill To
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#78716c")
        .text("BILL TO", metaLeft, y);
      y += 16;
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#1c1917")
        .text(invoice.client?.fullName ?? "—", metaLeft, y);
      y += 16;
      if (invoice.client?.company) {
        doc.font("Helvetica").fontSize(10).fillColor("#57534e")
          .text(invoice.client.company, metaLeft, y);
        y += 14;
      }
      doc.font("Helvetica").fontSize(10).fillColor("#57534e")
        .text(invoice.client?.email ?? "", metaLeft, y);
      y += 14;
      if (invoice.client?.phone) {
        doc.text(invoice.client.phone, metaLeft, y);
        y += 14;
      }

      // Invoice Details
      const detailY = 130;
      const col1 = metaRight;
      const col2 = 430;

      const addDetail = (label: string, value: string, rowY: number) => {
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#78716c")
          .text(label, col1, rowY);
        doc.font("Helvetica").fontSize(10).fillColor("#1c1917")
          .text(value, col2, rowY);
      };

      addDetail("ISSUE DATE", formatDate(invoice.issueDate), detailY);
      addDetail("DUE DATE", formatDate(invoice.dueDate), detailY + 20);
      addDetail("STATUS", invoice.status.toUpperCase().replace("_", " "), detailY + 40);
      if (invoice.project?.name) {
        addDetail("PROJECT", invoice.project.name, detailY + 60);
      }

      // ── Status Badge ─────────────────────────────────────────────
      const statusColors: Record<string, string> = {
        paid: "#059669", overdue: "#dc2626", sent: "#2563eb",
        draft: "#78716c", partially_paid: "#d97706",
      };
      const badgeColor = statusColors[invoice.status] ?? "#78716c";
      doc.roundedRect(col2, detailY + 36, 80, 18, 4).fill(badgeColor);
      doc.fill("#ffffff").font("Helvetica-Bold").fontSize(8)
        .text(invoice.status.toUpperCase().replace("_", " "), col2 + 4, detailY + 41, { width: 72, align: "center" });

      // ── Items Table ──────────────────────────────────────────────
      y = Math.max(y + 20, 260);
      doc.rect(50, y, doc.page.width - 100, 24).fill("#f5f5f4");
      doc.fill("#44403c").font("Helvetica-Bold").fontSize(9);

      const cols = { desc: 50, type: 260, qty: 320, price: 380, total: 460 };
      doc.text("DESCRIPTION", cols.desc + 8, y + 8);
      doc.text("TYPE", cols.type, y + 8);
      doc.text("QTY", cols.qty, y + 8);
      doc.text("UNIT PRICE", cols.price, y + 8);
      doc.text("TOTAL", cols.total, y + 8, { width: 80, align: "right" });

      y += 24;
      let rowIndex = 0;

      for (const item of invoice.items ?? []) {
        if (rowIndex % 2 === 0) {
          doc.rect(50, y, doc.page.width - 100, 22).fill("#fafaf9");
        }
        doc.fill("#1c1917").font("Helvetica").fontSize(9);
        doc.text(item.description, cols.desc + 8, y + 7, { width: 200 });
        doc.text(item.itemType ?? "service", cols.type, y + 7);
        doc.text(String(item.quantity), cols.qty, y + 7);
        doc.text(formatCurrency(item.unitPrice), cols.price, y + 7);
        doc.text(formatCurrency(item.total), cols.total, y + 7, { width: 80, align: "right" });
        y += 22;
        rowIndex++;
      }

      // ── Totals ───────────────────────────────────────────────────
      y += 10;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke("#e7e5e4");
      y += 14;

      const totalsX = 380;
      const valX = 460;
      const addRow = (label: string, value: string, bold = false, color = "#1c1917") => {
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10)
          .fill("#78716c").text(label, totalsX, y)
          .fill(color).text(value, valX, y, { width: 80, align: "right" });
        y += 18;
      };

      addRow("Subtotal", formatCurrency(invoice.subtotal));
      if (Number(invoice.taxRate) > 0) {
        addRow(`Tax (${invoice.taxRate}%)`, formatCurrency(invoice.taxAmount));
      }
      if (Number(invoice.discount) > 0) {
        addRow("Discount", `- ${formatCurrency(invoice.discount)}`);
      }
      y += 4;
      doc.moveTo(totalsX, y).lineTo(doc.page.width - 50, y).stroke("#e7e5e4");
      y += 8;
      addRow("TOTAL", formatCurrency(invoice.totalAmount), true, "#1c1917");

      if (Number(invoice.amountPaid) > 0) {
        addRow("Amount Paid", formatCurrency(invoice.amountPaid), false, "#059669");
      }
      if (Number(invoice.amountDue) > 0) {
        doc.rect(totalsX - 10, y - 2, doc.page.width - totalsX - 40, 22).fill("#fef3c7");
        addRow("AMOUNT DUE", formatCurrency(invoice.amountDue), true, "#d97706");
      }

      // ── Notes / Terms ─────────────────────────────────────────────
      y += 20;
      if (invoice.notes) {
        doc.font("Helvetica-Bold").fontSize(9).fill("#78716c").text("NOTES", 50, y);
        y += 14;
        doc.font("Helvetica").fontSize(9).fill("#57534e").text(invoice.notes, 50, y, { width: 400 });
        y += doc.heightOfString(invoice.notes, { width: 400 }) + 10;
      }
      if (invoice.terms) {
        doc.font("Helvetica-Bold").fontSize(9).fill("#78716c").text("TERMS & CONDITIONS", 50, y);
        y += 14;
        doc.font("Helvetica").fontSize(9).fill("#57534e").text(invoice.terms, 50, y, { width: 400 });
      }

      // ── Footer ───────────────────────────────────────────────────
      const footerY = doc.page.height - 60;
      doc.rect(0, footerY, doc.page.width, 60).fill("#1c1917");
      doc.fill("#78716c").font("Helvetica").fontSize(8)
        .text("Thank you for your business.", 50, footerY + 14, {
          width: doc.page.width - 100, align: "center",
        });
      doc.fill("#a8a29e").fontSize(7)
        .text(`Generated by Buildersoft • ${invoice.invoiceNumber}`, 50, footerY + 30, {
          width: doc.page.width - 100, align: "center",
        });

      doc.end();
      doc.on("end", resolve);
      doc.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

function formatDate(d: string | Date | null): string {
  if (!d) return "—";
  try { return format(new Date(d), "MMM d, yyyy"); } catch { return "—"; }
}

function formatCurrency(n: number | string | null): string {
  if (n == null) return "$0.00";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(n));
}
