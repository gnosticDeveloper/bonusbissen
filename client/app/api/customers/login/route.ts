import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  const res = await fetch(`${backendUrl}/auth/customers/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const { token } = await res.json();

  const response = NextResponse.json({ ok: true });
  response.cookies.set("customer_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // TODO: adjust value like the backend
  });

  return response;
}
