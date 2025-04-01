const express = require("express");  // Import Express
const cors = require("cors");        // Import CORS middleware
const axios = require("axios")
const app = express(); // Initialize Express

// Use env variable, or fallback to localhost
// const LLM_API_HOST = process.env.LLM_API_HOST || 'http://0.0.0.0:11434';

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
    //console.log(`${LLM_API_HOST}`)
    // Use K8s service nae, switch back to 0.0.0.0 for local testing (npm start)
    return axios.post("http://localhost:11434/api/generate", {
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
  
// Start the server and listen on port 5001
const PORT = 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});