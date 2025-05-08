# Simple n8n Solution for Speech-to-Text Results

This guide provides a simpler solution for handling speech-to-text results in n8n without using the n8n API.

## Overview

Instead of trying to access execution data through the API, we'll use a simpler approach:

1. Store the speech-to-text result in a static file
2. Create a webhook endpoint that returns the content of this file

This approach is simpler and doesn't require API access or complex code.

## Step 1: Main Workflow Setup

In your main speech-to-text workflow:

1. After processing the audio and getting the transcript, add a **Write Binary File** node:
   - File Name: `latest_transcript.json`
   - Property: The node output containing your transcript data
   - Make sure to write the file to a location that n8n can access

2. Add a **Respond to Webhook** node at the end:
   - Response Code: 200
   - Response Format: JSON
   - Response Body:
   ```json
   {
     "message": "Workflow was started",
     "status": "processing"
   }
   ```

## Step 2: Results Endpoint Workflow

Create a new workflow for the results endpoint:

1. Add a **Webhook** node:
   - Path: `/webhook-test/results`
   - Method: GET
   - Authentication: None
   - Response Mode: "Using Respond to Webhook Node"

2. Add a **Read Binary File** node:
   - File Path: Path to your `latest_transcript.json` file
   - Add an "If" option to handle the case where the file doesn't exist yet

3. Add a **Function** node to process the file content:
```javascript
// Get the file content
const fileContent = $input.first().json;

// Check if we have valid data
if (!fileContent) {
  return {
    json: {
      message: "No results available yet",
      status: "processing"
    }
  };
}

// Return the file content
return {
  json: fileContent
};
```

4. Add a **Respond to Webhook** node:
   - Response Code: 200
   - Response Format: JSON
   - Response Body: Leave empty to pass through data from the Function node

## Step 3: Update Your Client-Side Code

Update your client-side code to poll the results endpoint:

```javascript
async function pollForResults(maxAttempts, interval) {
  // Use the API proxy endpoint
  const apiProxyEndpoint = window.location.origin + '/api/get-results';
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Wait between attempts
      await new Promise(resolve => setTimeout(resolve, interval));
      
      // Send request to get results
      const response = await fetch(apiProxyEndpoint);
      
      if (!response.ok) {
        console.log(`Attempt ${attempt + 1}: HTTP error ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      // Check if result is available
      if (data.error || data.message === "No results available yet") {
        console.log(`Attempt ${attempt + 1}: Result not ready yet`);
        continue;
      }
      
      // If we have actual result data, return it
      return data;
    } catch (error) {
      console.log(`Attempt ${attempt + 1}: Error`, error.message);
    }
  }
  
  // If we reach here, we've exceeded max attempts
  return null;
}
```

## Alternative: Using n8n Variables

If your n8n version supports Variables (0.214.0 or later), you can use them instead of files:

1. In your main workflow, add a Function node to save the result:
```javascript
// Get the transcript data
const transcriptData = $input.first().json;

// Save to n8n Variables
$variables.set('latest_transcript', transcriptData);

// Pass through the data
return {
  json: transcriptData
};
```

2. In your results workflow, use a Function node to retrieve the variable:
```javascript
// Try to get the variable
try {
  const transcriptData = $variables.get('latest_transcript');
  
  if (transcriptData) {
    return {
      json: transcriptData
    };
  } else {
    return {
      json: {
        message: "No results available yet",
        status: "processing"
      }
    };
  }
} catch (error) {
  return {
    json: {
      error: "Error retrieving results: " + error.message
    }
  };
}
```

## Benefits of This Approach

1. **Simplicity**: No need to use the n8n API or complex code
2. **Reliability**: Works with any n8n setup, including those without API access
3. **Performance**: Faster response times since it's just reading a file or variable
4. **Maintainability**: Easier to understand and troubleshoot

## Limitations

1. **No Execution Tracking**: This approach doesn't track specific executions
2. **Latest Result Only**: Only returns the most recent result
3. **File Access**: Requires proper file permissions if using the file-based approach
