import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { batchGenerateImages, downloadImagesAsZip, GeneratedImage } from "@/lib/openai";
import { toast } from "@/hooks/use-toast";
import { Download, Loader2 } from "lucide-react";
import { GenerationParams } from "@/lib/openai";
import { useInterval } from "@/hooks/use-interval";

interface BatchActionsProps {
  imageForms: {
    params: Partial<GenerationParams>;
    status: string;
    generatedImages?: GeneratedImage[];
  }[];
  onBatchStart: () => void;
  onBatchComplete: () => void;
}

export function BatchActions({ 
  imageForms, 
  onBatchStart,
  onBatchComplete
}: BatchActionsProps) {
  const [batchStatus, setBatchStatus] = useState<{
    isProcessing: boolean;
    jobId?: string;
    completed: number;
    total: number;
  }>({
    isProcessing: false,
    completed: 0,
    total: 0,
  });
  
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  // Check batch status if we're processing
  useInterval(
    async () => {
      if (!batchStatus.jobId) return;
      
      try {
        const response = await fetch(`/api/batch/${batchStatus.jobId}`);
        const data = await response.json();
        
        setBatchStatus(prev => ({
          ...prev,
          completed: data.completedRequests,
          isProcessing: data.status !== "completed"
        }));
        
        // If complete, update images and notify
        if (data.status === "completed") {
          setGeneratedImages(data.results);
          onBatchComplete();
          toast({
            title: "Batch Complete",
            description: `${data.completedRequests} images have been generated`,
          });
        }
      } catch (error) {
        console.error("Error checking batch status:", error);
      }
    },
    batchStatus.isProcessing ? 2000 : null
  );

  const handleGenerateAll = async () => {
    // Filter forms with prompts
    const validForms = imageForms.filter(
      (form) => form.params.prompt && form.params.prompt.trim() !== ""
    );
    
    if (validForms.length === 0) {
      toast({
        title: "No Valid Prompts",
        description: "Please enter at least one text prompt",
        variant: "destructive",
      });
      return;
    }
    
    try {
      onBatchStart();
      setBatchStatus({
        isProcessing: true,
        completed: 0,
        total: validForms.length,
      });
      
      // Prepare requests for batch processing
      const requests = validForms.map((form) => ({
        prompt: form.params.prompt || "",
        model: form.params.model as "gpt-image" | "dall-e-3" || "gpt-image",
        resolution: form.params.resolution as string || "1024x1024",
        style: form.params.style as "vivid" | "natural" || "vivid",
        quality: form.params.quality as "standard" | "hd" || "standard",
        transparentBg: form.params.transparentBg,
      }));
      
      // Send batch request
      const result = await batchGenerateImages(requests);
      
      setBatchStatus(prev => ({
        ...prev,
        jobId: result.jobId,
      }));
      
      toast({
        title: "Batch Processing Started",
        description: `Processing ${result.totalRequests} image requests`,
      });
    } catch (error) {
      console.error("Error in batch generation:", error);
      setBatchStatus({
        isProcessing: false,
        completed: 0,
        total: 0,
      });
      
      toast({
        title: "Batch Processing Failed",
        description: "Failed to start batch processing. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadAll = async () => {
    // Get all generated images
    let images: GeneratedImage[] = [];
    
    if (generatedImages.length > 0) {
      // Use cached results from batch job
      images = generatedImages;
    } else {
      // Get individual images from forms by flattening all generatedImages arrays
      images = imageForms
        .filter((form) => form.generatedImages && form.generatedImages.length > 0)
        .flatMap((form) => form.generatedImages || []);
    }
    
    if (images.length === 0) {
      toast({
        title: "No Images to Download",
        description: "Generate at least one image first",
        variant: "destructive",
      });
      return;
    }
    
    try {
      toast({
        title: "Preparing Download",
        description: "Creating ZIP file of all generated images...",
      });
      
      await downloadImagesAsZip(
        images,
        `vexis-generated-images-${new Date().toISOString().split("T")[0]}.zip`
      );
      
      toast({
        title: "Download Complete",
        description: `Downloaded ${images.length} images successfully`,
      });
    } catch (error) {
      console.error("Error downloading images:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download images. Please try again.",
        variant: "destructive",
      });
    }
  };

  const hasGeneratedImages = imageForms.some((form) => 
    form.generatedImages && form.generatedImages.length > 0
  );
  const isAnyProcessing = imageForms.some((form) => 
    form.status === "processing"
  ) || batchStatus.isProcessing;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Batch Actions</CardTitle>
        <CardDescription>
          Perform actions on all image sets
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleGenerateAll}
              disabled={isAnyProcessing}
              className="flex items-center gap-1.5"
            >
              {batchStatus.isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Generate All"
              )}
            </Button>
            
            <Button
              onClick={handleDownloadAll}
              disabled={!hasGeneratedImages || isAnyProcessing}
              variant="outline"
              className="flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              Download All
            </Button>
          </div>
        </div>
        
        {/* Progress indicator */}
        {batchStatus.total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>
                Processing: {batchStatus.completed}/{batchStatus.total}
              </span>
              <span>
                {Math.round((batchStatus.completed / batchStatus.total) * 100)}%
              </span>
            </div>
            <Progress 
              value={(batchStatus.completed / batchStatus.total) * 100} 
              className="h-2" 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
