export function verifiedConnection(value) {
  if (!value) throw new Error('Conexão com o banco não configurada.');
  const url = new URL(value);
  url.searchParams.set('sslmode', 'verify-full');
  return url.toString();
}
