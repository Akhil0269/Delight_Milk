import { supabase } from "@/integrations/supabase/client";

export interface ImageSearchResult {
    id: string;
    url: string;
    thumbUrl: string;
    title: string;
    photographer?: string;
    source: string;
}

export interface ImageSearchResponse {
    isConfigured: boolean;
    message?: string;
    images: ImageSearchResult[];
}

export interface AIGenerationResponse {
    isConfigured: boolean;
    url?: string;
    prompt?: string;
    message?: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Validates file format, presence, and file size
 */
export function validateImageFile(file: File | null | undefined): { valid: boolean; error?: string } {
    if (!file || typeof file.size !== "number" || file.size <= 0) {
        return {
            valid: false,
            error: "File is empty or corrupt. Please select a valid image file.",
        };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.",
        };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
            valid: false,
            error: "File size exceeds the 5MB limit. Please choose a smaller image.",
        };
    }

    return { valid: true };
}

/**
 * Checks if online external image search is configured via environment keys
 */
export function isImageSearchConfigured(): boolean {
    const unsplashKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    const pexelsKey = import.meta.env.VITE_PEXELS_API_KEY;
    return Boolean(unsplashKey || pexelsKey);
}

/**
 * Checks if AI product image generation is configured via environment keys
 */
export function isAIGenerationConfigured(): boolean {
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const aiKey = import.meta.env.VITE_AI_IMAGE_KEY;
    return Boolean(openaiKey || aiKey);
}

/**
 * Safely removes a product image from Supabase Storage if it belongs to the products bucket.
 */
export async function deleteProductImage(pathOrUrl: string): Promise<boolean> {
    if (!pathOrUrl) return false;

    try {
        let storagePath = pathOrUrl;
        // If it's a full public URL, extract the bucket-relative path
        if (pathOrUrl.includes("/products/")) {
            const parts = pathOrUrl.split("/products/");
            storagePath = parts[parts.length - 1];
            if (!storagePath) return false;
            // Prepend products/ folder if stripped
            if (!storagePath.startsWith("products/")) {
                storagePath = `products/${storagePath}`;
            }
        }

        const { error } = await supabase.storage.from("products").remove([storagePath]);
        if (error) {
            console.warn("Could not remove storage object:", error.message);
            return false;
        }
        return true;
    } catch (e) {
        console.warn("Storage deletion error:", e);
        return false;
    }
}


/**
 * Uploads an image file to the Supabase Storage 'products' bucket.
 * Returns the public URL of the uploaded image.
 */
export async function uploadProductImage(file: File): Promise<{ url: string; path: string }> {
    const validation = validateImageFile(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
    const filePath = `products/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${sanitizedName}.${ext}`;

    const { data, error } = await supabase.storage
        .from("products")
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
        });

    if (error) {
        console.error("Supabase Storage upload error:", error);
        throw new Error(`Failed to upload image: ${error.message}`);
    }

    const { data: publicData } = supabase.storage
        .from("products")
        .getPublicUrl(data.path);

    if (!publicData?.publicUrl) {
        throw new Error("Unable to retrieve public URL for uploaded image.");
    }

    return {
        url: publicData.publicUrl,
        path: data.path,
    };
}

/**
 * Searches for suitable product imagery using Unsplash or Pexels if configured.
 * Does NOT scrape search engines. Gracefully reports configuration status.
 */
export async function searchOnlineImages(query: string): Promise<ImageSearchResponse> {
    const unsplashKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    const pexelsKey = import.meta.env.VITE_PEXELS_API_KEY;

    if (!unsplashKey && !pexelsKey) {
        return {
            isConfigured: false,
            message: "Online Image Search is not configured. Add VITE_UNSPLASH_ACCESS_KEY or VITE_PEXELS_API_KEY to your environment variables to enable online dairy imagery search.",
            images: [],
        };
    }

    try {
        const searchQuery = `${query.trim()} dairy fresh milk`;

        if (unsplashKey) {
            const endpoint = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=8&orientation=landscape`;
            const res = await fetch(endpoint, {
                headers: {
                    Authorization: `Client-ID ${unsplashKey}`,
                },
            });

            if (!res.ok) {
                throw new Error(`Unsplash API error: ${res.statusText}`);
            }

            interface UnsplashPhotoItem {
                id: string;
                urls?: { regular?: string; full?: string; small?: string; thumb?: string };
                alt_description?: string;
                description?: string;
                user?: { name?: string };
            }

            const data = await res.json();
            const images: ImageSearchResult[] = ((data.results as UnsplashPhotoItem[]) || []).map((item) => ({
                id: item.id,
                url: item.urls?.regular || item.urls?.full || "",
                thumbUrl: item.urls?.small || item.urls?.thumb || "",
                title: item.alt_description || item.description || query,
                photographer: item.user?.name || "Unsplash Creator",
                source: "Unsplash",
            }));

            return {
                isConfigured: true,
                images,
            };
        }

        if (pexelsKey) {
            const endpoint = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=8`;
            const res = await fetch(endpoint, {
                headers: {
                    Authorization: pexelsKey,
                },
            });

            if (!res.ok) {
                throw new Error(`Pexels API error: ${res.statusText}`);
            }

            interface PexelsPhotoItem {
                id: string | number;
                src?: { large?: string; medium?: string; small?: string };
                alt?: string;
                photographer?: string;
            }

            const data = await res.json();
            const images: ImageSearchResult[] = ((data.photos as PexelsPhotoItem[]) || []).map((item) => ({
                id: String(item.id),
                url: item.src?.large || item.src?.medium || "",
                thumbUrl: item.src?.medium || item.src?.small || "",
                title: item.alt || query,
                photographer: item.photographer || "Pexels Creator",
                source: "Pexels",
            }));

            return {
                isConfigured: true,
                images,
            };
        }

        return {
            isConfigured: false,
            message: "No active image search provider available.",
            images: [],
        };
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Network error";
        console.error("Online image search failed:", err);
        return {
            isConfigured: true,
            message: `Search failed: ${errorMsg}`,
            images: [],
        };
    }
}

/**
 * Builds the standard e-commerce prompt for dairy product images
 */
export function buildDairyImagePrompt(productName: string, category: string): string {
    return `Professional realistic product photograph of fresh ${productName.trim()} (${category.trim()}) for a premium dairy e-commerce website, clean studio background, natural soft lighting, centered product composition, high quality, no text, no watermark.`;
}

/**
 * Generates an AI product image if an AI provider key is configured.
 * Does NOT invent fake credentials or make fake generation requests.
 */
export async function generateAIProductImage(productName: string, category: string): Promise<AIGenerationResponse> {
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const aiKey = import.meta.env.VITE_AI_IMAGE_KEY;
    const prompt = buildDairyImagePrompt(productName, category);

    if (!openaiKey && !aiKey) {
        return {
            isConfigured: false,
            prompt,
            message: "AI Image Generation is not configured. Add VITE_OPENAI_API_KEY or VITE_AI_IMAGE_KEY to your environment variables to enable automated realistic product imagery.",
        };
    }

    try {
        const apiKey = openaiKey || aiKey;
        const res = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt,
                n: 1,
                size: "1024x1024",
                quality: "standard",
            }),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.error?.message || `AI Generation error: ${res.statusText}`);
        }

        const data = await res.json();
        const imageUrl = data?.data?.[0]?.url;

        if (!imageUrl) {
            throw new Error("No image URL returned from AI provider.");
        }

        return {
            isConfigured: true,
            url: imageUrl,
            prompt,
        };
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("AI image generation failed:", err);
        return {
            isConfigured: true,
            prompt,
            message: `Generation failed: ${errorMsg}`,
        };
    }
}
