import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-4 px-5 text-center">
      <span className="text-5xl">🔍</span>
      <h1 className="text-xl font-extrabold text-zinc-800">Página não encontrada</h1>
      <p className="text-sm text-zinc-500">O endereço que você abriu não existe neste app.</p>
      <Link
        href="/"
        className="mt-2 border-2 border-black bg-yellow-400 px-6 py-3 font-bold text-black shadow-[4px_4px_0_0_#000] transition-all hover:bg-yellow-500 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      >
        Voltar para o início
      </Link>
    </div>
  );
}
