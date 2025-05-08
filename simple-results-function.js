/**
 * Simple Results Function
 * 
 * This is a very simple function that returns a static response.
 * Replace the static data with your actual transcript data.
 */

// You can replace this with your actual transcript data
// or use a more dynamic approach as described in the guides
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
