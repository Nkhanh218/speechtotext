# n8n Setup Guide Without API Access

This guide provides step-by-step instructions for setting up your n8n workflows when you don't have access to the n8n API.

## Main Workflow Setup

### Step 1: Configure the Main Webhook

1. In your main workflow, make sure your Webhook node is configured correctly:
   - Path: `/webhook-test/audio-upload`
   - Method: POST
   - Authentication: None
   - Response Mode: "Using Respond to Webhook Node"

2. Click "Save" and then "Test Workflow" to activate the webhook

### Step 2: Add a Function to Store the Result

After your speech-to-text processing is complete, add a Function node:

1. Add a **Function** node
2. Name it "Store Result"
3. Use this code:

```javascript
// Get the transcript data
const transcriptData = $input.first().json;

// Create a global variable if it doesn't exist
if (!$workflow.variables.hasOwnProperty('storedResults')) {
  $workflow.variables.storedResults = {};
}

// Store the result with a timestamp
$workflow.variables.storedResults.latestResult = {
  data: transcriptData,
  timestamp: new Date().toISOString()
};

// Pass through the data
return $input.item;
```

### Step 3: Add a Respond to Webhook Node

1. Add a **Respond to Webhook** node at the end of your workflow
2. Configure it:
   - Response Code: 200
   - Response Format: JSON
   - Response Body:
   ```json
   {
     "message": "Workflow was started",
     "status": "processing",
     "timestamp": "={{$now.toISOString()}}"
   }
   ```

3. Click "Save"

## Results Endpoint Workflow

### Step 1: Create a New Workflow

1. Go to the Workflows page
2. Click "+ Create Workflow"
3. Name it "Speech to Text Results"

### Step 2: Add a Webhook Node

1. Add a **Webhook** node
2. Configure it:
   - Path: `/webhook-test/results`
   - Method: GET
   - Authentication: None
   - Response Mode: "Using Respond to Webhook Node"

3. Click "Save" and then "Test Workflow" to activate the webhook

### Step 3: Add a Function Node to Return Results

1. Add a **Function** node
2. Name it "Get Results"
3. Use this code:

```javascript
// Try to access the stored results
try {
  // Check if we have stored results
  if ($workflow.variables.storedResults && 
      $workflow.variables.storedResults.latestResult) {
    
    // Get the latest result
    const latestResult = $workflow.variables.storedResults.latestResult;
    
    // Check how old the result is
    const timestamp = new Date(latestResult.timestamp);
    const now = new Date();
    const ageInSeconds = (now - timestamp) / 1000;
    
    // If the result is less than 5 minutes old, return it
    if (ageInSeconds < 300) {
      return {
        json: {
          ...latestResult.data,
          resultAge: Math.round(ageInSeconds) + " seconds"
        }
      };
    } else {
      // Result is too old
      return {
        json: {
          message: "No recent results available",
          lastResultAge: Math.round(ageInSeconds) + " seconds"
        }
      };
    }
  } else {
    // No stored results
    return {
      json: {
        message: "No results available yet",
        status: "waiting"
      }
    };
  }
} catch (error) {
  // Error accessing stored results
  return {
    json: {
      error: "Error retrieving results: " + error.message
    }
  };
}
```

4. Click "Save"

### Step 4: Add a Respond to Webhook Node

1. Add a **Respond to Webhook** node
2. Configure it:
   - Response Code: 200
   - Response Format: JSON
   - Response Body: Leave empty to pass through data from the Function node

3. Click "Save"

## Alternative: Using Static Data

If the workflow variables approach doesn't work, you can use a simpler approach with static data:

1. In your results workflow, replace the Function node with this simpler version:

```javascript
// Static transcript data
// Replace this with your actual transcript data after testing
const transcriptData = {
  transcript: "This is a sample transcript. Replace this with your actual transcript data.",
  confidence: 0.95,
  words: [
    { word: "This", start: 0.0, end: 0.2 },
    { word: "is", start: 0.3, end: 0.4 },
    { word: "a", start: 0.5, end: 0.6 },
    { word: "sample", start: 0.7, end: 1.0 },
    { word: "transcript", start: 1.1, end: 1.5 }
  ]
};

// Return the transcript data
return {
  json: transcriptData
};
```

2. Once you confirm that the results endpoint is working with static data, you can implement a more dynamic solution.

## Testing Your Setup

### Test the Main Workflow

1. Use your application to upload an audio file
2. Verify that the workflow is triggered and processes the audio

### Test the Results Endpoint

1. Open the URL of your results endpoint in a browser:
   `https://namkhanh6503.app.n8n.cloud/webhook-test/results`

2. You should see either:
   - The transcript data if available
   - A message indicating no results are available yet

### Test the API Proxy

1. Deploy your Vercel application with the API proxy
2. Test the proxy endpoint:
   `https://speechtotext-lyart.vercel.app/api/get-results`

3. Verify that it returns the data from your n8n results endpoint without CORS errors

## Troubleshooting

### Workflow Variables Not Working

If the workflow variables approach doesn't work, try:

1. Using the static data approach temporarily
2. Implementing a file-based solution as described in the simple-n8n-solution.md guide
3. Checking if your n8n version supports workflow variables

### CORS Issues Still Occurring

If you still encounter CORS issues:

1. Verify that your API proxy is correctly configured
2. Check that the Content Security Policy in your HTML files allows connections to your domains
3. Make sure your client is using the proxy endpoint and not calling n8n directly
