const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();

// Stream timeout settings
const STREAM_TIMEOUT = 60000; // 60 seconds max for streaming responses
const HTTP_TIMEOUT = 30000;   // 30 seconds for HTTP requests

app.use(cors());
app.use(express.json());

// Regular endpoint for non-streaming responses
app.post("/execute", async (req, res) => {
    const { model, prompt } = req.body;
  
    if (!model || !prompt) {
      return res.status(400).json({ error: "Model name and prompt are required" });
    }
    try {
      const output = await getResponse(model, prompt);
      res.type('json').send(output);
    }
    catch (err) {
      console.error("Execution error: ", err);
      res.status(500).json({ error: "Server error" });
    }
});

// Streaming endpoint for SSE - supporting both GET and POST
app.post("/stream", handleStreamRequest);
app.get("/stream", handleStreamRequest);

// Handler function for stream requests with performance optimizations
async function handleStreamRequest(req, res) {
    // Get parameters from either query (GET) or body (POST)
    const model = req.method === 'GET' ? req.query.model : req.body.model;
    const prompt = req.method === 'GET' ? req.query.prompt : req.body.prompt;
    
    // Get optional performance parameters
    const temperature = parseFloat((req.method === 'GET' ? req.query.temperature : req.body.temperature) || "0.7");
    const maxTokens = parseInt((req.method === 'GET' ? req.query.max_tokens : req.body.max_tokens) || "2048");
    const topP = parseFloat((req.method === 'GET' ? req.query.top_p : req.body.top_p) || "0.9");
    
    if (!model || !prompt) {
      return res.status(400).json({ error: "Model name and prompt are required" });
    }

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Setup the timeout for the stream
    let streamTimeout = setTimeout(() => {
        console.warn("Stream timeout reached");
        res.write(`data: ${JSON.stringify({ error: "Stream timeout", done: true })}\n\n`);
        res.end();
    }, STREAM_TIMEOUT);

    try {
        const host = ("REACT_APP_MODEL_SERVICE" in process.env) ? process.env.REACT_APP_MODEL_SERVICE : "model-published";
        const startTime = Date.now();
        
        // Make a streaming request to Ollama with optimized parameters
        const response = await axios({
            method: 'post',
            url: `http://${host}:11434/api/generate`,
            data: {
                model: model,
                prompt: prompt,
                stream: true,
                options: {
                    temperature: temperature,
                    top_p: topP,
                    max_tokens: maxTokens,
                    num_ctx: 2048,        // Context window size
                    num_gpu: 1,           // Use 1 GPU if available
                    num_thread: 4         // Use 4 CPU threads
                }
            },
            responseType: 'stream',
            timeout: HTTP_TIMEOUT  // HTTP request timeout
        });

        console.log(`Stream started for model ${model} at ${new Date().toISOString()}`);
        
        // Forward the stream to the client with performance monitoring
        let tokensGenerated = 0;
        let firstTokenTime = null;

        response.data.on('data', (chunk) => {
            try {
                // Clear the timeout on each received chunk
                clearTimeout(streamTimeout);
                // Reset timeout
                streamTimeout = setTimeout(() => {
                    console.warn("Stream timeout between chunks");
                    res.write(`data: ${JSON.stringify({ error: "Stream timeout between responses", done: true })}\n\n`);
                    res.end();
                }, STREAM_TIMEOUT);

                const data = JSON.parse(chunk.toString());
                
                // Track first token time
                if (data.response && tokensGenerated === 0) {
                    firstTokenTime = Date.now();
                    console.log(`First token after ${firstTokenTime - startTime}ms`);
                }
                
                // Count tokens
                if (data.response) {
                    tokensGenerated += 1;
                }
                
                // Send each chunk as an SSE event
                res.write(`data: ${JSON.stringify(data)}\n\n`);
                
                // If this is the final response, end the connection and log performance
                if (data.done) {
                    const endTime = Date.now();
                    const totalTime = endTime - startTime;
                    const tokensPerSecond = tokensGenerated / (totalTime / 1000);
                    
                    console.log(`Stream completed: ${tokensGenerated} tokens in ${totalTime}ms (${tokensPerSecond.toFixed(2)} tokens/sec)`);
                    
                    // Clean up the timeout
                    clearTimeout(streamTimeout);
                    res.end();
                }
            } catch (err) {
                console.error("Error parsing chunk:", err);
                res.write(`data: ${JSON.stringify({ error: "Parse error" })}\n\n`);
            }
        });

        // Handle errors in the stream
        response.data.on('error', (err) => {
            console.error("Stream error:", err);
            res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
            clearTimeout(streamTimeout);
            res.end();
        });
    } catch (err) {
        console.error("Streaming error: ", err);
        res.write(`data: ${JSON.stringify({ error: "Server error", message: err.message })}\n\n`);
        clearTimeout(streamTimeout);
        res.end();
    }
}

function getResponse(model, prompt) {
    var host = ("REACT_APP_MODEL_SERVICE" in process.env) ? process.env.REACT_APP_MODEL_SERVICE : "model-published";
    return axios.post(`http://${host}:11434/api/generate`, {
        model: model,
        prompt: prompt,
        stream: false,
        options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 2048,
            num_ctx: 2048,       // Context window size
            num_gpu: 1,          // Use 1 GPU if available
            num_thread: 4        // Use 4 CPU threads
        }
    }, {
        timeout: HTTP_TIMEOUT
    })
    .then(res => {
        console.log("Output received");
        return res.data;
    })
    .catch(err => {
        console.error("Execution error:", err);
        throw err;
    });
}
  
// Start the server and listen on port specified in command line, ex. PORT=5001 node server.js
var port = ("REACT_APP_SERVER_PORT" in process.env) ? process.env.REACT_APP_SERVER_PORT : 5001;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});