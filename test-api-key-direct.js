
// Simple test script to check OpenAI API key from environment variables only
import { OpenAI } from 'openai';

// Initialize OpenAI API with key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testApiKey() {
  try {
    console.log("Testing OpenAI API key...");
    console.log("API Key status:", process.env.OPENAI_API_KEY ? "Present (from environment variable)" : "Missing");
    
    // Just check the models endpoint - this is a lightweight call
    const response = await openai.models.list();
    
    console.log("OpenAI API key is valid! Retrieved", response.data.length, "models");
    console.log("First few models:", response.data.slice(0, 3).map(model => model.id).join(", "));
    
    return true;
  } catch (error) {
    console.error("OpenAI API key validation failed with error:");
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
testApiKey()
  .then(success => {
    console.log("Test completed with result:", success ? "SUCCESS" : "FAILURE");
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error("Test execution error:", err);
    process.exit(1);
  });
