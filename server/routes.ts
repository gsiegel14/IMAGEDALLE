import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateImage } from "./openai";
import { validateRequest, asyncHandler, generateJobId } from "./utils";
import { generateImageSchema, batchGenerateSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const tempDir = path.resolve(process.cwd(), "temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      cb(null, tempDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Check allowed file types
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif"
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PNG, JPEG, WEBP, and non-animated GIF are allowed.") as any, false);
    }
  }
});

// Queue to manage batch processing
const queue: { jobId: string; status: string; request: any }[] = [];

export async function registerRoutes(app: Express): Promise<Server> {
  // API route prefix
  const apiRouter = "/api";

  // Get all generated images (history)
  app.get(`${apiRouter}/images`, asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const images = await storage.getGeneratedImages(limit);
    res.json(images);
  }));

  // Get a specific generated image by ID
  app.get(`${apiRouter}/images/:id`, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const image = await storage.getGeneratedImageById(id);
    
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }
    
    res.json(image);
  }));

  // Generate a single image
  app.post(
    `${apiRouter}/generate`, 
    upload.array("exampleImages", 20), // Allow up to 20 images
    // We need to validate after multer processes the form data
    asyncHandler(async (req, res) => {
      console.log("Generate request body:", req.body);
      
      try {
        // Ensure required parameters exist
        if (!req.body.prompt) {
          return res.status(400).json({ message: "Prompt is required" });
        }
        
        if (!req.body.model) {
          return res.status(400).json({ message: "Model is required" });
        }
        
        // Extract all parameters from form data
        const prompt = req.body.prompt;
        const model = req.body.model;
        const resolution = req.body.resolution || "1024x1024";
        const style = req.body.style || "vivid";
        const quality = req.body.quality || "standard";
        const transparentBg = req.body.transparentBg === "true" || req.body.transparentBg === true;
        
        // Check if files were uploaded
        const files = req.files as Express.Multer.File[];
        let exampleImages: string[] = [];
        
        if (files && files.length > 0) {
          // Create array of file paths
          exampleImages = files.map(file => file.path);
        }
        
        // Get imagesPerPrompt from request or default to 1
        const imagesPerPrompt = parseInt(req.body.imagesPerPrompt) || 1;
        
        // Set up a timeout for the image generation request
        const timeoutMs = 60000; // 60 seconds
        console.log(`Setting API request timeout: ${timeoutMs/1000}s`);
        
        // Create a promise that will reject after timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Image generation timed out after ${timeoutMs/1000} seconds`)), timeoutMs);
        });
        
        // Create the actual image generation request
        const apiRequestPromise = generateImage({
          prompt,
          model,
          resolution,
          style,
          quality,
          transparentBg,
          exampleImages,
          imagesPerPrompt
        });
        
        // Race the promises to handle timeout
        const result = await Promise.race([apiRequestPromise, timeoutPromise]) as { urls: string[] };
        
        // Save to storage - generate one record for each image URL
        const generatedImages = [];
        const jobId = generateJobId();
        
        for (const imageUrl of result.urls) {
          const generatedImage = await storage.createGeneratedImage({
            prompt,
            model,
            resolution,
            style,
            quality,
            transparentBg,
            imageUrl,
            exampleImagesCount: exampleImages.length,
            status: "completed",
            jobId,
            parameters: {
              prompt,
              model,
              resolution,
              style,
              quality,
              transparentBg,
              imagesPerPrompt
            }
          });
          
          generatedImages.push(generatedImage);
        }
        
        // Return all generated images
        res.json(generatedImages);
      } catch (error: any) {
        console.error("Error generating image:", error);
        res.status(500).json({ 
          message: "Failed to generate image",
          error: error.message
        });
      }
    })
  );

  // Batch generate multiple images
  app.post(
    `${apiRouter}/batch`, 
    validateRequest(batchGenerateSchema),
    asyncHandler(async (req, res) => {
      const { requests } = req.body;
      
      if (!requests || requests.length === 0) {
        return res.status(400).json({ message: "No image requests provided" });
      }
      
      // Create a job ID for the batch
      const jobId = generateJobId();
      
      // Add all requests to the queue
      requests.forEach(request => {
        queue.push({
          jobId,
          status: "pending",
          request
        });
      });
      
      // Start processing asynchronously
      setTimeout(() => processBatchQueue(), 0);
      
      res.json({ 
        message: "Batch job created", 
        jobId,
        totalRequests: requests.length 
      });
    })
  );

  // Get batch job status
  app.get(`${apiRouter}/batch/:jobId`, asyncHandler(async (req, res) => {
    const jobId = req.params.jobId;
    
    // Find all queue items with this job ID
    const jobItems = queue.filter(item => item.jobId === jobId);
    
    if (jobItems.length === 0) {
      // If not in queue, check the storage for completed jobs
      const images = await storage.getGeneratedImages();
      const batchImages = images.filter(img => img.jobId === jobId);
      
      if (batchImages.length === 0) {
        return res.status(404).json({ message: "Batch job not found" });
      }
      
      return res.json({
        jobId,
        status: "completed",
        totalRequests: batchImages.length,
        completedRequests: batchImages.length,
        results: batchImages
      });
    }
    
    // Calculate status
    const pending = jobItems.filter(item => item.status === "pending").length;
    const processing = jobItems.filter(item => item.status === "processing").length;
    const completed = jobItems.filter(item => item.status === "completed").length;
    const failed = jobItems.filter(item => item.status === "failed").length;
    const total = jobItems.length;
    
    // Get completed results from storage
    const images = await storage.getGeneratedImages();
    const batchImages = images.filter(img => img.jobId === jobId);
    
    res.json({
      jobId,
      status: pending + processing > 0 ? "processing" : "completed",
      totalRequests: total,
      completedRequests: completed,
      failedRequests: failed,
      pendingRequests: pending,
      processingRequests: processing,
      results: batchImages
    });
  }));

  // Process the batch queue
  async function processBatchQueue() {
    // Find the next pending item
    const nextItem = queue.find(item => item.status === "pending");
    
    if (!nextItem) {
      return; // Nothing to process
    }
    
    // Update status to processing
    nextItem.status = "processing";
    
    try {
      // Set up a timeout for batch image generation 
      const timeoutMs = 60000; // 60 seconds
      console.log(`[Batch Job ${nextItem.jobId}] Setting API request timeout: ${timeoutMs/1000}s`);
      
      // Create promises for timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Image generation timed out after ${timeoutMs/1000} seconds`)), timeoutMs);
      });
      
      const apiRequestPromise = generateImage(nextItem.request);
      
      // Race the promises to handle timeout
      const result = await Promise.race([apiRequestPromise, timeoutPromise]) as { urls: string[] };
      
      // Save to storage - generate one record for each image URL
      for (const imageUrl of result.urls) {
        await storage.createGeneratedImage({
          prompt: nextItem.request.prompt,
          model: nextItem.request.model,
          resolution: nextItem.request.resolution,
          style: nextItem.request.style,
          quality: nextItem.request.quality,
          transparentBg: nextItem.request.transparentBg,
          imageUrl,
          exampleImagesCount: nextItem.request.exampleImages?.length || 0,
          status: "completed",
          jobId: nextItem.jobId,
          parameters: nextItem.request
        });
      }
      
      // Update status to completed
      nextItem.status = "completed";
    } catch (error) {
      console.error("Error processing batch item:", error);
      nextItem.status = "failed";
    }
    
    // Process the next item
    setTimeout(() => processBatchQueue(), 100);
  }

  const httpServer = createServer(app);

  return httpServer;
}
