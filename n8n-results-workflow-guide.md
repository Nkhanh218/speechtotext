# n8n Results Workflow Guide

This guide will help you set up a workflow in n8n that can retrieve and return the results of your speech-to-text processing.

## Step 1: Create a New Workflow

1. In n8n, click on "Workflows" in the sidebar
2. Click the "+ Create Workflow" button
3. Name it "Speech to Text Results"

## Step 2: Add a Webhook Node

1. Click the "+" button to add a node
2. Search for "Webhook" and select it
3. Configure the Webhook node:
   - Path: `/webhook-test/results`
   - Method: GET
   - Authentication: None
   - Response Mode: "Using Respond to Webhook Node"
4. Click "Save"

## Step 3: Add an HTTP Request Node

1. Click the "+" button to add a node after the Webhook
2. Search for "HTTP Request" and select it
3. Configure the HTTP Request node:
   - URL: `https://namkhanh6503.app.n8n.cloud/api/v1/executions?workflowId=yiVeCQz8zY4CNcW6/418f1a&limit=1`
     (Replace with your actual workflow ID)
   - Method: GET
   - Authentication: None
   - If you have an API key, add a header:
     - Name: X-N8N-API-KEY
     - Value: Your API key
4. Click "Save"

## Step 4: Add a Function Node

1. Click the "+" button to add a node after the HTTP Request
2. Search for "Function" and select it
3. Paste the following code:

```javascript
// Get the HTTP response data
const responseData = $input.first().json;

// Check if we have executions
if (!responseData.data || responseData.data.length === 0) {
  return {
    json: {
      error: 'No recent executions found'
    }
  };
}

// Get the latest execution
const latestExecution = responseData.data[0];

// Check execution status
if (latestExecution.status !== 'success') {
  return {
    json: {
      message: 'Workflow is still running or failed',
      status: latestExecution.status
    }
  };
}

// Try to find the result data
try {
  // Look for the Save Result node data
  const executionData = latestExecution.data;
  const runData = executionData.resultData.runData;
  
  // Try to find the Save Result node
  let resultData = null;
  
  // Check for Save Result node
  if (runData['Save Result'] && runData['Save Result'].length > 0) {
    resultData = runData['Save Result'][0].data.main[0][0];
  } 
  // Check for other common node names
  else if (runData['Function'] && runData['Function'].length > 0) {
    resultData = runData['Function'][0].data.main[0][0];
  }
  else if (runData['Code'] && runData['Code'].length > 0) {
    resultData = runData['Code'][0].data.main[0][0];
  }
  // If not found, use the last node
  else {
    const nodeNames = Object.keys(runData);
    if (nodeNames.length > 0) {
      const lastNodeName = nodeNames[nodeNames.length - 1];
      if (runData[lastNodeName] && runData[lastNodeName].length > 0) {
        resultData = runData[lastNodeName][0].data.main[0][0];
      }
    }
  }
  
  // If we found result data, return it
  if (resultData) {
    return {
      json: resultData.json || resultData
    };
  }
  
  // If we couldn't find any result data
  return {
    json: {
      error: 'No result data found in execution'
    }
  };
} catch (error) {
  return {
    json: {
      error: `Error processing execution data: ${error.message}`
    }
  };
}
```

4. Click "Save"

## Step 5: Add a Respond to Webhook Node

1. Click the "+" button to add a node after the Function
2. Search for "Respond to Webhook" and select it
3. Configure the Respond to Webhook node:
   - Response Code: 200
   - Response Format: JSON
   - Response Body: Leave empty to pass through data from the Function node
4. Click "Save"

## Step 6: Activate the Workflow

1. Click the "Activate" toggle in the top-right corner
2. Click "Save" to save the workflow

## Step 7: Test the Workflow

1. Click the "Test Workflow" button in the Webhook node
2. Copy the displayed URL (it should be something like `https://namkhanh6503.app.n8n.cloud/webhook-test/results`)
3. Open this URL in a browser or use a tool like Postman to test it

## Troubleshooting

If you encounter issues:

1. **Error: "No recent executions found"**
   - Make sure your main workflow has been executed at least once
   - Check that you're using the correct workflow ID

2. **Error: "Workflow is still running or failed"**
   - The main workflow hasn't completed successfully yet
   - Wait for it to finish or check for errors in the main workflow

3. **Error: "No result data found in execution"**
   - The Function node couldn't find the result data in the execution
   - Check the node names in your main workflow and update the Function code accordingly

4. **CORS Issues**
   - Use the API proxy approach described in the other guides
   - Make sure your client application is using the proxy endpoint
