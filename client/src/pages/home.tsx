import { useState, useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { FormGenerator, GeneratorParams } from "@/components/form-generator";
import { ImageForm } from "@/components/image-form";
import { BatchActions } from "@/components/batch-actions";
import { Button } from "@/components/ui/button";
import { GeneratedImage } from "@/lib/openai";
import { CloudUpload, FilePen, UploadIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [forms, setForms] = useState<Array<{
    params: Partial<GeneratorParams>;
    status: string;
    generatedImages?: GeneratedImage[];
  }>>([]);
  
  const [showForms, setShowForms] = useState(false);
  const { toast } = useToast();

  const handleGenerate = (params: GeneratorParams) => {
    // Ensure imageCount is a valid number between 1 and 20
    const imageCount = isNaN(params.imageCount) ? 5 : 
                      Math.max(1, Math.min(20, params.imageCount));
    
    const newForms = Array(imageCount)
      .fill(null)
      .map(() => ({
        params: { ...params },
        status: "ready"
      }));
    
    setForms(newForms);
    setShowForms(true);
    
    toast({
      title: "Forms Created",
      description: `${imageCount} image forms have been created`,
    });
  };

  const handleStatusChange = (index: number, status: string) => {
    setForms((prevForms) => {
      const newForms = [...prevForms];
      newForms[index] = { ...newForms[index], status };
      return newForms;
    });
  };

  const handleImageGenerated = (index: number, image: GeneratedImage) => {
    setForms((prevForms) => {
      const newForms = [...prevForms];
      const currentImages = newForms[index]?.generatedImages || [];
      
      // Check if we already have this image (avoid duplicates)
      const imageExists = currentImages.some(img => img.id === image.id);
      
      newForms[index] = { 
        ...newForms[index], 
        generatedImages: imageExists ? currentImages : [...currentImages, image],
        status: "completed"
      };
      return newForms;
    });
  };

  const handleBatchStart = () => {
    // Set all forms to processing
    setForms((prevForms) => 
      prevForms.map(form => {
        // Check if the form has valid parameters
        if (form.params) {
          const prompt = (form.params as any).prompt;
          if (typeof prompt === 'string' && prompt.trim()) {
            return { ...form, status: "processing" };
          }
        }
        return form;
      })
    );
  };

  const handleBatchComplete = () => {
    // Get updated images
    fetch("/api/images")
      .then(res => res.json())
      .then(images => {
        // Update forms with generated images
        if (images && images.length) {
          setForms(prevForms => {
            return prevForms.map((form, index) => {
              // Try to find matching images by prompt
              const matchingImages = images.filter((img: GeneratedImage) => {
                const formPrompt = form.params ? ((form.params as any).prompt || '') : '';
                return img.prompt === formPrompt && img.status === "completed";
              });

              if (matchingImages.length > 0) {
                return {
                  ...form,
                  status: "completed",
                  generatedImages: matchingImages
                };
              }
              
              return form;
            });
          });
        }
      })
      .catch(err => {
        console.error("Error fetching images:", err);
      });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <div className="container py-8 space-y-8">
          <FormGenerator onGenerate={handleGenerate} />
          
          {showForms ? (
            <>
              <div className="grid grid-cols-1 gap-6">
                {forms.map((form, index) => (
                  <ImageForm
                    key={index}
                    index={index}
                    initialParams={form.params}
                    onStatusChange={handleStatusChange}
                    onImageGenerated={handleImageGenerated}
                  />
                ))}
              </div>
              
              {forms.length > 0 && (
                <BatchActions 
                  imageForms={forms}
                  onBatchStart={handleBatchStart}
                  onBatchComplete={handleBatchComplete}
                />
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                <CloudUpload className="h-10 w-10 text-muted-foreground mb-4" />
                
                <h3 className="mt-2 text-lg font-semibold">
                  No image forms created
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Set the number of images and configure parameters above to get started.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
