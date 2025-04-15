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
        
        // Make a streaming request to Ollama
        const response = await axios({
            method: 'post',
            url: `http://${host}:11434/api/generate`,
            data: {
                model: model,
                prompt: prompt,
                stream: true
            },
            responseType: 'stream'
        });

        // Forward the stream to the client
        response.data.on('data', (chunk) => {
            try {
                const data = JSON.parse(chunk.toString());
                // Send each chunk as an SSE event
                res.write(`data: ${JSON.stringify(data)}\n\n`);
                
                // If this is the final response, end the connection
                if (data.done) {
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
            res.end();
        });
    } catch (err) {
        console.error("Streaming error: ", err);
        res.write(`data: ${JSON.stringify({ error: "Server error", message: err.message })}\n\n`);
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