"use server";

import { apiServer } from "@/lib/api";
import { FormState } from "../../types";

export const updateOrganization = async (_: FormState, formData: FormData): Promise<FormState> => {
  const newValues = {
    name: formData.get("org-name"),
    icon: formData.get("org-icon"),
    hours: formData.get("org-hours"),
    address: formData.get("org-address"),
    description: formData.get("org-desc"),
  };

  const res = await apiServer("/organization", {
    body: JSON.stringify({ ...newValues }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!res.ok) {
    return {
      message: "Hubo un error tratando de actualizar los datos.",
      status: "error",
    };
  }

  return {
    status: "success",
    message: "Datos actualizados con éxito.",
  };
};
