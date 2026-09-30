import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(80).optional(),
  mode: z.enum(["login", "signup"]),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    if (body.mode === "signup") {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json(
          { error: "An account with that email already exists." },
          { status: 409 }
        );
      }
      const passwordHash = await hashPassword(body.password);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: body.name?.trim() || email.split("@")[0],
        },
      });
      await createSession({ id: user.id, email: user.email, name: user.name });
      return NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name },
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }
    await createSession({ id: user.id, email: user.email, name: user.name });
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
