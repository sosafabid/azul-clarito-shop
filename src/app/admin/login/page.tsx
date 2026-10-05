import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { routes } from "@/config/routes";
import { isStaffRole } from "@/domain/roles";
import { loginAction } from "@/server/actions/auth";
import { getSession } from "@/server/auth";

export const metadata: Metadata = { title: "Ingresar" };

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session && isStaffRole(session.role)) redirect(routes.admin);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-celeste/50 to-paper px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-celeste bg-paper p-8 shadow-soft">
        <Image src="/brand/logo-horizontal.jpg" alt="Azul Clarito" width={520} height={250} priority className="mx-auto h-16 w-auto" />
        <h1 className="mt-6 text-center text-2xl font-bold">Administración</h1>
        <p className="mt-1 text-center text-sm text-ink/70">Acceso solo para el equipo de Azul Clarito.</p>
        <div className="mt-8">
          <LoginForm action={loginAction} />
        </div>
      </div>
    </main>
  );
}
