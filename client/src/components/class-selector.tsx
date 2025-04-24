import { useState } from "react";
import { ultrasoundClasses } from "@/lib/ultrasound-classes";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface ClassSelectorProps {
  onSelectClass: (description: string) => void;
}

export function ClassSelector({ onSelectClass }: ClassSelectorProps) {
  const [selectedClass, setSelectedClass] = useState<string>("");

  const handleLoadClass = () => {
    if (!selectedClass) return;
    
    const classDescription = ultrasoundClasses[selectedClass].description;
    onSelectClass(classDescription);
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          Ultrasound Class
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-md">
                <p>Select from predefined vascular ultrasound classes to use as prompts.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </label>
      </div>
      
      <div className="flex gap-2">
        <Select
          value={selectedClass}
          onValueChange={setSelectedClass}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a class..." />
          </SelectTrigger>
          <SelectContent>
            {Object.values(ultrasoundClasses).map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button 
          onClick={handleLoadClass} 
          disabled={!selectedClass}
        >
          Load Class
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Select a class to auto-populate the description in your prompt fields
      </p>
    </div>
  );
}
