import { cookies } from "next/headers";

export class ApiError extends Error {
  code?: string;
  customerId?: string;

  constructor(message: string, extra?: { code?: string; customerId?: string }) {
    super(message);
    this.name = "ApiError";
    this.code = extra?.code;
    this.customerId = extra?.customerId;
  }
}

class AuthError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export const apiServer = async (path: string, reqArgs?: RequestInit) => {
  const cookiesStore = await cookies();
  const token = cookiesStore.get("access_token")?.value;

  if (!token) throw new AuthError("Sesión no valida, por favor vuelva a iniciar sesión");

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

  const res = await fetch(`${backendUrl}${path}`, {
    ...reqArgs,
    headers: {
      ...reqArgs?.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // TODO: show proper, user-fliendly error messages.
  if (!res.ok) throw new ApiError("Algo salió mal, por favor intente nuevamente.", { code: res.statusText });

  return res;
};
