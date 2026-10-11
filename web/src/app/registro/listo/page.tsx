import { LogoFull } from "@/components/Logo";

export default function Listo() {
  return (
    <main className="min-h-dvh panel-navy text-white flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="flex justify-center mb-6"><LogoFull width={220} /></div>
        <div className="mx-auto w-14 h-14 rounded-full bg-lime text-ink grid place-items-center text-3xl font-extrabold mb-4">✓</div>
        <h1 className="text-2xl font-extrabold">Registro recibido</h1>
        <p className="mt-2 text-neutral-300">SUAN Academy revisará tu información y te avisará por WhatsApp cuando tu registro esté aprobado y puedas escoger tus clases.</p>
      </div>
    </main>
  );
}
