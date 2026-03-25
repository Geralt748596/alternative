import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { openai } from "@/lib/openai";

function buildImagePrompt(
  title: string,
  category: string,
  content: string,
): string {
  // Trim content to a short context snippet to keep the prompt focused
  const snippet = content.replace(/\n+/g, " ").slice(0, 300);

  const categoryStyle: Record<string, string> = {
    politics: "political press photography, government buildings, officials",
    business: "financial district, business meeting, stock exchange floor",
    technology: "modern tech workspace, futuristic devices, digital infrastructure",
    science: "laboratory, research facility, scientific discovery moment",
    environment: "natural landscape, environmental activism, climate imagery",
    society: "street photography, community gathering, human interest",
    world: "international landmark, diverse crowd, aerial cityscape",
  };

  const styleHint = categoryStyle[category] ?? "documentary journalism";

  return [
    `Editorial news photograph for an article titled: "${title}".`,
    `Scene context: ${snippet}`,
    `Visual style: ${styleHint}.`,
    "Requirements: realistic documentary photography, dramatic natural lighting,",
    "journalistic composition, muted desaturated color palette,",
    "cinematic depth of field. Absolutely no text, no watermarks, no logos.",
  ].join(" ");
}

/**
 * Generates a DALL-E 3 poster for a news article and saves it to
 * public/posters/{articleId}.jpg. Returns the public URL path or null on error.
 *
 * Failures are non-fatal — the article is saved regardless.
 */
export async function generateArticlePoster(
  articleId: string,
  title: string,
  category: string,
  content: string,
): Promise<string | null> {
  try {
    const prompt = buildImagePrompt(title, category, content);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      size: "1792x1024",
      quality: "standard",
      response_format: "b64_json",
      n: 1,
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) return null;

    const postersDir = path.join(process.cwd(), "public", "posters");
    await mkdir(postersDir, { recursive: true });

    const filePath = path.join(postersDir, `${articleId}.jpg`);
    await writeFile(filePath, Buffer.from(b64, "base64"));

    return `/posters/${articleId}.jpg`;
  } catch (err) {
    console.error(`[image-gen] Failed for article ${articleId}:`, err);
    return null;
  }
}
