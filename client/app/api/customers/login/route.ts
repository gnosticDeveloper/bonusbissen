import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(`${process.env.API_URL}/auth/customers/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const { token } = await res.json();

  const response = NextResponse.json({ ok: true });
  response.cookies.set("bb_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // TODO: adjust value like the backend
  });

  return response;
}
