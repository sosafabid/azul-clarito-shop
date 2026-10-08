/**
 * Crea (o actualiza) una persona del equipo con contraseña.
 *
 *   npm run admin:create -- --email persona@dominio.com --name "Nombre" --role SUPER_ADMIN
 *
 * - `--role` puede ser SUPER_ADMIN (por defecto) o STAFF.
 * - La contraseña se pide por terminal, SIN mostrarla (y se confirma). Nunca se
 *   pasa como argumento (quedaría en el historial de la terminal).
 * - Si el correo ya existe, se actualiza su contraseña y rol, se reactiva la cuenta,
 *   se quita el bloqueo y se cierran sus sesiones abiertas.
 * - Para automatizar: `--password-stdin` lee la contraseña desde la entrada estándar.
 * - Nunca imprime la contraseña ni su hash.
 */
import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { createDatabase } from "@/db/client";
import { auditLogs, sessions, users } from "@/db/schema";
import { isPlausibleEmail, normalizeEmail, validatePassword } from "@/domain/auth";
import { USER_ROLES, isStaffRole, type UserRole } from "@/domain/roles";
import { hashPassword } from "@/server/auth/password";

config({ path: [".env.local", ".env"], quiet: true });

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function askVisible(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    process.stdin.once("data", (data) => {
      process.stdin.pause();
      resolve(String(data).replace(/\r?\n$/, ""));
    });
  });
}

/** Lee una contraseña sin mostrarla (modo "raw" de la terminal). */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) return reject(new Error("No hay terminal interactiva: usá --password-stdin."));
    const stdin = process.stdin;
    // Primero se silencia la terminal y DESPUÉS se muestra el aviso: así no existe
    // ninguna ventana en la que lo que se escriba pueda verse en pantalla.
    stdin.setRawMode(true);
    process.stdout.write(question);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          stdin.setRawMode(false);
          process.stdout.write("\n");
          process.exit(130);
        } else if (char === "\r" || char === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        } else if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      }
    };
    stdin.on("data", onData);
  });
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta la variable DATABASE_URL (definila en .env.local).");

  const roleArg = (argValue("--role") ?? "SUPER_ADMIN").toUpperCase();
  if (!(USER_ROLES as readonly string[]).includes(roleArg) || !isStaffRole(roleArg as UserRole)) {
    throw new Error("--role debe ser SUPER_ADMIN o STAFF.");
  }
  const role = roleArg as UserRole;

  const email = normalizeEmail(argValue("--email") ?? (await askVisible("Correo: ")));
  if (!isPlausibleEmail(email)) throw new Error("El correo no es válido.");
  const name = argValue("--name") ?? null;

  let password: string;
  if (process.argv.includes("--password-stdin")) {
    password = await readStdin();
  } else {
    password = await askHidden("Contraseña (mín. 12 caracteres, no se muestra): ");
    const confirmation = await askHidden("Repetí la contraseña: ");
    if (password !== confirmation) throw new Error("Las contraseñas no coinciden.");
  }
  const problem = validatePassword(password, email);
  if (problem) throw new Error(problem);

  const db = createDatabase(url);
  const passwordHash = await hashPassword(password);

  const [existing] = await db.select({ id: users.id, role: users.role }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);

  if (existing) {
    // Nunca degradar a una SUPER_ADMIN existente (p. ej. sosafabid@gmail.com) por accidente.
    if (existing.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
      throw new Error("Esa cuenta es SUPER_ADMIN: este script no la degrada. Cambiá los roles desde el panel (Usuarios y roles).");
    }
    await db.batch([
      db
        .update(users)
        .set({ passwordHash, role, isActive: true, failedLoginAttempts: 0, lockedUntil: null, ...(name ? { name } : {}) })
        .where(eq(users.id, existing.id)),
      db.delete(sessions).where(eq(sessions.userId, existing.id)),
      db.insert(auditLogs).values({
        action: "auth.password_set",
        entityType: "user",
        entityId: existing.id,
        metadata: { via: "scripts/create-admin", role },
      }),
    ]);
    console.log(JSON.stringify({ user: "actualizado", email, role }));
    return;
  }

  const id = crypto.randomUUID();
  await db.batch([
    db.insert(users).values({ id, email, name, role, passwordHash, isActive: true }),
    db.insert(auditLogs).values({
      action: "auth.user_created",
      entityType: "user",
      entityId: id,
      metadata: { via: "scripts/create-admin", role },
    }),
  ]);
  console.log(JSON.stringify({ user: "creado", email, role }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Error desconocido.");
  process.exit(1);
});
