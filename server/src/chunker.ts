export interface Chunk { seq: number; text: string }

export function chunkText(text: string, maxTokens: number): Chunk[] {
  const chunkSize = maxTokens * 4;
  const chunks: Chunk[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push({ seq: chunks.length + 1, text: text.slice(i, i + chunkSize) });
  }
  return chunks;
}
