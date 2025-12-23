# Devops / Docker notes

Use the docker-compose file to build and run services. From the `devops` directory run:

```
# set env vars if needed, then
docker compose up --build
```

This will start MySQL, backend (Node) and frontend (Nginx serving React build).
