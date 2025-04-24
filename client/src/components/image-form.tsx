import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/image-uploader";
import { ImagePreview } from "@/components/image-preview";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Trash2, ImageIcon, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { GenerationParams, generateImage, GeneratedImage } from "@/lib/openai";
import { toast } from "@/hooks/use-toast";
import { saveAs } from "file-saver";

interface ImageFormProps {
  index: number;
  initialParams: Partial<GenerationParams>;
  onStatusChange?: (index: number, status: string) => void;
  onImageGenerated?: (index: number, image: GeneratedImage) => void;
}

export function ImageForm({
  index,
  initialParams,
  onStatusChange,
  onImageGenerated,
}: ImageFormProps) {
  const [params, setParams] = useState<Partial<GenerationParams>>({
    prompt: "",
    imagesPerPrompt: initialParams.imagesPerPrompt || 1,
    ...initialParams
  });
  
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [status, setStatus] = useState<"ready" | "processing" | "completed" | "error">("ready");

  // Update status when it changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(index, status);
    }
  }, [index, status, onStatusChange]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setParams({ ...params, prompt: e.target.value });
  };

  const handleImageUpload = (files: File[]) => {
    setUploadedImages(files);
  };

  const handleImagesPerPromptChange = (value: number) => {
    setParams({ ...params, imagesPerPrompt: value });
  };

  const handleClear = () => {
    setParams({ 
      ...initialParams, 
      prompt: "",
      imagesPerPrompt: initialParams.imagesPerPrompt || 1
    });
    setUploadedImages([]);
    setGeneratedImages([]);
    setStatus("ready");
  };

  const handleGenerateImage = async () => {
    // Validate input
    if (!params.prompt) {
      toast({
        title: "Missing prompt",
        description: "Please enter a text prompt for the image",
        variant: "destructive",
      });
      return;
    }

    try {
      setStatus("processing");
      setGeneratedImages([]); // Clear previous generated images
      
      const generationParams: GenerationParams = {
        prompt: params.prompt,
        model: params.model as "gpt-image" | "dall-e-3" || "gpt-image",
        resolution: params.resolution as string || "1024x1024",
        style: params.style as "vivid" | "natural" || "vivid",
        quality: params.quality as "standard" | "hd" || "standard",
        transparentBg: params.transparentBg,
        exampleImages: uploadedImages,
        imagesPerPrompt: params.imagesPerPrompt || 1
      };
      
      // Generate multiple images sequentially
      const imagesPerPrompt = params.imagesPerPrompt || 1;
      const newImages: GeneratedImage[] = [];
      
      for (let i = 0; i < imagesPerPrompt; i++) {
        try {
          const result = await generateImage(generationParams);
          newImages.push(result);
          
          // Update generated images as they come in
          setGeneratedImages(current => [...current, result]);
          
          if (i === 0 && onImageGenerated) {
            // Just notify about the first image for the parent component
            onImageGenerated(index, result);
          }
        } catch (error) {
          console.error(`Error generating image ${i+1}:`, error);
          // Continue trying to generate the remaining images
        }
      }
      
      if (newImages.length > 0) {
        setStatus("completed");
        toast({
          title: "Images generated",
          description: `Generated ${newImages.length} of ${imagesPerPrompt} requested images`,
          variant: "default",
        });
      } else {
        setStatus("error");
        toast({
          title: "Generation failed",
          description: "Failed to generate any images. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in image generation process:", error);
      setStatus("error");
      
      // Extract error message for better user feedback
      let errorMessage = "Failed to generate images. Please try again.";
      
      if (error instanceof Error) {
        console.debug("Error details:", error.message);
        
        // Handle specific error cases
        if (error.message.includes("timed out")) {
          errorMessage = "The request timed out. The API may be experiencing high traffic or network issues.";
        } else if (error.message.includes("API key")) {
          errorMessage = "API authentication failed. Please check your API key.";
        } else if (error.message.includes("rate limit")) {
          errorMessage = "API rate limit exceeded. Please wait a moment and try again.";
        } else if (error.message.includes("content policy")) {
          errorMessage = "Your prompt may violate content policies. Please modify your request.";
        } else if (error.message) {
          // Use the actual error message if available
          errorMessage = `Error: ${error.message.slice(0, 100)}${error.message.length > 100 ? '...' : ''}`;
        }
      }
      
      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDownloadImage = (imageUrl?: string, index?: number) => {
    if (!imageUrl) return;
    
    // Default extension
    const extension = "jpg";
    const filename = `generated-image-${(index || 0) + 1}.${extension}`;
    
    // Fetch the image and save it
    fetch(imageUrl)
      .then(response => response.blob())
      .then(blob => {
        saveAs(blob, filename);
      })
      .catch(error => {
        console.error("Error downloading image:", error);
        toast({
          title: "Download failed",
          description: "Failed to download the image. Please try again.",
          variant: "destructive",
        });
      });
  };
  
  const handleDownloadAllImages = () => {
    if (generatedImages.length === 0) return;
    
    // Create a zip file with all images
    import('jszip').then(({ default: JSZip }) => {
      const zip = new JSZip();
      const promises = generatedImages.map((image, i) => 
        fetch(image.imageUrl)
          .then(res => res.blob())
          .then(blob => {
            const extension = image.transparentBg ? "png" : "jpg";
            zip.file(`image-${i+1}.${extension}`, blob);
          })
      );
      
      Promise.all(promises)
        .then(() => zip.generateAsync({ type: 'blob' }))
        .then(content => {
          saveAs(content, `image-set-${index+1}.zip`);
        })
        .catch(error => {
          console.error("Error creating zip file:", error);
          toast({
            title: "Download failed",
            description: "Failed to create zip file. Please try downloading images individually.",
            variant: "destructive",
          });
        });
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Image Set {index + 1}</CardTitle>
          <StatusBadge status={status} />
        </div>
        <CardDescription>
          Enter prompt details and upload example images
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Prompt input */}
        <div className="space-y-2">
          <label htmlFor={`prompt-${index}`} className="text-sm font-medium">
            Text Prompt
          </label>
          <Textarea
            id={`prompt-${index}`}
            placeholder="Describe the image you want to generate..."
            rows={3}
            value={params.prompt}
            onChange={handlePromptChange}
            className="resize-none"
          />
        </div>
        
        {/* Example images upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Example Images (up to 5)
          </label>
          <ImageUploader
            value={uploadedImages}
            onChange={handleImageUpload}
            maxFiles={5}
          />
        </div>
        
        {/* Images per prompt control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`images-per-prompt-${index}`} className="text-sm font-medium">
              Images Per Prompt
            </Label>
            <div className="flex items-center">
              <ImageIcon className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{params.imagesPerPrompt || 1}</span>
            </div>
          </div>
          <Input
            id={`images-per-prompt-${index}`}
            type="range"
            min={1}
            max={10}
            value={params.imagesPerPrompt || 1}
            onChange={(e) => handleImagesPerPromptChange(parseInt(e.target.value))}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            Number of images to generate from this prompt and examples (1-10)
          </p>
        </div>
        
        {/* Generated images preview */}
        {(generatedImages.length > 0 || status === "processing") && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Generated Images {generatedImages.length > 0 && `(${generatedImages.length})`}
              </label>
              {generatedImages.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAllImages}
                  className="text-xs"
                >
                  Download All
                </Button>
              )}
            </div>
            
            {status === "processing" && generatedImages.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 border rounded-md bg-muted/10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Generating images...</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md text-center">
                  This may take a moment. The system will automatically retry if needed.
                  OpenAI image generation can occasionally experience temporary service issues.
                </p>
              </div>
            )}
            
            {status === "error" && (
              <div className="flex flex-col items-center justify-center p-8 border rounded-md bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300">
                <div className="rounded-full bg-red-100 dark:bg-red-900/50 p-3 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold mb-1">Image Generation Failed</h4>
                <p className="text-xs text-center max-w-md">
                  The OpenAI image service is currently unavailable. This is a known issue with the OpenAI API in the Replit environment.
                  Please try again later or consider deploying your application for better API connectivity.
                </p>
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                    onClick={handleGenerateImage}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Try Again
                  </Button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {generatedImages.map((image, imgIndex) => (
                <div key={imgIndex} className="relative group border rounded-md overflow-hidden">
                  <ImagePreview
                    imageUrl={image.imageUrl}
                    isLoading={false}
                    onDownload={() => handleDownloadImage(image.imageUrl, imgIndex)}
                  />
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                      onClick={() => handleDownloadImage(image.imageUrl, imgIndex)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Display loading placeholders for in-progress generations */}
              {status === "processing" && Array.from({ length: (params.imagesPerPrompt || 1) - generatedImages.length }).map((_, i) => (
                <div key={`loading-${i}`} className="border rounded-md aspect-square flex items-center justify-center bg-muted/10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex justify-end space-x-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
          
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleGenerateImage}
            disabled={status === "processing" || !params.prompt}
            className="flex items-center gap-1"
          >
            {status === "processing" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : status === "completed" ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    ready: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <Badge className={cn("font-normal", variants[status] || variants.ready)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
