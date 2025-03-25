const express = require("express");  // Import Express
const Docker = require("dockerode"); // Import Dockerode
const cors = require("cors");        // Import CORS middleware
const bodyParser = require("body-parser"); // Middleware for JSON parsing

const app = express(); // Initialize Express
const docker = new Docker({ socketPath: "/var/run/docker.sock" }); // Connect to Docker

app.use(cors());
app.use(express.json());

app.post("/execute", async (req, res) => {
    // Cleanup response
    const stripAnsi = (str) => {
        return str
          .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "") // Remove ANSI escape sequences
          .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters (NULL, newlines, padding)
          .replace(/[⠙⠹⠸⠼⠴⠦⠧⠇⠏⠋]/g, "") // Remove spinner animation characters
          //.replace(/\[?\d*[?]?\d*[a-zA-Z]/g, "") // Remove extra junk artifacts
          //.trim(); // Remove leading/trailing spaces
    };

    const { containerName, command } = req.body;
  
    if (!containerName || !command) {
      return res.status(400).json({ error: "Container name and command are required" });
    }
  
    try {
      // Find the container by name
      const containers = await docker.listContainers({ all: true });
      const containerInfo = containers.find(c => c.Names.some(name => name.includes(containerName)));
  
      if (!containerInfo) {
        return res.status(404).json({ error: `Container '${containerName}' not found` });
      }
  
      const container = docker.getContainer(containerInfo.Id);
  
      // Create an execution instance
      const exec = await container.exec({
        Cmd: command.split(" "),
        AttachStdout: true,
        AttachStderr: true,
      });
  
      // Start execution and properly collect all output
      const stream = await exec.start({ hijack: true, stdin: true });
  
      let output = "";
      
      // Use promises to properly handle stream completion
      await new Promise((resolve, reject) => {
        stream.on("data", (chunk) => {
          output += chunk.toString();
        });
    
        stream.on("end", () => {
          resolve();
        });
        
        stream.on("error", (err) => {
          reject(err);
        });
      });
      
      const cleanOutput = stripAnsi(output);
      res.json({ output: cleanOutput.trim() });
  
    } catch (err) {
      console.error("Execution error:", err);
      res.status(500).json({ error: err.message });
    }
});
  
// Start the server and listen on port 5001
const PORT = 5001;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});