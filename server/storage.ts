import { generatedImages, type GeneratedImage, type InsertGeneratedImage, users, type User, type InsertUser } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Image generation related methods
  createGeneratedImage(image: InsertGeneratedImage): Promise<GeneratedImage>;
  getGeneratedImages(limit?: number): Promise<GeneratedImage[]>;
  getGeneratedImageById(id: number): Promise<GeneratedImage | undefined>;
  updateGeneratedImageStatus(id: number, status: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private images: Map<number, GeneratedImage>;
  currentId: number;
  currentImageId: number;

  constructor() {
    this.users = new Map();
    this.images = new Map();
    this.currentId = 1;
    this.currentImageId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createGeneratedImage(insertImage: InsertGeneratedImage): Promise<GeneratedImage> {
    const id = this.currentImageId++;
    const now = new Date();
    
    // Ensure all required properties are properly set with correct types
    const image: GeneratedImage = {
      id,
      prompt: insertImage.prompt,
      model: insertImage.model,
      resolution: insertImage.resolution,
      style: insertImage.style,
      quality: insertImage.quality ?? null, // Handle undefined case by converting to null
      transparentBg: insertImage.transparentBg ?? null,
      imageUrl: insertImage.imageUrl,
      exampleImagesCount: insertImage.exampleImagesCount ?? null,
      createdAt: now,
      status: insertImage.status || "completed",
      jobId: insertImage.jobId ?? null,
      parameters: insertImage.parameters || {}
    };
    
    this.images.set(id, image);
    return image;
  }

  async getGeneratedImages(limit?: number): Promise<GeneratedImage[]> {
    const images = Array.from(this.images.values());
    // Sort by newest first
    images.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    if (limit && limit > 0) {
      return images.slice(0, limit);
    }
    
    return images;
  }

  async getGeneratedImageById(id: number): Promise<GeneratedImage | undefined> {
    return this.images.get(id);
  }

  async updateGeneratedImageStatus(id: number, status: string): Promise<void> {
    const image = this.images.get(id);
    if (image) {
      image.status = status;
      this.images.set(id, image);
    }
  }
}

export const storage = new MemStorage();
