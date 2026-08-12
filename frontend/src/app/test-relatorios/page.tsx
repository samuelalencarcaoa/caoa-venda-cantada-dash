"use client";

import Link from "next/link";
import { useSalesIntentions } from "@/hooks/useSalesIntentions";
import { ReportErrorCard } from "@/components/report-error-card";

export default function TestRelatoriosPage() {
  const { items, isLoading, error, refresh, isRefreshing } = useSalesIntentions();

  if (isLoading) {
    return (
      <div className="min-h-[70vh] p-8">
        <div className="mb-6 h-10 w-72 animate-pulse rounded-xl bg-slate-200" />
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 h-5 w-40 animate-pulse rounded bg-slate-200" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 h-5 w-48 animate-pulse rounded bg-slate-200" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <section className="mx-auto flex min-h-[70vh] w-full max-w-[900px] items-center p-8">
        <ReportErrorCard
          label="Falha ao carregar os dados"
          title="Não conseguimos mostrar a prévia dos relatórios agora"
          message={error}
          onRetry={() => void refresh()}
          isRetrying={isRefreshing}
        />
      </section>
    );
  }

  const previewRows = items.slice(0, 5);
  const uniqueRegions = new Set(items.map((item) => item.Regional)).size;
  const uniqueStores = new Set(items.map((item) => item.Loja_Venda)).size;
  const uniqueVendors = new Set(items.map((item) => item.Proprietario)).size;

  return (
    <div className="p-8">
      <div className="mb-6 rounded border border-green-200 bg-green-50 p-4">
        <p className="text-green-800">
          <strong>Integração bem-sucedida.</strong> Dados carregados da API.
        </p>
        <p className="mt-2 text-sm text-green-700">
          Total de registros: <strong>{items.length}</strong>
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Registros</p>
          <p className="text-2xl font-semibold">{items.length}</p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Regiões</p>
          <p className="text-2xl font-semibold">{uniqueRegions}</p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Lojas</p>
          <p className="text-2xl font-semibold">{uniqueStores}</p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Vendedores</p>
          <p className="text-2xl font-semibold">{uniqueVendors}</p>
        </div>
      </div>

      <div className="mb-4 rounded border border-slate-200 bg-slate-100 p-4">
        <h2 className="mb-2 font-bold">Primeiros 5 registros</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-200">
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Proprietário</th>
              <th className="p-2 text-left">Tipo</th>
              <th className="p-2 text-left">Regional</th>
              <th className="p-2 text-left">Marca</th>
              <th className="p-2 text-left">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((item) => (
              <tr key={item.ID} className="border-b hover:bg-slate-50">
                <td className="p-2">{item.ID}</td>
                <td className="p-2">{item.Proprietario}</td>
                <td className="p-2">{item.Tipo_Venda}</td>
                <td className="p-2">{item.Regional}</td>
                <td className="p-2">{item.Marca_Veiculo}</td>
                <td className="p-2">{item.Quantidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-4">
        <Link href="/test-relatorios/marca" className="text-blue-600 hover:underline">
          → Teste Marcas
        </Link>
        <Link href="/test-relatorios/vendedor" className="text-blue-600 hover:underline">
          → Teste Vendedores
        </Link>
      </div>
    </div>
  );
}
