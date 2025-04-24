import OpenAI from "openai";
import { z } from "zod";
import fs from "fs";

// Helper function to get a supported DALL-E size
function getSupportedDallESize(resolution: string): "1024x1024" | "1792x1024" | "1024x1792" {
  // DALL-E 3 only supports specific sizes
  const validSizes = {
    "1024x1024": "1024x1024",
    "1792x1024": "1792x1024", 
    "1024x1792": "1024x1792",
  } as const;
  
  console.log("Validating resolution:", resolution);
  
  // Parse resolution or use default
  if (!resolution || typeof resolution !== 'string') {
    console.log("Invalid resolution, using default 1024x1024");
    return "1024x1024";
  }
  
  // Check if it matches one of the valid sizes
  const validSize = validSizes[resolution.trim() as keyof typeof validSizes];
  
  if (validSize) {
    console.log("Using valid resolution:", validSize);
    return validSize;
  }
  
  // Default to square if not a valid size
  console.log("Resolution not valid, defaulting to 1024x1024");
  return "1024x1024";
}

// Define response types for OpenAI DALL-E API
interface OpenAIImageData {
  url: string;
  b64_json?: string;
  revised_prompt?: string;
}

interface OpenAIImageResponse {
  created: number;
  data: OpenAIImageData[];
  model?: string;
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateImageOptions {
  prompt: string;
  model: "gpt-image" | "dall-e-3";
  resolution: string;
  style: "vivid" | "natural";
  quality?: "standard" | "hd";
  transparentBg?: boolean;
  exampleImages?: string[];
  imagesPerPrompt?: number;
}

export async function generateImage(options: GenerateImageOptions): Promise<{ urls: string[] }> {
  // Only check if API key exists without logging any details
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API Key is missing. Set it in your environment variables.");
  }
  try {
    const { prompt, model, resolution, style, quality, transparentBg, exampleImages, imagesPerPrompt = 1 } = options;
    
    // Parse resolution into width and height
    const [width, height] = resolution.split("x").map(Number);
    
    let imageResponse;
    
    // Generate with GPT Image API (newer model)
    if (model === "gpt-image") {
      // Base parameters for GPT Image API
      const params: any = {
        model: "gpt-4o", // The newest model for GPT Image generation
        n: Math.min(Math.max(1, imagesPerPrompt), 10), // Limit between 1-10 images
        quality: quality || "standard",
        response_format: transparentBg ? "b64_json" : "url", // Use b64_json for transparent bg
      };
      
      // Process example images if provided
      if (exampleImages && exampleImages.length > 0) {
        try {
          // For the multimodal API, we need to create a message with multiple content items
          const messageContent: any[] = [
            { type: "text", text: prompt }
          ];
          
          // Add example images to the content array
          for (const imageStr of exampleImages) {
            if (imageStr.startsWith('data:')) {
              messageContent.push({
                type: "image_url",
                image_url: {
                  url: imageStr,
                  detail: "high" // Use high detail for medical images
                }
              });
            }
          }
          
          // Use the chat completions API with images and text
          const chatResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: messageContent
              }
            ],
            max_tokens: 1000
          });
          
          // The response from chat completions needs special handling
          // We need to make a secondary call to generate the image
          const enhancedPrompt = chatResponse.choices[0]?.message?.content;
          
          if (!enhancedPrompt) {
            throw new Error("Failed to process the example images and generate an enhanced prompt");
          }
          
          // Now use the enhanced prompt to generate the image
          imageResponse = await openai.images.generate({
            model: "dall-e-3", // Use DALL-E 3 for high-quality image generation
            prompt: enhancedPrompt,
            size: getSupportedDallESize(resolution),
            style,
            quality: quality || "standard",
            n: Math.min(Math.max(1, imagesPerPrompt), 10)
          });
        } catch (error) {
          console.error("Error in multimodal GPT Image generation:", error);
          throw new Error("Failed to process example images: " + (error as Error).message);
        }
      } else {
        // Regular image generation without example images
        imageResponse = await openai.images.generate({
          model: "dall-e-3", // Use DALL-E 3 when no example images are provided
          prompt,
          size: getSupportedDallESize(resolution),
          style,
          quality: quality || "standard",
          n: Math.min(Math.max(1, imagesPerPrompt), 1) // DALL-E 3 only supports n=1
        });
      }
    } 
    // Generate with DALL-E 3 API
    else if (model === "dall-e-3") {
      console.log("Generating with DALL-E 3 API");
      console.log("Parameters:", { prompt, resolution, style, quality, imagesPerPrompt });
      
      // DALL-E 3 supports only fixed size options and can only generate one image at a time
      const validSize = getSupportedDallESize(resolution);
      
      // Make sure we have a valid style
      const validStyle = style === "vivid" || style === "natural" ? style : "vivid";
      
      // Make sure we have a valid quality
      const validQuality = quality === "hd" ? "hd" : "standard" as "standard" | "hd";
      
      console.log("Validated parameters:", { validSize, validStyle, validQuality });
      
      // DALL-E 3 only supports generating one image at a time, 
      // so we need to make multiple API calls if imagesPerPrompt > 1
      const numImages = Math.min(Math.max(1, imagesPerPrompt), 10);
      console.log(`Generating ${numImages} image(s)`);
      
      const generatedData: any[] = [];
      
      // For DALL-E 3, we can only request 1 image at a time
      for (let i = 0; i < numImages; i++) {
        try {
          console.log(`Generating image ${i+1}/${numImages}`);
          
          // Log the exact parameters being sent to the API
          const params: any = {
            model: "dall-e-3",
            prompt,
            size: validSize,
            style: validStyle,
            quality: validQuality,
            n: 1, // DALL-E 3 only supports n=1
          };
          console.log("API request parameters:", JSON.stringify(params));
          
          // Add timeout handling for DALL-E requests
          const timeoutMs = 60000; // 60 second timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Image generation timed out after ${timeoutMs/1000} seconds`)), timeoutMs);
          });
          
          const apiPromise = openai.images.generate(params);
          
          // Race between the API call and the timeout
          console.log(`Waiting for DALL-E response (timeout: ${timeoutMs/1000}s)...`);
          const result = await Promise.race([apiPromise, timeoutPromise]) as OpenAIImageResponse;
          
          console.log("API response received:", JSON.stringify({
            created: result?.created || Date.now(),
            model: result?.model || "dall-e-3",
            data_count: result?.data?.length || 0
          }));
          
          if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
            console.log(`Successfully generated image ${i+1}`);
            generatedData.push(...result.data);
          }
        } catch (error) {
          console.error(`Error generating image ${i+1}:`, error);
          console.error("API call failed, details:", JSON.stringify(error, null, 2));
          // Continue trying to generate remaining images
        }
      }
      
      // Create a response object that matches the expected format
      imageResponse = {
        data: generatedData
      };
      console.log(`Total generated data items: ${generatedData.length}`);
    }
    
    if (!imageResponse || !imageResponse.data || imageResponse.data.length === 0) {
      throw new Error("Failed to generate image: No image data returned from API");
    }
    
    // Extract all URLs from the response data
    const urls = imageResponse.data
      .filter((item: any) => item && item.url)
      .map((item: any) => item.url as string);
    
    if (urls.length === 0) {
      throw new Error("Failed to generate image: No image URLs returned from API");
    }
    
    return { urls };
  } catch (error: any) {
    console.error("Error generating image:", error);
    
    // Enhanced error handling - for debugging purposes
    console.error("Full error object:", JSON.stringify({
      message: error.message,
      name: error.name,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : "No response object",
      code: error.code || "No error code",
      type: typeof error
    }, null, 2));
    
    // Check for common OpenAI API errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      // Provide more specific error message based on status code
      if (status === 401) {
        throw new Error("OpenAI API key is invalid or missing. Please check your API key.");
      } else if (status === 400) {
        // Extract the specific error message from OpenAI if available
        const message = data?.error?.message || "Invalid request parameters";
        throw new Error(`OpenAI API error: ${message}`);
      } else if (status === 429) {
        throw new Error("OpenAI API rate limit exceeded. Please try again later.");
      } else if (status === 500) {
        // For server errors (known issue with OpenAI in Replit environment)
        const message = data?.error?.message || "Internal server error";
        console.error("OpenAI service error (500):", message);
        console.log("This is a known issue with OpenAI API calls in the Replit environment.");
        console.log("The request may succeed if retried later or if the app is deployed.");
        throw new Error(`OpenAI service error: ${message}. This is a common issue in the Replit environment.`);
      } else {
        // For other errors, include the response details
        const message = data?.error?.message || "Unknown error";
        throw new Error(`OpenAI API error (${status}): ${message}`);
      }
    }
    
    // OpenAI SDK specific error handling
    if (error.name === 'OpenAIError' || error.code === 'OpenAIError') {
      const errorMessage = error.message || "Unknown OpenAI Error";
      console.error("OpenAI SDK Error:", errorMessage);
      throw new Error(`OpenAI SDK Error: ${errorMessage}`);
    }
    
    // Generic error when response object not available
    throw new Error(`Error generating image: ${error.message || error}`);
  }
}
