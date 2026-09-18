export function hr(title?: string): void {
  const line = "─".repeat(64);
  if (title) {
    console.log(`\n${title}`);
    console.log(line);
  } else {
    console.log(line);
  }
}

export function kv(label: string, value: string | number | boolean | null | undefined): void {
  const text = value === null || value === undefined ? "—" : String(value);
  console.log(`  ${label.padEnd(22)} ${text}`);
}

export function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(4)}`;
}

export function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function warn(message: string): void {
  console.warn(`WARN  ${message}`);
}

export function err(message: string): void {
  console.error(`ERROR ${message}`);
}

export function ok(message: string): void {
  console.log(`OK    ${message}`);
}

export function info(message: string): void {
  console.log(`      ${message}`);
}
