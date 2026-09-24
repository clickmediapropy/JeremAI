const FAMILIES = new Set(["x-ai", "openai", "anthropic", "google"]);

export interface ListedModel {
  id: string;
  name: string;
  created: number;
}

interface CatalogModel {
  id?: string;
  name?: string;
  created?: number;
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
}

export function pickVisionModels(models: CatalogModel[]): ListedModel[] {
  const picked: ListedModel[] = [];
  for (const model of models) {
    if (!model.id || !model.name || model.id.includes(":")) continue;
    const family = model.id.split("/")[0] ?? "";
    if (!FAMILIES.has(family)) continue;
    const input = new Set(model.architecture?.input_modalities ?? []);
    const output = new Set(model.architecture?.output_modalities ?? []);
    if (!input.has("text") || !input.has("image") || !output.has("text")) continue;
    picked.push({ id: model.id, name: model.name, created: model.created ?? 0 });
  }
  picked.sort((a, b) => b.created - a.created || a.id.localeCompare(b.id));
  return picked.slice(0, 10);
}

export async function listVisionModels(fetchImpl: typeof fetch = fetch): Promise<ListedModel[]> {
  const res = await fetchImpl("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error(`OpenRouter models ${res.status}`);
  const body = (await res.json()) as { data?: CatalogModel[] };
  return pickVisionModels(body.data ?? []);
}

export async function completeJson(
  key: string,
  model: string,
  system: string,
  user: string,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const res = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter chat ${res.status}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("The model did not return a draft.");
  return JSON.parse(text.slice(start, end + 1)) as unknown;
}
