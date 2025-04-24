import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsItem, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClassSelector } from "@/components/class-selector";
import { toast } from "@/hooks/use-toast";
import { InfoIcon, ImageIcon } from "lucide-react";

export interface GeneratorParams {
  imageCount: number;
  model: "gpt-image" | "dall-e-3";
  resolution: string;
  style: "vivid" | "natural";
  quality: "standard" | "hd";
  transparentBg: boolean;
  imagesPerPrompt: number;
}

interface FormGeneratorProps {
  onGenerate: (params: GeneratorParams) => void;
}

export function FormGenerator({ onGenerate }: FormGeneratorProps) {
  const [params, setParams] = useState<GeneratorParams>({
    imageCount: 5,
    model: "gpt-image",
    resolution: "1024x1024",
    style: "vivid",
    quality: "standard",
    transparentBg: false,
    imagesPerPrompt: 1,
  });
  
  const [classPrompt, setClassPrompt] = useState<string>("");

  const handleChangeParam = <K extends keyof GeneratorParams>(key: K, value: GeneratorParams[K]) => {
    // Handle special cases for number fields
    if (key === "imageCount" || key === "imagesPerPrompt") {
      // Ensure we have a valid number
      const numValue = typeof value === 'string' ? parseInt(value as string) : (value as number);
      
      if (isNaN(numValue)) {
        // Set defaults if invalid
        const defaultValue = key === "imageCount" ? 5 : 1;
        setParams((prev) => ({ ...prev, [key]: defaultValue }));
        return;
      }
      
      // Apply min/max constraints
      const min = 1;
      const max = key === "imageCount" ? 20 : 10;
      const constrainedValue = Math.max(min, Math.min(max, numValue));
      
      setParams((prev) => ({ ...prev, [key]: constrainedValue }));
    } else {
      // Regular case for non-number fields
      setParams((prev) => ({ ...prev, [key]: value }));
    }
    
    // Adjust resolution for DALL-E 3 if switching models
    if (key === "model" && value === "dall-e-3" && params.resolution !== "1024x1024") {
      setParams((prev) => ({ ...prev, resolution: "1024x1024" }));
    }
  };

  const handleClassSelect = (description: string) => {
    setClassPrompt(description);
    toast({
      title: "Class Description Loaded",
      description: "The class description will be loaded into all prompt fields.",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (params.imageCount < 1 || params.imageCount > 20) {
      toast({
        title: "Invalid Number of Images",
        description: "Please enter a number between 1 and 20",
        variant: "destructive",
      });
      return;
    }
    
    onGenerate({
      ...params,
      // For DALL-E 3, ensure we don't pass transparentBg
      transparentBg: params.model === "gpt-image" ? params.transparentBg : false,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Generation Setup</CardTitle>
          <CardDescription>
            Configure your image generation parameters and ultrasound class descriptions
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Number of image forms */}
            <div className="space-y-2">
              <Label htmlFor="imageCount">Number of Image Forms</Label>
              <Input 
                id="imageCount"
                type="number"
                min={1}
                max={20}
                value={params.imageCount}
                onChange={(e) => handleChangeParam("imageCount", parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Number of separate image generation forms (1-20)
              </p>
            </div>
            
            {/* Images per prompt */}
            <div className="space-y-2">
              <Label htmlFor="imagesPerPrompt">Images Per Prompt</Label>
              <Input 
                id="imagesPerPrompt"
                type="number"
                min={1}
                max={10}
                value={params.imagesPerPrompt}
                onChange={(e) => handleChangeParam("imagesPerPrompt", parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Number of images to generate per form (1-10)
              </p>
            </div>
            
            {/* Model selection */}
            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <Select 
                value={params.model} 
                onValueChange={(value) => handleChangeParam("model", value as "gpt-image" | "dall-e-3")}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-image">GPT Image (Highest quality)</SelectItem>
                  <SelectItem value="dall-e-3">DALL-E 3 (Larger resolutions)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {params.model === "gpt-image" 
                  ? "Best for detailed instruction following" 
                  : "Best for text-forward imagery"}
              </p>
            </div>
            
            {/* Resolution */}
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution</Label>
              <Select 
                value={params.resolution} 
                onValueChange={(value) => handleChangeParam("resolution", value)}
              >
                <SelectTrigger id="resolution">
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">1024×1024</SelectItem>
                  {params.model === "dall-e-3" && (
                    <>
                      <SelectItem value="1792x1024">1792×1024</SelectItem>
                      <SelectItem value="1024x1792">1024×1792</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Style */}
            <div className="space-y-2">
              <Label htmlFor="style">Style</Label>
              <Select 
                value={params.style} 
                onValueChange={(value) => handleChangeParam("style", value as "vivid" | "natural")}
              >
                <SelectTrigger id="style">
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vivid">Vivid</SelectItem>
                  <SelectItem value="natural">Natural</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {params.style === "vivid" 
                  ? "More hyper-real and dramatic" 
                  : "More natural and less stylized"}
              </p>
            </div>
            
            {/* Quality (for DALL-E 3) */}
            {params.model === "dall-e-3" && (
              <div className="space-y-2">
                <Label htmlFor="quality">Quality</Label>
                <Select 
                  value={params.quality} 
                  onValueChange={(value) => handleChangeParam("quality", value as "standard" | "hd")}
                >
                  <SelectTrigger id="quality">
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="hd">HD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Transparent background (for GPT Image) */}
            {params.model === "gpt-image" && (
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="transparentBg"
                  checked={params.transparentBg}
                  onCheckedChange={(checked) => handleChangeParam("transparentBg", checked)}
                />
                <Label htmlFor="transparentBg">Transparent Background</Label>
              </div>
            )}
          </div>
          
          {/* Class selector */}
          <div className="border-t pt-6">
            <ClassSelector onSelectClass={handleClassSelect} />

            {classPrompt && (
              <div className="mt-4 p-3 bg-muted/50 rounded-md text-sm">
                <div className="flex items-start gap-2">
                  <InfoIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground mb-1">Selected Description</p>
                    <p className="text-muted-foreground">{classPrompt}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" className="w-full sm:w-auto">
              Generate Image Forms
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
