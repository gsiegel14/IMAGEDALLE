import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Model for generated images
export const generatedImages = pgTable("generated_images", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  model: text("model").notNull(),
  resolution: text("resolution").notNull(),
  style: text("style").notNull(),
  quality: text("quality"),
  transparentBg: boolean("transparent_bg").default(false),
  imageUrl: text("image_url").notNull(), 
  exampleImagesCount: integer("example_images_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  jobId: text("job_id"),
  status: text("status").default("completed").notNull(),
  parameters: jsonb("parameters")
});

export const insertGeneratedImageSchema = createInsertSchema(generatedImages).omit({
  id: true,
  createdAt: true
});

export type InsertGeneratedImage = z.infer<typeof insertGeneratedImageSchema>;
export type GeneratedImage = typeof generatedImages.$inferSelect;

// Generation request schema for API
export const generateImageSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  model: z.enum(["gpt-image", "dall-e-3"]),
  resolution: z.string(),
  style: z.enum(["vivid", "natural"]),
  quality: z.enum(["standard", "hd"]).optional(),
  transparentBg: z.boolean().optional(),
  exampleImages: z.array(z.any()).optional(),
  imagesPerPrompt: z.number().min(1).max(10).optional().default(1)
});

export type GenerateImageRequest = z.infer<typeof generateImageSchema>;

// Batch generation schema for API
export const batchGenerateSchema = z.object({
  requests: z.array(generateImageSchema)
});

export type BatchGenerateRequest = z.infer<typeof batchGenerateSchema>;
