// Simplified DALL-E 3 test with a small prompt and timeout
import { OpenAI } from 'openai';

// Initialize OpenAI API with key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Set a timeout limit for the test
const TIMEOUT_MS = 30000; // 30 seconds

async function testDalleSimple() {
  try {
    console.log("Testing simple DALL-E 3 image generation...");
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out after 30 seconds')), TIMEOUT_MS);
    });
    
    // Create the actual API call promise
    const apiPromise = openai.images.generate({
      model: "dall-e-3",
      prompt: "Simple blue dot on white background. Minimalist.",
      size: "1024x1024",
      quality: "standard",
      style: "vivid",
      n: 1,
    });
    
    // Race the promises to handle timeout
    const result = await Promise.race([apiPromise, timeoutPromise]);
    
    console.log("DALL-E 3 image generation successful!");
    console.log("Response data:", JSON.stringify({
      created: result.created,
      data_length: result.data.length
    }, null, 2));
    
    if (result.data && result.data.length > 0) {
      // Only show first few chars of URL for privacy
      const url = result.data[0].url;
      console.log("Image URL:", url.substring(0, 30) + "...");
    }
    
    return true;
  } catch (error) {
    console.error("DALL-E 3 image generation failed with error:");
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
testDalleSimple()
  .then(success => {
    console.log("Test completed with result:", success ? "SUCCESS" : "FAILURE");
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error("Test execution error:", err);
    process.exit(1);
  });