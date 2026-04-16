import PDFDocument from "pdfkit";
import { Response } from "express";

export async function generateInvoicePDF(invoice: any, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(24).font("Helvetica-Bold").text("INVOICE", 50, 50);
    doc.fontSize(10).font("Helvetica").fillColor("#666")
      .text(`Invoice #: ${invoice.invoiceNumber}`, 50, 85)
      .text(`Issue Date: ${invoice.issueDate}`, 50, 100)
      .text(`Due Date: ${invoice.dueDate}`, 50, 115)
      .text(`Status: ${invoice.status?.toUpperCase()}`, 50, 130);

    // Client info
    if (invoice.client) {
      doc.fillColor("#000").fontSize(12).font("Helvetica-Bold").text("Bill To:", 350, 85);
      doc.fontSize(10).font("Helvetica")
        .text(`${invoice.client.firstName} ${invoice.client.lastName}`, 350, 102)
        .text(invoice.client.company || "", 350, 117)
        .text(invoice.client.email || "", 350, 132);
    }

    // Line items table
    const tableTop = 200;
    doc.moveTo(50, tableTop - 5).lineTo(560, tableTop - 5).stroke("#eee");
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#666")
      .text("DESCRIPTION", 50, tableTop)
      .text("QTY", 360, tableTop, { width: 60, align: "right" })
      .text("UNIT PRICE", 420, tableTop, { width: 70, align: "right" })
      .text("TOTAL", 490, tableTop, { width: 70, align: "right" });
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke("#eee");

    let y = tableTop + 25;
    for (const item of (invoice.items || [])) {
      doc.fontSize(9).font("Helvetica").fillColor("#000")
        .text(item.description, 50, y, { width: 300 })
        .text(String(item.quantity), 360, y, { width: 60, align: "right" })
        .text(`$${Number(item.unitPrice).toFixed(2)}`, 420, y, { width: 70, align: "right" })
        .text(`$${Number(item.total).toFixed(2)}`, 490, y, { width: 70, align: "right" });
      y += 20;
    }

    doc.moveTo(50, y + 5).lineTo(560, y + 5).stroke("#eee");

    // Totals
    y += 20;
    doc.fontSize(9).font("Helvetica").fillColor("#666")
      .text("Subtotal:", 400, y).text(`$${Number(invoice.subtotal).toFixed(2)}`, 490, y, { width: 70, align: "right" });
    y += 15;
    if (Number(invoice.taxAmount) > 0) {
      doc.text("Tax:", 400, y).text(`$${Number(invoice.taxAmount).toFixed(2)}`, 490, y, { width: 70, align: "right" });
      y += 15;
    }
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#000")
      .text("TOTAL:", 400, y).text(`$${Number(invoice.totalAmount).toFixed(2)}`, 490, y, { width: 70, align: "right" });

    if (invoice.notes) {
      y += 40;
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#666").text("Notes:", 50, y);
      doc.fontSize(9).font("Helvetica").fillColor("#444").text(invoice.notes, 50, y + 14, { width: 460 });
    }

    doc.end();
    res.on("finish", resolve);
    res.on("error", reject);
  });
}
