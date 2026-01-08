# Ollama Manager

Ollama Manager is a comprehensive tool for managing and interacting with the Ollama API. It provides a user-friendly interface for managing models, sessions, and users, as well as a powerful API for programmatic access.

## Features

- **Model Management:** View, pull, and delete models from the Ollama registry.
- **Session Management:** Create, manage, and chat with different models in persistent sessions.
- **User Management:** A simple role-based user management system (admin, manager, viewer).
- **API:** A RESTful API for programmatic access to all features.
- **Web Interface:** A responsive and intuitive web interface built with React.
- **Dockerized:** The entire application is containerized for easy deployment and scaling.

## Architecture

The application is composed of the following services:

- **`backend`:** A FastAPI application that provides the core logic and API.
- **`frontend`:** A React application that provides the web interface.
- **`nginx`:** An Nginx reverse proxy that routes traffic to the `backend` and `frontend` services.
- **`postgres`:** A PostgreSQL database for storing application data.
- **`redis`:** A Redis cache for improving performance.

## Getting Started

### Prerequisites

- Docker
- Docker Compose

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/jules-dot-ai/ollama-manager.git
   cd ollama-manager
   ```

2. **Create a `.env` file:**

   Copy the `.env.example` file to `.env` and update the environment variables as needed.

   ```bash
   cp .env.example .env
   ```

3. **Build and run the application:**

   ```bash
   docker-compose up -d
   ```

The application will be available at `http://localhost`.

## Usage

- **Default credentials:**
  - **admin:** `admin` / `admin_password`
  - **manager:** `manager` / `manager_password`
  - **viewer:** `viewer` / `viewer_password`

- **API documentation:**
  - The API documentation is available at `http://localhost/docs` (Swagger UI) and `http://localhost/redoc` (ReDoc).
