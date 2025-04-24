// Direct test for DALL-E 3 API
import { OpenAI } from 'openai';

// Directly use the API key provided by the user
const API_KEY = process.env.OPENAI_API_KEY || 'your-api-key-here';

// Initialize OpenAI API with provided key
const openai = new OpenAI({
  apiKey: API_KEY,
});

async function testDalleGeneration() {
  console.log("Starting DALL-E 3 image generation test...");
  
  try {
    // Set a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out after 30 seconds")), 30000);
    });
    
    // Create the actual image generation promise
    const dallePromise = openai.images.generate({
      model: "dall-e-3",
      prompt: "A simple ultrasound image showing a normal liver, medical illustration style, labeled",
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid"
    });
    
    // Use Promise.race to implement the timeout
    console.log("Sending request to DALL-E 3 API...");
    const response = await Promise.race([dallePromise, timeoutPromise]);
    
    console.log("DALL-E 3 API response received!");
    console.log("Response data:", {
      created: response.created,
      data_count: response.data.length,
      model: response.model
    });
    
    if (response.data && response.data.length > 0) {
      // Get just the start of the URL for privacy
      const urlStart = response.data[0].url.substring(0, 30) + "...";
      console.log("Image URL (truncated):", urlStart);
      console.log("Revised prompt:", response.data[0].revised_prompt?.substring(0, 50) + "...");
    }
    
    return true;
  } catch (error) {
    console.error("DALL-E 3 API test failed with error:");
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
console.time("DALL-E 3 test");
testDalleGeneration()
  .then(success => {
    console.timeEnd("DALL-E 3 test");
    console.log("Test completed with result:", success ? "SUCCESS" : "FAILURE");
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.timeEnd("DALL-E 3 test");
    console.error("Test execution error:", err);
    process.exit(1);
  });