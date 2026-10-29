import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { FLOOR_PLAN_PROMPT, FloorPlanReadingSchema, type FloorPlanReading } from "./floorPlanSchema.ts";

/** Claude Opus 5 unless FLOOR_PLAN_MODEL names another. */
export const MODEL = process.env.FLOOR_PLAN_MODEL || "claude-opus-5";

export type ImageType = "image/png" | "image/jpeg" | "image/webp";

export class FloorPlanError extends Error {
  /** The HTTP status to answer with. */
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Ask Claude to read a floor plan. Resolves with the reading, or throws a
 * FloorPlanError carrying the HTTP status to answer with.
 *
 * A request Claude's safety classifiers decline is re-run on Anthropic's
 * recommended fallback model (server-side `fallbacks: "default"`).
 */
export async function readFloorPlan(client: Anthropic, image: string, mediaType: ImageType): Promise<FloorPlanReading> {
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
          { type: "text", text: FLOOR_PLAN_PROMPT },
        ],
      }],
      output_config: { format: betaZodOutputFormat(FloorPlanReadingSchema) },
    });
    if (response.stop_reason === "refusal") throw new FloorPlanError("The model declined to read this image.", 422);
    if (response.stop_reason === "max_tokens") throw new FloorPlanError("The plan has more detail than one reading can hold.", 502);
    if (!response.parsed_output) throw new FloorPlanError("The model's answer didn't match the expected format.", 502);
    return response.parsed_output;
  } catch (error) {
    if (error instanceof FloorPlanError) throw error;
    if (error instanceof Anthropic.AuthenticationError) throw new FloorPlanError("No valid Anthropic API key is configured on the server.", 503);
    if (error instanceof Anthropic.PermissionDeniedError) throw new FloorPlanError("The API key can't use this model.", 503);
    if (error instanceof Anthropic.RateLimitError) throw new FloorPlanError("Too many requests; try again in a moment.", 429);
    if (error instanceof Anthropic.BadRequestError) throw new FloorPlanError(`The request was rejected: ${error.message}`, 400);
    if (error instanceof Anthropic.APIConnectionError) throw new FloorPlanError("Couldn't reach the Anthropic API.", 502);
    if (error instanceof Anthropic.APIError) throw new FloorPlanError(`Anthropic API error ${error.status}`, 502);
    // No API key or profile anywhere: the client can't even be constructed or sign a request.
    if (error instanceof Error && /api key|apiKey|authentication/i.test(error.message)) {
      throw new FloorPlanError("No Anthropic API key is configured on the server.", 503);
    }
    throw error;
  }
}
