import { RegistroPage } from "../RegistroPage";

export const metadata = { title: "Registro · SUAN Academy" };

export default async function Page({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  return <RegistroPage codigo={codigo} />;
}
