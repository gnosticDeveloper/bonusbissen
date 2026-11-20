/**
 * Builds a one-page sample invoice PDF in the browser (the main app downloads
 * it from the backend). Deliberately carries no amounts: the demo shows no prices.
 */

/** PDF text strings use WinAnsi; escape delimiters and map accented letters to octal codes. */
function pdfText(value: string): string {
  let out = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (char === "(" || char === ")" || char === "\\") out += `\\${char}`;
    else if (code < 128) out += char;
    else if (code < 256) out += `\\${code.toString(8).padStart(3, "0")}`;
    else out += "?";
  }
  return out;
}

export function buildInvoicePdf(lines: { text: string; size?: number; bold?: boolean; gap?: number }[]): Blob {
  let y = 780;
  const commands = lines
    .map(({ text, size = 11, bold = false, gap = 8 }) => {
      y -= size + gap;
      return `BT /${bold ? "F2" : "F1"} ${size} Tf 56 ${y} Td (${pdfText(text)}) Tj ET`;
    })
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`,
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  // Every character is single-byte (escaped above), so string length equals byte length.
  return new Blob([body], { type: "application/pdf" });
}
