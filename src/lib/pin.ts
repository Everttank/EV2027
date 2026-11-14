// Pincode: we bewaren alleen een hash. Let op: dit houdt meekijkers buiten,
// maar versleutelt de data niet (iemand met toegang tot de browser kan de database lezen).

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`getij:${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
