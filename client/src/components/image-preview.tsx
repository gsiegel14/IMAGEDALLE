import { useState, useEffect } from "react";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ImagePreviewProps {
  imageUrl?: string;
  alt?: string;
  isLoading?: boolean;
  onDownload?: () => void;
}

export function ImagePreview({
  imageUrl,
  alt = "Generated image",
  isLoading = false,
  onDownload,
}: ImagePreviewProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [imageUrl]);
  
  if (!imageUrl && !isLoading) {
    return null;
  }
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-1 relative">
        {isLoading && (
          <div className="flex items-center justify-center h-64 bg-muted/50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {imageUrl && !error && (
          <>
            <img
              src={imageUrl}
              alt={alt}
              className={`w-full h-auto object-contain max-h-96 transition-opacity duration-300 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
            />
            
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            
            {loaded && onDownload && (
              <div className="absolute top-2 right-2">
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                  onClick={onDownload}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
        
        {error && (
          <div className="flex flex-col items-center justify-center h-64 bg-muted/50 text-muted-foreground">
            <span className="text-sm">Failed to load image</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
