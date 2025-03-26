# CatBot: Talk to your cats.


https://github.com/user-attachments/assets/0124784f-e069-4150-87a3-21c2b76b871d


## Summary
This project is a chatbot that allows you to talk to your cats. :smile:

It is a NodeJS app that uses the llama3.2 model to service prompt requests. It uses Docker Hub to pull the app + AI images.

## How to Run

### Locally
- Update the `App.js` and `server.js` to use 0.0.0.0 as hosts for API requests instead of K8s service names.
- `docker run -p 11434:11434 ollama/ollama:0.6.2`
- Exec into the container and run `ollama pull llama3.2`
- `npm start`

### Locally with Docker Compose
I used compose to develop this locally. 

- Update the `App.js` and `server.js` to use 0.0.0.0 as hosts for API requests instead of K8s service names.
- `docker compose up --build`
- When done, `docker compose down`

### On EKS or MiniKube
- Set up an EKS cluster. I followed this [tutorial](https://medium.com/@tamerbenhassan/deploying-a-simple-application-using-eks-step-by-step-guide-512b1559a7bd).
- `kubectl apply -k out/overlays/desktop`

#### EKS Notes:
- I had to rebuild for AMD when the image was not able to be pulled by the pod. It should know to pull the AMD image build.
- The default image size for your nodes is m5.large. Increase your resource requests as needed.

#### General Notes:
- Switch kube contexts when working with MiniKube vs. EKS. Get contexts by running `kubectl config get-contexts` and swtich by running: `kubectl config use-context {NAME}`
