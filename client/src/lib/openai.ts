import axios from "axios";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export interface GenerationParams {
  prompt: string;
  model: "gpt-image" | "dall-e-3";
  resolution: string;
  style: "vivid" | "natural";
  quality?: "standard" | "hd";
  transparentBg?: boolean;
  exampleImages?: File[];
  imagesPerPrompt?: number;
}

export interface GeneratedImage {
  id: number;
  prompt: string;
  model: string;
  resolution: string;
  style: string;
  quality?: string;
  transparentBg?: boolean;
  imageUrl: string;
  exampleImagesCount: number;
  createdAt: Date;
  jobId?: string;
  status: string;
  parameters?: Record<string, any>;
}

export interface BatchJobStatus {
  jobId: string;
  status: string;
  totalRequests: number;
  completedRequests: number;
  failedRequests?: number;
  pendingRequests?: number;
  processingRequests?: number;
  results: GeneratedImage[];
}

// Retry with exponential backoff utility
async function retryWithBackoff<T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3, 
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
    try {
      // Attempt the operation
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry for certain errors
      if (
        // Don't retry client errors (except rate limiting)
        (error.response && error.response.status < 500 && error.response.status !== 429) ||
        // Don't retry for content policy violations
        (error.response?.data?.error && error.response.data.error.includes("content policy"))
      ) {
        throw error;
      }
      
      // Calculate exponential backoff delay with jitter
      const delay = baseDelay * Math.pow(2, retryCount) + Math.random() * 1000;
      console.log(`Attempt ${retryCount + 1} failed, retrying in ${Math.round(delay / 1000)}s...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we've exhausted all retries, throw the last error
  throw lastError;
}

// Generate a single image using the API
export async function generateImage(params: GenerationParams): Promise<GeneratedImage> {
  // Prepare the form data outside the retry function to avoid recreating it on each attempt
  const formData = new FormData();
  
  // Add all params to form data
  formData.append("prompt", params.prompt);
  formData.append("model", params.model);
  formData.append("resolution", params.resolution);
  formData.append("style", params.style);
  
  if (params.quality) {
    formData.append("quality", params.quality);
  }
  
  if (params.transparentBg !== undefined) {
    formData.append("transparentBg", String(params.transparentBg));
  }
  
  // Add example images if provided
  if (params.exampleImages && params.exampleImages.length > 0) {
    params.exampleImages.forEach((file, index) => {
      formData.append("exampleImages", file);
    });
  }
  
  // Add imagesPerPrompt if provided
  if (params.imagesPerPrompt) {
    formData.append("imagesPerPrompt", String(params.imagesPerPrompt));
  }
  
  try {
    // Use the retry mechanism for the API call
    return await retryWithBackoff(async () => {
      console.log(`Attempting image generation with model: ${params.model}`);
      
      // Make the API request
      const response = await axios.post("/api/generate", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 90000, // 90-second timeout
      });
      
      console.log(`Generation successful: ${response.status}`);
      return response.data;
    }, 3); // Retry up to 3 times
  } catch (error: any) {
    console.error("All image generation attempts failed:", error);
    
    // Enhanced error handling with user-friendly messages
    if (error.response) {
      // Server responded with an error status
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 500) {
        // Handle server errors with more detailed messages
        const serverMsg = data.error || "Internal server error";
        
        if (serverMsg.includes("timed out")) {
          throw new Error("The OpenAI API request timed out after multiple attempts. The service may be experiencing high load.");
        } else if (serverMsg.includes("API key")) {
          throw new Error("OpenAI API authentication failed. Please check the API key configuration.");
        } else if (serverMsg.includes("content policy")) {
          throw new Error("Your prompt may violate OpenAI's content policies. Please modify your request.");
        } else {
          // For OpenAI server errors (which appear frequently in Replit environment)
          throw new Error("The image generation service is temporarily unavailable. This is a common issue in the Replit environment when connecting to OpenAI. Please try deploying the application or trying again later.");
        }
      } else if (status === 401 || status === 403) {
        throw new Error("API authentication failed. Please check your API key.");
      } else if (status === 429) {
        throw new Error("API rate limit exceeded. Please wait a moment and try again.");
      } else {
        throw new Error(`Request failed: ${data.message || "Unknown error"}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      // Request timeout
      throw new Error("The request timed out after multiple attempts. The OpenAI API may be experiencing high load or connectivity issues.");
    } else if (error.request) {
      // No response received from server
      throw new Error("No response received from server after multiple attempts. Please check your network connection.");
    } else {
      // Something happened in setting up the request
      throw new Error(`Error: ${error.message || "An unknown error occurred"}`);
    }
  }
}

// Generate multiple images in a batch
export async function batchGenerateImages(requests: GenerationParams[]): Promise<{ jobId: string; totalRequests: number }> {
  // For simplicity, we'll submit without example images in batch mode
  // A more complete implementation would handle file uploads in batch
  const batchRequests = requests.map(req => ({
    prompt: req.prompt,
    model: req.model,
    resolution: req.resolution,
    style: req.style,
    quality: req.quality,
    transparentBg: req.transparentBg,
    imagesPerPrompt: req.imagesPerPrompt || 1
  }));
  
  try {
    // Use the retry mechanism for the batch API call
    return await retryWithBackoff(async () => {
      console.log(`Attempting batch job creation with ${batchRequests.length} requests`);
      
      const response = await axios.post("/api/batch", {
        requests: batchRequests
      }, {
        timeout: 90000 // 90-second timeout
      });
      
      console.log(`Batch job created successfully: ${response.data.jobId}`);
      
      return {
        jobId: response.data.jobId,
        totalRequests: response.data.totalRequests
      };
    }, 3); // Retry up to 3 times
  } catch (error: any) {
    console.error("All batch job creation attempts failed:", error);
    
    // Enhanced error handling for batch requests
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 500) {
        throw new Error("Server error while creating batch job. The image generation service may be temporarily unavailable. Please try again later or deploy the application.");
      } else {
        throw new Error(`Batch job creation failed: ${data.message || "Unknown error"}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error("Batch job request timed out after multiple attempts. Please try again with fewer images.");
    } else {
      throw new Error(`Error: ${error.message || "An unknown error occurred while creating the batch job"}`);
    }
  }
}

// Get the status of a batch job
export async function getBatchJobStatus(jobId: string): Promise<BatchJobStatus> {
  try {
    const response = await axios.get(`/api/batch/${jobId}`);
    return response.data;
  } catch (error) {
    console.error("Error getting batch job status:", error);
    throw error;
  }
}

// Get all generated images (history)
export async function getGeneratedImages(limit?: number): Promise<GeneratedImage[]> {
  try {
    const url = limit ? `/api/images?limit=${limit}` : "/api/images";
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error getting generated images:", error);
    throw error;
  }
}

// Get a specific generated image by ID
export async function getGeneratedImageById(id: number): Promise<GeneratedImage> {
  try {
    const response = await axios.get(`/api/images/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error getting generated image:", error);
    throw error;
  }
}

// Download an array of images as a ZIP file
export async function downloadImagesAsZip(images: GeneratedImage[], zipName: string = "generated-images.zip"): Promise<void> {
  try {
    const zip = new JSZip();
    const imageFolder = zip.folder("images");
    
    if (!imageFolder) {
      throw new Error("Failed to create images folder in ZIP");
    }
    
    // Download each image and add to the ZIP
    const downloadPromises = images.map(async (image, index) => {
      try {
        // Fetch the image
        const response = await fetch(image.imageUrl);
        const blob = await response.blob();
        
        // Add to ZIP with a descriptive filename
        const extension = image.transparentBg ? "png" : "jpg";
        const cleanPrompt = image.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const filename = `${index + 1}_${cleanPrompt}.${extension}`;
        
        imageFolder.file(filename, blob);
        
        // Create a metadata file with image details
        const metadata = {
          prompt: image.prompt,
          model: image.model,
          resolution: image.resolution,
          style: image.style,
          quality: image.quality,
          transparentBg: image.transparentBg,
          createdAt: image.createdAt
        };
        
        imageFolder.file(`${index + 1}_metadata.json`, JSON.stringify(metadata, null, 2));
        
        return true;
      } catch (err) {
        console.error(`Error downloading image ${index}:`, err);
        return false;
      }
    });
    
    // Wait for all downloads to complete
    await Promise.all(downloadPromises);
    
    // Generate and save the ZIP file
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, zipName);
  } catch (error) {
    console.error("Error creating ZIP file:", error);
    throw error;
  }
}
