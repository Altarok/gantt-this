export function getRandomHexColor(): string {
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`
}

export function toRecord(strings: readonly string[]): Record<string, string> {
  return Object.fromEntries(strings.map(s => [s, s]))
}
