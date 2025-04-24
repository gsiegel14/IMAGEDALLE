import { useState, useEffect } from "react";
import { Link } from "wouter";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getGeneratedImages, GeneratedImage, downloadImagesAsZip } from "@/lib/openai";
import { Download, Clock, FileImage, ImageIcon, ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { saveAs } from "file-saver";
import { Badge } from "@/components/ui/badge";
import { ImagePreview } from "@/components/image-preview";
import { useToast } from "@/hooks/use-toast";

export default function History() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        const result = await getGeneratedImages();
        setImages(result);
        setError(null);
      } catch (err) {
        console.error("Error fetching images:", err);
        setError("Failed to load image history. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchImages();
  }, []);

  const handleDownloadImage = (image: GeneratedImage) => {
    if (!image.imageUrl) return;
    
    // Extract file extension from URL or use default
    const extension = image.transparentBg ? "png" : "jpg";
    const filename = `generated-image-${image.id}.${extension}`;
    
    // Fetch the image and save it
    fetch(image.imageUrl)
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

  const handleDownloadAll = async () => {
    if (images.length === 0) {
      toast({
        title: "No Images to Download",
        description: "There are no images in your history to download.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      toast({
        title: "Preparing Download",
        description: "Creating ZIP file of all history images...",
      });
      
      await downloadImagesAsZip(
        images,
        `vexis-history-${new Date().toISOString().split("T")[0]}.zip`
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

  const filteredImages = () => {
    if (selectedTab === "all") return images;
    return images.filter(img => img.model === selectedTab);
  };

  const formatDate = (dateString: Date | string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (e) {
      return "Unknown date";
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <div className="container py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Generation History</h1>
              <p className="text-muted-foreground">
                View and download your previously generated images
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Generator
                </Button>
              </Link>
              
              <Button onClick={handleDownloadAll} disabled={loading || images.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Download All
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Images</TabsTrigger>
              <TabsTrigger value="gpt-image">GPT Image</TabsTrigger>
              <TabsTrigger value="dall-e-3">DALL·E 3</TabsTrigger>
            </TabsList>
            
            <TabsContent value={selectedTab} className="mt-0">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="rounded-lg border border-destructive/20 p-8 text-center text-destructive">
                  {error}
                </div>
              ) : filteredImages().length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                    <FileImage className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-semibold">No images found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTab === "all" 
                        ? "You haven't generated any images yet."
                        : `No ${selectedTab} images in your history.`}
                    </p>
                    <Link href="/">
                      <Button className="mt-4">
                        Generate Some Images
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredImages().map((image) => (
                    <Card key={image.id} className="overflow-hidden flex flex-col">
                      <div className="aspect-square relative bg-muted">
                        <ImagePreview
                          imageUrl={image.imageUrl}
                          alt={`Generated image ${image.id}`}
                          onDownload={() => handleDownloadImage(image)}
                        />
                      </div>
                      
                      <CardContent className="p-4 flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="font-normal">
                            {image.model}
                          </Badge>
                          <div className="text-xs text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(image.createdAt)}
                          </div>
                        </div>
                        
                        <p className="text-sm line-clamp-3 mb-4">
                          {image.prompt}
                        </p>
                        
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex justify-between">
                            <span>Resolution:</span>
                            <span>{image.resolution}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Style:</span>
                            <span className="capitalize">{image.style}</span>
                          </div>
                          {image.quality && (
                            <div className="flex justify-between">
                              <span>Quality:</span>
                              <span className="capitalize">{image.quality}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      
                      <CardFooter className="p-4 pt-0">
                        <Button 
                          variant="secondary" 
                          className="w-full"
                          onClick={() => handleDownloadImage(image)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Image
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
