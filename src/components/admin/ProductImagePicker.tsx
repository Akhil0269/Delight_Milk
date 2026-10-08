import { useState, useRef, useEffect } from "react";
import {
    Upload, Search, Sparkles, RefreshCw, X, Image as ImageIcon,
    Check, AlertCircle, Info, ExternalLink, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
    uploadProductImage,
    searchOnlineImages,
    generateAIProductImage,
    buildDairyImagePrompt,
    isImageSearchConfigured,
    isAIGenerationConfigured,
    ImageSearchResult
} from "@/services/imageService";

interface ProductImagePickerProps {
    currentImageUrl: string | null;
    productName: string;
    category: string;
    onImageSelected: (url: string) => void;
    onImageRemoved: () => void;
}

type TabType = "upload" | "search" | "ai";

export const ProductImagePicker = ({
    currentImageUrl,
    productName,
    category,
    onImageSelected,
    onImageRemoved,
}: ProductImagePickerProps) => {
    const [activeTab, setActiveTab] = useState<TabType>("upload");
    const [showPicker, setShowPicker] = useState(!currentImageUrl);

    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState(productName || "");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<ImageSearchResult[]>([]);
    const [searchStatus, setSearchStatus] = useState<{ isConfigured: boolean; message?: string }>(() => ({
        isConfigured: isImageSearchConfigured(),
        message: !isImageSearchConfigured()
            ? "Online Image Search is not configured. Add VITE_UNSPLASH_ACCESS_KEY or VITE_PEXELS_API_KEY to environment variables to enable online dairy imagery search."
            : undefined,
    }));

    // AI Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [aiStatus, setAiStatus] = useState<{ isConfigured: boolean; message?: string }>(() => ({
        isConfigured: isAIGenerationConfigured(),
        message: !isAIGenerationConfigured()
            ? "AI Image Generation is not configured. Add VITE_OPENAI_API_KEY or VITE_AI_IMAGE_KEY to environment variables to enable automated realistic product imagery."
            : undefined,
    }));

    useEffect(() => {
        if (!currentImageUrl) {
            setShowPicker(true);
        }
    }, [currentImageUrl]);

    useEffect(() => {
        if (productName && !searchQuery) {
            setSearchQuery(productName);
        }
    }, [productName, searchQuery]);

    // Handle File Upload
    const handleFileChange = async (file: File) => {
        setIsUploading(true);
        setUploadError(null);
        try {
            const { url } = await uploadProductImage(file);
            onImageSelected(url);
            setShowPicker(false);
            toast.success("Product image uploaded successfully to storage!");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to upload image.";
            setUploadError(msg);
            toast.error(msg);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    // Handle Online Image Search
    const handleSearch = async () => {
        const query = searchQuery.trim() || productName.trim() || "milk dairy";
        setIsSearching(true);
        try {
            const result = await searchOnlineImages(query);
            setSearchStatus({
                isConfigured: result.isConfigured,
                message: result.message,
            });
            setSearchResults(result.images || []);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Search failed.";
            toast.error(msg);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle AI Image Generation
    const handleGenerateAI = async () => {
        const name = productName.trim() || "Dairy Milk";
        const cat = category.trim() || "Milk";
        setIsGenerating(true);
        try {
            const res = await generateAIProductImage(name, cat);
            setAiStatus({
                isConfigured: res.isConfigured,
                message: res.message,
            });
            if (res.url) {
                setGeneratedUrl(res.url);
                toast.success("AI image generated successfully!");
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "AI image generation failed.";
            toast.error(msg);
        } finally {
            setIsGenerating(false);
        }
    };

    const aiPromptPreview = buildDairyImagePrompt(productName || "Product", category || "Dairy");

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Product Image</label>
                {currentImageUrl && !showPicker && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPicker(true)}
                        className="text-primary hover:text-primary/90 h-8 text-xs"
                    >
                        Change Image
                    </Button>
                )}
            </div>

            {/* Current Selected Image Preview (if present and picker is minimized) */}
            {currentImageUrl && !showPicker && (
                <div className="relative rounded-xl border bg-muted/30 p-3 flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 border">
                        <img
                            src={currentImageUrl}
                            alt={productName || "Product"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                                const fallback = (e.currentTarget as HTMLElement).nextElementSibling;
                                if (fallback) (fallback as HTMLElement).style.display = "flex";
                            }}
                        />
                        <div
                            className="w-full h-full items-center justify-center text-3xl bg-muted hidden"
                            style={{ display: "none" }}
                        >
                            🥛
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                <Check className="w-3 h-3 mr-1" /> Selected
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                            {currentImageUrl.startsWith("http") ? currentImageUrl : "Local / Storage Image"}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPicker(true)}
                                className="h-7 text-xs"
                            >
                                Replace
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={onImageRemoved}
                                className="h-7 text-xs text-destructive hover:text-destructive/90"
                            >
                                Remove
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Image Source Picker */}
            {showPicker && (
                <Card className="p-4 border-dashed bg-muted/10 space-y-4">
                    {/* Header Tabs */}
                    <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-lg text-xs font-medium">
                        <button
                            type="button"
                            onClick={() => setActiveTab("upload")}
                            className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === "upload"
                                    ? "bg-background text-foreground shadow-sm font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab("search");
                                if (searchResults.length === 0 && productName) {
                                    handleSearch();
                                }
                            }}
                            className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === "search"
                                    ? "bg-background text-foreground shadow-sm font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Search className="w-3.5 h-3.5" />
                            <span>Find Image</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("ai")}
                            className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === "ai"
                                    ? "bg-background text-foreground shadow-sm font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>AI Generate</span>
                        </button>
                    </div>

                    {/* TAB 1: UPLOAD IMAGE */}
                    {activeTab === "upload" && (
                        <div className="space-y-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleFileChange(e.target.files[0]);
                                    }
                                }}
                            />

                            <div
                                onDragEnter={() => setDragActive(true)}
                                onDragLeave={() => setDragActive(false)}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                                    dragActive
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/50 hover:bg-muted/40"
                                }`}
                            >
                                {isUploading ? (
                                    <div className="flex flex-col items-center justify-center py-4 space-y-2">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        <p className="text-sm font-medium">Uploading to Supabase Storage...</p>
                                        <p className="text-xs text-muted-foreground">Please wait while image is stored</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-medium">Click or drag image here to upload</p>
                                        <p className="text-xs text-muted-foreground">
                                            Supports JPEG, PNG, WebP (Max 5MB)
                                        </p>
                                    </div>
                                )}
                            </div>

                            {uploadError && (
                                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{uploadError}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: FIND SUITABLE IMAGE */}
                    {activeTab === "search" && (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search image (e.g., Buffalo Milk, Paneer)..."
                                    className="h-9 text-sm"
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleSearch}
                                    disabled={isSearching}
                                    className="h-9"
                                >
                                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                    <span className="ml-1.5 hidden sm:inline">Search</span>
                                </Button>
                            </div>

                            {!searchStatus.isConfigured ? (
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-semibold text-xs">
                                        <Info className="w-4 h-4 flex-shrink-0" />
                                        <span>Provider Configuration Needed</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {searchStatus.message ||
                                            "Online image search requires an API key (VITE_UNSPLASH_ACCESS_KEY or VITE_PEXELS_API_KEY). You can upload your own image directly from the Upload tab."}
                                    </p>
                                </div>
                            ) : searchResults.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">Select an image for this product:</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1">
                                        {searchResults.map((item) => (
                                            <div
                                                key={item.id}
                                                className="group relative rounded-lg overflow-hidden border bg-muted aspect-square flex flex-col justify-end"
                                            >
                                                <img
                                                    src={item.thumbUrl}
                                                    alt={item.title}
                                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                                <div className="relative z-10 p-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="w-full h-7 text-xs bg-primary hover:bg-primary/90 text-white"
                                                        onClick={() => {
                                                            onImageSelected(item.url);
                                                            setShowPicker(false);
                                                            toast.success("Image selected!");
                                                        }}
                                                    >
                                                        Use Image
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                !isSearching && (
                                    <p className="text-xs text-center text-muted-foreground py-4">
                                        No images found. Try a different search keyword.
                                    </p>
                                )
                            )}
                        </div>
                    )}

                    {/* TAB 3: GENERATE AI IMAGE */}
                    {activeTab === "ai" && (
                        <div className="space-y-4">
                            <div className="p-3 bg-muted/40 rounded-xl border text-xs space-y-1.5">
                                <span className="font-semibold text-foreground flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    AI Dairy Prompt Template
                                </span>
                                <p className="text-muted-foreground italic leading-relaxed">
                                    "{aiPromptPreview}"
                                </p>
                            </div>

                            {!aiStatus.isConfigured ? (
                                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                                    <div className="flex items-center gap-2 text-purple-800 dark:text-purple-400 font-semibold text-xs">
                                        <Info className="w-4 h-4 flex-shrink-0" />
                                        <span>AI Generation Provider Required</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {aiStatus.message ||
                                            "AI Image Generation requires an API key (VITE_OPENAI_API_KEY). Set up the key in environment variables to enable automated realistic product imagery."}
                                    </p>
                                </div>
                            ) : generatedUrl ? (
                                <div className="space-y-3">
                                    <div className="relative rounded-xl overflow-hidden aspect-video bg-muted border">
                                        <img
                                            src={generatedUrl}
                                            alt="AI Generated Dairy"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => {
                                                onImageSelected(generatedUrl);
                                                setShowPicker(false);
                                                toast.success("AI image applied to product!");
                                            }}
                                            className="flex-1"
                                        >
                                            <Check className="w-4 h-4 mr-1.5" />
                                            Use This Image
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleGenerateAI}
                                            disabled={isGenerating}
                                        >
                                            <RefreshCw className={`w-4 h-4 mr-1.5 ${isGenerating ? "animate-spin" : ""}`} />
                                            Regenerate
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setGeneratedUrl(null)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <Button
                                        type="button"
                                        onClick={handleGenerateAI}
                                        disabled={isGenerating}
                                        className="gap-2 bg-gradient-to-r from-purple-600 to-primary hover:from-purple-700 hover:to-primary/90"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Generating Studio Image...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                Generate AI Image
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bottom Cancel / Close button when currentImageUrl already exists */}
                    {currentImageUrl && (
                        <div className="flex justify-end pt-2 border-t">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPicker(false)}
                                className="text-xs h-7"
                            >
                                Keep Current Image
                            </Button>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};
