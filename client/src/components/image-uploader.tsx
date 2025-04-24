import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  maxFiles?: number;
  onChange: (files: File[]) => void;
  value?: File[];
}

export function ImageUploader({
  maxFiles = 5,
  onChange,
  value = [],
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // If we already have files and new ones would exceed max, only take what we can fit
      const spaceLeft = maxFiles - value.length;
      const filesToAdd = acceptedFiles.slice(0, spaceLeft);
      
      if (filesToAdd.length === 0) return;
      
      // Create preview URLs for the new files
      const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file));
      
      // Update state
      setPreviews((prev) => [...prev, ...newPreviews]);
      onChange([...value, ...filesToAdd]);
    },
    [maxFiles, onChange, value]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
    },
    maxFiles: maxFiles - value.length,
    maxSize: 20 * 1024 * 1024, // 20MB max
    disabled: value.length >= maxFiles,
  });

  const removeFile = (index: number) => {
    const newFiles = [...value];
    newFiles.splice(index, 1);
    
    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    
    setPreviews(newPreviews);
    onChange(newFiles);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {value.map((file, index) => (
          <div 
            key={index}
            className="relative border rounded-lg overflow-hidden h-40 bg-gray-100 dark:bg-gray-800 group"
          >
            {previews[index] && (
              <img
                src={previews[index]}
                alt={`Uploaded ${index + 1}`}
                className="w-full h-full object-cover"
              />
            )}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeFile(index)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        
        {value.length < maxFiles && (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg h-40 flex flex-col items-center justify-center p-4 transition-colors cursor-pointer hover:border-primary",
              isDragActive ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <input {...getInputProps()} />
            <Image className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              {isDragActive
                ? "Drop the images here"
                : "Drag & drop or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {`${maxFiles - value.length} image${maxFiles - value.length !== 1 ? "s" : ""} remaining`}
            </p>
          </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Supported formats: PNG, JPEG, WEBP, GIF (non-animated). Max size: 20MB per image.
      </p>
    </div>
  );
}
