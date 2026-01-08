# Deployment Documentation

This document provides instructions for deploying the Ollama Manager application using Docker Compose.

## Prerequisites

- **Docker:** Ensure that Docker is installed and running on your system.
- **Docker Compose:** Ensure that Docker Compose is installed.

## Configuration

1.  **Clone the Repository:**

    ```bash
    git clone https://github.com/jules-dot-ai/ollama-manager.git
    cd ollama-manager
    ```

2.  **Create a `.env` File:**

    Copy the `.env.example` file to `.env` and customize the environment variables as needed.

    ```bash
    cp .env.example .env
    ```

    At a minimum, you should set a secure `SECRET_KEY` and review the database and Redis credentials.

## Deployment

1.  **Build and Start the Services:**

    Run the following command from the root of the project to build the Docker images and start the services in detached mode:

    ```bash
    docker-compose up -d --build
    ```

    The `--build` flag will force a rebuild of the images, which is recommended for the first deployment or when you have made changes to the source code.

2.  **Verify the Deployment:**

    You can check the status of the running containers using the following command:

    ```bash
    docker-compose ps
    ```

    You should see all services (`postgres`, `redis`, `backend`, `frontend`, `nginx`) with a status of `Up`.

    You can also view the logs of the services to ensure that they started up correctly:

    ```bash
    docker-compose logs -f
    ```

3.  **Access the Application:**

    The application will be available at `http://localhost`.

## Stopping the Application

To stop the application, run the following command:

```bash
docker-compose down
```

This will stop and remove the containers, but it will not remove the volumes, so your data will be preserved.

## Updating the Application

To update the application to the latest version, you can pull the latest changes from the repository and then rebuild and restart the services:

```bash
git pull
docker-compose up -d --build
```
