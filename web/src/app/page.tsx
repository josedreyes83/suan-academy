import { redirect } from "next/navigation";
import { getSesion, inicioPorRol } from "@/infrastructure/sesion";

export default async function Home() {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  redirect(inicioPorRol(sesion.roles));
}
