// Simple script to test OpenAI DALL-E API connection
import { OpenAI } from 'openai';

// Initialize OpenAI API with key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testDalleConnection() {
  try {
    console.log("Testing DALL-E API connection...");
    console.log("API Key length:", process.env.OPENAI_API_KEY?.length || 'Not found');
    console.log("API Key starts with:", process.env.OPENAI_API_KEY?.substring(0, 5) + '...' || 'Not found');
    
    // Try a very simple image generation with DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: "A simple blue square on a white background",
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid"
    });
    
    console.log("DALL-E API connection successful!");
    console.log("Response:", JSON.stringify(response, null, 2));
    
    if (response.data && response.data.length > 0) {
      console.log("Image URL:", response.data[0].url);
    }
    
    return true;
  } catch (error) {
    console.error("DALL-E API connection failed with error:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    
    if (error.response) {
      console.error("API Response status:", error.response.status);
      console.error("API Response data:", JSON.stringify(error.response.data, null, 2));
    }
    
    return false;
  }
}

// Execute the test
testDalleConnection()
  .then(success => {
    console.log("Test completed with result:", success ? "SUCCESS" : "FAILURE");
  })
  .catch(err => {
    console.error("Test execution error:", err);
  });