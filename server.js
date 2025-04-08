const express = require("express");  // Import Express
const cors = require("cors");        // Import CORS middleware
const axios = require("axios")
const app = express(); // Initialize Express

app.use(cors());
app.use(express.json());

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
      res.status(500);
    }
});

function getResponse(model, prompt) {
    var host = ("REACT_APP_MODEL_SERVICE" in process.env) ? process.env.REACT_APP_MODEL_SERVICE : "model-published";
    return axios.post(`http://${host}:11434/api/generate`, {
        model: model,
        prompt: prompt,
        stream: false
    })
    .then(res => {
        console.log("Output:" + res.data);
        output = res.data;
        return output;
    })
    .catch (err => {
        console.error("Execution error:", err);
    });
}
  
// Start the server and listen on port specified in command line, ex. PORT=5001 node server.js
var port = ("REACT_APP_SERVER_PORT" in process.env) ? process.env.REACT_APP_SERVER_PORT : 5001;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});