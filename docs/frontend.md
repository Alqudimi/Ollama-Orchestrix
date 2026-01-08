# Frontend Documentation

The frontend is a React application built with Vite that provides a user-friendly web interface for the Ollama Manager.

## Features

- **Responsive Design:** The interface is designed to work on both desktop and mobile devices.
- **Component-Based:** The application is built with reusable React components.
- **State Management:** The application uses a state management library to manage the application's state.
- **Routing:** The application uses React Router for client-side routing.

## Building and Running

The frontend is built and served by the `nginx` service in the Docker Compose setup. The `frontend` service in the `docker-compose.yml` file is only used for building the static assets.

To build the frontend locally for development, you can run the following commands from the `frontend` directory:

```bash
npm install
npm run dev
```

This will start a development server on `http://localhost:3000`.

## Components

The frontend is composed of the following main components:

- **`App`:** The root component of the application.
- **`Login`:** The login page.
- **`Dashboard`:** The main dashboard, which displays the models, sessions, and users.
- **`Models`:** A component for managing models.
- **`Sessions`:** A component for managing chat sessions.
- **`Users`:** A component for managing users.
- **`Chat`:** A component for chatting with a model in a session.
