## Accelerating Development with Docker

This demonstration will walk through this project to showcase Docker's build, test, and security features.

![CatBot Architecture](images/catbotfull.png)

## Getting familiarized with AI
### Topics: Ask Gordon, Dockerfiles 🐳
- Open Docker Desktop
- Select the stars on the top left to "Ask Gordon"
- Select Explain my Dockerfile -> Give access to CatBot directory
- See the various descriptions of lines in the Dockerfile
- Let's run this and see it in action.

## Running in my dev environment
### Topics: Docker Model Runner, Containers, Docker Compose 🐳
- Navigate back to project on VS Code
- Split view between VSCode and Chrome
- Run `docker compose up --build`
- Build the images and run them
- Navigate to localhost:3000 on Chrome
- Test it out!
- *How did this work?*
- Move into Docker Compose `compose.yaml`
- See we automatically spun up a frontend and a backend service
- *How did the cat talk to us?*
- *Easy: We are using Docker Model Runner to run a model locally.*
- Review logs where we connect to `http://model-runner.docker.internal/engines/llama.cpp/v1/chat/completions`
- Navigate to `server.js`
- *Note that we are interacting with the model through an OpenAI endpoint (chat/completions) from within the backend container*
- Take down services with `docker compose down`
- *How can we learn more about models?*
- In a separate terminal, run `docker model ls`
- See you can run a model using `docker model run ai/llama3.2`
- Exit with `/bye`
- :red_circle: NAVIGATE BACK TO SLIDES


## Let's scan what we built our image and test our code!
### Topics: Scout, TCC 🐳
- Navigate to Docker Desktop and search for image build from compose
- Run analysis for vulnerabilities with Docker Scout
- Navigate back to VS Code
- Split VS Code and Docker Desktop
- Navigate to tests/server.test.js and show TestContainers logic
- Run `npm test` and watch test run, containers appear in DD
- Switch to TestContainers cloud and re-run `npm test`, notice the containers do not appear in DD
- View results in [TCC dashboard](https://app.testcontainers.cloud/accounts/9926/dashboard)
- :red_circle: NAVIGATE BACK TO SLIDES

## Bonus: How can we automate this?

- You can use a pipeline to automate this process, in this case we use GitHub Actions
- Let's make a quick PR.
- Edit line 213 of App.js to a different cat name
- Quick preview of change by running `docker compose up --build`
- `git checkout -b new-cat`
- `git add src/App.js` && `git commit -m "Change cat name"`
- `git push`

(Cleanup: `git branch -D new-cat`, delete branch in GH and close PR)

- Navigate to GitHub and open a PR then see the pipeline for building, testing, and scanning

- See we built our images with a cloud builder, navigate to [cloud builds](https://app.docker.com/build/accounts/demonstrationorg/builds) to see.

- *Note: On merge, we kick off the deployment to prod, but we won't show that here!*

- :red_circle: NAVIGATE BACK TO SLIDES