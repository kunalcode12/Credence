import { jsPDF } from "jspdf";

export function downloadInvoicePdf(invoice: any) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const marginX = 40;
  let y = 50;

  const orgName = invoice?.organization?.name || "";
  const orgEmail = invoice?.organization?.user?.email || "";
  const customerName = `${invoice?.customer?.firstName || ""} ${
    invoice?.customer?.lastName || ""
  }`.trim();
  const issueDate = invoice?.issueDate
    ? new Date(invoice.issueDate).toLocaleDateString()
    : "";
  const dueDate = invoice?.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString()
    : "";
  const status = String(invoice?.status || "").toUpperCase();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`Invoice ${String(invoice?.invoiceNumber || "")}`, marginX, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Issued: ${issueDate}    Due: ${dueDate}    Status: ${status}`,
    marginX,
    y
  );
  y += 28;

  // From / Bill To
  doc.setFont("helvetica", "bold");
  doc.text("From", marginX, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${orgName}${orgEmail ? ` (${orgEmail})` : ""}`, marginX, y + 14);

  doc.setFont("helvetica", "bold");
  doc.text("Bill To", marginX + 260, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${customerName}`, marginX + 260, y + 14);
  y += 40;

  // Table header
  doc.setFont("helvetica", "bold");
  doc.text("Description", marginX, y);
  doc.text("Qty", marginX + 300, y, { align: "right" });
  doc.text("Unit", marginX + 380, y, { align: "right" });
  doc.text("Disc", marginX + 450, y, { align: "right" });
  doc.text("Tax", marginX + 510, y, { align: "right" });
  doc.text("Total", marginX + 560, y, { align: "right" });
  y += 6;
  doc.setLineWidth(0.5);
  doc.line(marginX, y, marginX + 560, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  const items = invoice?.items || [];
  for (const it of items) {
    if (y > 720) {
      doc.addPage();
      y = 50;
    }
    doc.text(String(it?.description || "—"), marginX, y);
    doc.text(String(Number(it?.quantity || 0)), marginX + 300, y, {
      align: "right",
    });
    doc.text(
      `₹ ${Number(it?.unitPrice || 0).toLocaleString()}`,
      marginX + 380,
      y,
      { align: "right" }
    );
    doc.text(`${Number(it?.discount || 0)}%`, marginX + 450, y, {
      align: "right",
    });
    doc.text(`${Number(it?.tax || 0)}%`, marginX + 510, y, { align: "right" });
    doc.text(`₹ ${Number(it?.total || 0).toLocaleString()}`, marginX + 560, y, {
      align: "right",
    });
    y += 18;
  }

  y += 8;
  doc.setLineWidth(0.5);
  doc.line(marginX, y, marginX + 560, y);
  y += 16;

  const subtotal = Number(invoice?.subtotal || 0);
  const discount = Number(invoice?.discountAmount || 0);
  const tax = Number(invoice?.taxAmount || 0);
  const total = Number(invoice?.totalAmount || 0);
  const paid = Number(invoice?.paidAmount || 0);
  const remaining = Math.max(0, total - paid);

  const rightX = marginX + 560;
  const labelX = marginX + 420;
  const row = (label: string, value: string) => {
    doc.text(label, labelX, y);
    doc.text(value, rightX, y, { align: "right" });
    y += 16;
  };

  doc.setFont("helvetica", "normal");
  row("Subtotal", `₹ ${subtotal.toLocaleString()}`);
  row("Discount", `₹ ${discount.toLocaleString()}`);
  row("Tax", `₹ ${tax.toLocaleString()}`);
  doc.setFont("helvetica", "bold");
  row("Total", `₹ ${total.toLocaleString()}`);
  doc.setFont("helvetica", "normal");
  row("Paid", `₹ ${paid.toLocaleString()}`);
  row("Remaining", `₹ ${remaining.toLocaleString()}`);

  const fileName = `Invoice_${String(invoice?.invoiceNumber || "").replace(
    /\s+/g,
    "_"
  )}.pdf`;
  doc.save(fileName);
}
