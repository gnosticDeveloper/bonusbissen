package studio.gnosticdeveloper.bonusbissen.service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import org.openpdf.text.Document;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.Paragraph;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;
import studio.gnosticdeveloper.bonusbissen.entity.Invoice;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;

/**
 * Renders the Spanish-language invoice document for a billed cycle, straight
 * from {@link Invoice}'s snapshotted amount/line items -- the PDF is never
 * stored, only regenerated on demand. This is a bookkeeping document, not an
 * AFIP electronic factura, hence the disclaimer at the bottom.
 */
@Service
public class InvoiceDocumentService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] generate(Organization org, Invoice invoice) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
            document.add(new Paragraph("Factura", titleFont));
            document.add(new Paragraph(" "));

            document.add(new Paragraph(org.getFiscalName() != null ? org.getFiscalName() : org.getName()));
            if (org.getFiscalAddress() != null) {
                document.add(new Paragraph(org.getFiscalAddress()));
            }
            if (org.getTaxId() != null) {
                document.add(new Paragraph("CUIT: " + org.getTaxId()));
            }
            if (org.getIvaCondition() != null) {
                document.add(new Paragraph("Condición de IVA: " + org.getIvaCondition().getSpanishLabel()));
            }
            document.add(new Paragraph("Vencimiento: " + DATE_FORMAT.format(invoice.getDueAt())));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            table.addCell(headerCell("Concepto"));
            table.addCell(headerCell("Monto"));
            for (Map<String, Object> item : invoice.getLineItems()) {
                table.addCell(String.valueOf(item.get("label")));
                table.addCell("%s %s".formatted(invoice.getCurrency(), item.get("amount")));
            }
            document.add(table);

            document.add(new Paragraph(" "));
            Font totalFont = new Font(Font.HELVETICA, 14, Font.BOLD);
            document.add(new Paragraph("Total: %s %s".formatted(invoice.getCurrency(), invoice.getAmount()), totalFont));

            document.add(new Paragraph(" "));
            Font footnoteFont = new Font(Font.HELVETICA, 9, Font.ITALIC);
            document.add(new Paragraph(
                "Este documento es un comprobante interno de bonusbissen y no constituye una factura fiscal válida ante ARCA.",
                footnoteFont));

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("No se pudo generar el documento de factura: " + e.getMessage(), e);
        }
    }

    private PdfPCell headerCell(String text) {
        PdfPCell cell = new PdfPCell(new Paragraph(text, new Font(Font.HELVETICA, 12, Font.BOLD)));
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        return cell;
    }
}
