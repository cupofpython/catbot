const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();

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
app.post("/api/stream", handleStreamRequest);
app.get("/api/stream", handleStreamRequest);

// Handler function for stream requests
async function handleStreamRequest(req, res) {
    // Get parameters from either query (GET) or body (POST)
    const model = req.method === 'GET' ? req.query.model : req.body.model;
    const prompt = req.method === 'GET' ? req.query.prompt : req.body.prompt;
  
    if (!model || !prompt) {
      return res.status(400).json({ error: "Model name and prompt are required" });
    }

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const host = ("REACT_APP_MODEL_SERVICE" in process.env) ? process.env.REACT_APP_MODEL_SERVICE : "model-published";
        const port = ("REACT_APP_MODEL_PORT" in process.env) ? process.env.REACT_APP_MODEL_PORT : 11434;
        const path = ("REACT_APP_MODEL_PATH" in process.env) ? process.env.REACT_APP_MODEL_PATH : "/api/generate";

        const isDMR = "DMR" in process.env ? true : false;

        // Add debug logging
        console.log(`Making request to ${isDMR ? 'DMR' : 'Ollama'} model service at host: ${host}`);
        
        let response;
        
        if (isDMR) {
            // Docker Model Runner (OpenAI format)
            console.log(`DMR endpoint: http://${host}:${port}${path}`);
            console.log(`Model: ${model}`)
            response = await axios({
                method: 'post',
                url: `http://${host}:${port}${path}`,
                data: {
                    model: 'ai/' + model,
                    messages: [{ role: "user", content: prompt }],
                    stream: true
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                responseType: 'stream'
            });
        } else {
            // Ollama format
            console.log(`Ollama endpoint: http://${host}:11434/api/generate`);
            response = await axios({
                method: 'post',
                url: `http://${host}:11434/api/generate`,
                data: {
                    model: model,
                    prompt: prompt,
                    stream: true
                },
                responseType: 'stream'
            });
        }
        
        console.log("Connection established, processing stream...");
        
        // Forward the stream to the client
        response.data.on('data', (chunk) => {
            try {
                const chunkStr = chunk.toString();
                console.log("Received chunk:", chunkStr.substring(0, 50) + (chunkStr.length > 50 ? '...' : ''));
                
                // Handle DMR (OpenAI) format - may contain multiple SSE events
                if (isDMR) {
                    // Split by double newlines to handle multiple SSE events in one chunk
                    const events = chunkStr.split('\n\n').filter(event => event.trim());
                    console.log(`Found ${events.length} events in chunk`);
                    
                    for (const event of events) {
                        if (event.startsWith('data: ')) {
                            const dataContent = event.replace('data: ', '');
                            
                            // Check for "[DONE]" signal
                            if (dataContent.trim() === '[DONE]') {
                                console.log("Received [DONE] signal");
                                res.end();
                                return;
                            }
                            
                            try {
                                const data = JSON.parse(dataContent);
                                
                                // Debug the received data structure
                                console.log("Parsed DMR data:", JSON.stringify(data).substring(0, 100));
                                
                                // Extract content based on what's available
                                let content = '';
                                if (data.choices && data.choices.length > 0) {
                                    // For chat completions delta format
                                    if (data.choices[0].delta && data.choices[0].delta.content) {
                                        content = data.choices[0].delta.content;
                                    }
                                    // For text completions format
                                    else if (data.choices[0].text) {
                                        content = data.choices[0].text;
                                    }
                                }
                                
                                // Format to match Ollama response structure that the client expects
                                const responseData = {
                                    response: content,  // Use 'response' field to match Ollama format
                                    done: false
                                };
                                
                                if (content) {
                                    console.log(`Sending content: ${content.substring(0, 20)}${content.length > 20 ? '...' : ''}`);
                                    // Send to client
                                    res.write(`data: ${JSON.stringify(responseData)}\n\n`);
                                }
                                
                                // Check if it's the final chunk
                                if (data.choices && data.choices[0] && data.choices[0].finish_reason === 'stop') {
                                    console.log("Detected finish_reason=stop, ending stream");
                                    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                                    res.end();
                                }
                            } catch (err) {
                                console.error("Error parsing DMR chunk:", err, "Raw data:", dataContent);
                                // Don't end the connection on parse error, just log it
                            }
                        }
                    }
                } 
                // Handle Ollama format
                else {
                    try {
                        const data = JSON.parse(chunkStr);
                        console.log(`Ollama response: ${data.response ? data.response.substring(0, 20) + '...' : '[no response field]'}, done=${data.done}`);
                        
                        // Send each chunk as an SSE event
                        res.write(`data: ${JSON.stringify(data)}\n\n`);
                        
                        // If this is the final response, end the connection
                        if (data.done) {
                            console.log("Ollama stream complete");
                            res.end();
                        }
                    } catch (err) {
                        console.error("Error parsing Ollama chunk:", err);
                        // Try to continue processing even if one chunk fails
                    }
                }
            } catch (err) {
                console.error("Error processing chunk:", err);
                res.write(`data: ${JSON.stringify({ error: "Parse error", message: err.message })}\n\n`);
                // Don't end the stream on parse error unless it's critical
            }
        });
        
        // Handle errors in the stream
        response.data.on('error', (err) => {
            console.error("Stream error:", err);
            res.write(`data: ${JSON.stringify({ error: "Stream error", message: err.message, stack: err.stack })}\n\n`);
            res.end();
        });
        
        // Make sure we handle the end of the stream properly
        response.data.on('end', () => {
            console.log("Stream ended naturally");
            // Only end the response if it hasn't been ended already
            if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                res.end();
            }
        });
    } catch (err) {
        console.error("Connection error: ", err.message, err.stack);
        res.write(`data: ${JSON.stringify({ 
            error: "Server error", 
            message: err.message,
            url: err.config?.url || 'unknown',
            status: err.response?.status || 'unknown',
            statusText: err.response?.statusText || 'unknown'
        })}\n\n`);
        res.end();
    }
}

function getResponse(model, prompt) {
    var host = ("REACT_APP_MODEL_SERVICE" in process.env) ? process.env.REACT_APP_MODEL_SERVICE : "model-published";
    var modelPort = ("REACT_APP_MODEL_PORT" in process.env) ? process.env.REACT_APP_MODEL_PORT : 11434
    return axios.post(`http://${host}:${modelPort}/api/generate`, {
        model: model,
        prompt: prompt,
        stream: false
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

// Export the necessary functions and app for testing
module.exports = {
  getResponse
};