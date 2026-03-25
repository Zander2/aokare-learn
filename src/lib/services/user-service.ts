import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import type { Role } from "@prisma/client"

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: { enrollments: true },
      },
    },
  })
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  })
}

export async function createUser(data: {
  name: string
  email: string
  password: string
}) {
  const hashed = await bcrypt.hash(data.password, 12)
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      hashedPassword: hashed,
    },
  })
}

export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      _count: {
        select: { enrollments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function updateUserRole(id: string, role: Role) {
  return prisma.user.update({
    where: { id },
    data: { role },
  })
}
