import { put } from "@vercel/blob";
import { openai } from "@/lib/openai";

function buildImagePrompt(
  title: string,
  category: string,
  content: string,
): string {
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
 * Generates a DALL-E 3 poster and uploads it to Vercel Blob.
 * Returns the permanent public URL or null on error.
 *
 * Requires BLOB_READ_WRITE_TOKEN env variable.
 * Failures are non-fatal — the article is saved regardless.
 */
export async function generateArticlePoster(
  articleId: string,
  title: string,
  category: string,
  content: string,
): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn("[image-gen] BLOB_READ_WRITE_TOKEN not set, skipping poster generation");
    return null;
  }

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

    const buffer = Buffer.from(b64, "base64");

    const blob = await put(`posters/${articleId}.jpg`, buffer, {
      access: 'public',
      contentType: "image/jpeg",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return blob.url;
  } catch (err) {
    console.error(`[image-gen] Failed for article ${articleId}:`, err);
    return null;
  }
}
