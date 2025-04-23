FROM ollama/ollama:0.6.2

# Pre-pull the model during build
RUN ollama serve & \
    sleep 3 && \
    ollama pull llama3.2 && \
    pkill ollama
