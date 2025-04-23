const { GenericContainer } = require('testcontainers');
const { getResponse } = require('../server');
const SECONDS = 1000;

describe('Ollama Container Tests', () => {
  let container;

  // Use beforeAll instead of beforeEach if you want to reuse the container
  beforeAll(async () => {
    // Initialize container before tests run
    container = await new GenericContainer("samanthamorris684/ollama@sha256:78a199fa9652a16429037726943a82bd4916975fecf2b105d06e140ae70a1420")
      .withExposedPorts(11434)
      .start();

    // Get logs
    (await container.logs())
        .on("data", line => console.log(line))
        .on("err", line => console.error(line))
        .on("end", () => console.log("Stream closed"));
    
    // Set environment variables after container is started
    process.env.REACT_APP_MODEL_SERVICE = container.getHost();
    process.env.REACT_APP_MODEL_PORT = container.getMappedPort(11434);
    
    console.log(`Container running at ${process.env.REACT_APP_MODEL_SERVICE}:${process.env.REACT_APP_MODEL_PORT}`);

    console.log()

  }, 180 * SECONDS); // Timeout increased for startup and model pull

  afterAll(async () => {
    // Clean up container after tests
    try {
        await container.stop({
            force: true,
            timeout: 0
        });
        console.log("Container forcefully stopped");
    }
    catch (error) {
        console.error("Error stopping container: ", error);
    }
  });

  test('test nonstreaming response', async () => {
    const model = "llama3.2";
    const prompt = "How are you?";
    
    const result = await getResponse(model, prompt);
    console.log('Response from Ollama:', result);
    
    expect(result["done"]).toBe(true)
  }, 60 * SECONDS);
});