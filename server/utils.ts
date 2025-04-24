import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Validate request body against a zod schema
export function validateRequest<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({ message: "Validation error", errors: error });
    }
  };
}

// Handle async route handlers
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Generate a unique job ID
export function generateJobId(): string {
  return crypto.randomBytes(16).toString("hex");
}

// Save a base64 image to a temporary file
export async function saveBase64Image(base64Data: string): Promise<string> {
  try {
    // Extract the actual base64 data
    const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 image format");
    }
    
    const imageType = matches[1];
    const data = Buffer.from(matches[2], "base64");
    
    // Create a temporary folder if it doesn't exist
    const tempDir = path.resolve(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Generate a unique filename
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${imageType}`;
    const filePath = path.join(tempDir, filename);
    
    // Write the file
    fs.writeFileSync(filePath, data);
    
    return filePath;
  } catch (error) {
    console.error("Error saving base64 image:", error);
    throw error;
  }
}

// Check if an image file is valid
export async function validateImageFile(filePath: string): Promise<boolean> {
  try {
    const stats = fs.statSync(filePath);
    
    // Check if file exists and has a size
    if (!stats.isFile() || stats.size === 0) {
      return false;
    }
    
    // Check maximum file size (20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (stats.size > maxSize) {
      return false;
    }
    
    // For more advanced validation, we would need an image processing library
    // to check dimensions, format, etc. For now, we'll just check existence and size.
    
    return true;
  } catch (error) {
    console.error("Error validating image file:", error);
    return false;
  }
}

// Delete a temporary file
export async function deleteFile(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Error deleting file:", error);
  }
}
