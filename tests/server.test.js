const { GenericContainer } = require('testcontainers');
const axios = require('axios');

jest.setTimeout(60000);

describe("Server Endpoints", () => {
  let container;
  let serverUrl;

  beforeAll(async () => {
    // Start your container
    container = await new GenericContainer("samanthamorris684/catbot-backend@sha256:6e2bf0ca7fa13fee68e5aa5a85f3c179c5c44bf3a50e3c271c04d64f7cd9e063")
      .withExposedPorts(5001) // Your server inside listens on 5001
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(5001);
    serverUrl = `http://${host}:${port}`;
  });

  afterAll(async () => {
    await container.stop();
  });

  test("POST /execute should return 400 if missing model or prompt", async () => {
    const response = await axios.post(`${serverUrl}/execute`, { model: "test-model" }, { validateStatus: () => true });
    expect(response.status).toBe(400);
    expect(response.data).toEqual({ error: "Model name and prompt are required" });
  });

  test("POST /execute should return 500 if backend model is unreachable", async () => {
    const response = await axios.post(`${serverUrl}/execute`, { model: "nonexistent", prompt: "hello" }, { validateStatus: () => true });
    expect(response.status).toBe(500);
    expect(response.data.error).toBeDefined();
  });

  test("POST /api/stream should return 400 if missing model or prompt", async () => {
    const response = await axios.post(`${serverUrl}/api/stream`, { model: "test-model" }, { validateStatus: () => true });
    expect(response.status).toBe(400);
    expect(response.data).toEqual({ error: "Model name and prompt are required" });
  });

  test("GET /api/stream should return 400 if missing model or prompt", async () => {
    const response = await axios.get(`${serverUrl}/api/stream?model=test-model`, { validateStatus: () => true });
    expect(response.status).toBe(400);
    expect(response.data).toEqual({ error: "Model name and prompt are required" });
  });
});
