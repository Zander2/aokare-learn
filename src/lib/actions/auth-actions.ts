"use server"

import { registerSchema } from "@/lib/validators/auth"
import { createUser, getUserByEmail } from "@/lib/services/user-service"

type ActionResult<T = null> = {
  success: boolean
  error?: string
  data?: T
}

export async function registerAction(
  formData: FormData
): Promise<ActionResult<{ id: string; email: string }>> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  const existingUser = await getUserByEmail(parsed.data.email)
  if (existingUser) {
    // Return a generic message to prevent email enumeration
    return {
      success: false,
      error: "If this email is not already registered, your account will be created",
    }
  }

  try {
    const user = await createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    })
    return {
      success: true,
      data: { id: user.id, email: user.email },
    }
  } catch {
    return { success: false, error: "Failed to create account" }
  }
}

