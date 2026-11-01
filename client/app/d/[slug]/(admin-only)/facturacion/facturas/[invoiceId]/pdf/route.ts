import { z } from "zod";
import { billingAdminToken } from "@/lib/auth/billing-admin";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

function failure(error: string, status: number) {
  return Response.json({ error }, { status, headers: privateHeaders });
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; invoiceId: string }> }) {
  // Route handlers do not inherit the admin-only layout's authorization check.
  const auth = await billingAdminToken();
  if (!auth.ok) return failure(auth.error, auth.status ?? 401);

  const { invoiceId } = await params;
  if (!z.uuid().safeParse(invoiceId).success) return failure("La factura no es válida.", 400);

  try {
    const response = await fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/organization/invoices/${invoiceId}/pdf`, {
      headers: { Authorization: `Bearer ${auth.data}`, Accept: "application/pdf" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const status = [401, 403, 404].includes(response.status) ? response.status : 502;
      return failure(status === 404 ? "No encontramos esta factura." : "No pudimos descargar la factura. Verificá tu sesión y reintentá.", status);
    }
    if (response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/pdf") {
      return failure("El servicio no devolvió un PDF válido.", 502);
    }
    const pdf = await response.arrayBuffer();
    if (!pdf.byteLength) return failure("El servicio devolvió un PDF vacío.", 502);

    return new Response(pdf, {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="factura-${invoiceId}.pdf"`,
      },
    });
  } catch {
    return failure("No pudimos descargar la factura. Reintentá en un momento.", 502);
  }
}
