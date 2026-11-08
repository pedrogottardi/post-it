/** Converte um valor exibido em pt-BR ("1.234,56") ou simples ("1234.56") em número. */
export function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return null;

  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

/** Formata um valor numérico para exibição dentro do input, sem o "R$". */
export function formatAmountForInput(amount: number | null): string {
  if (typeof amount !== 'number') return '';
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
