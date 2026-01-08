# Backend Documentation

The backend is a FastAPI application that provides a RESTful API for interacting with the Ollama Manager.

## API

The API is documented using Swagger UI and ReDoc.

- **Swagger UI:** `http://localhost/docs`
- **ReDoc:** `http://localhost/redoc`

The API provides endpoints for:

- **Authentication:** Login and logout.
- **Users:** CRUD operations for users.
- **Models:** Listing, pulling, and deleting Ollama models.
- **Sessions:** Creating, listing, and managing chat sessions.
- **Messages:** Sending and retrieving messages in a session.

## Environment Variables

The backend can be configured using the following environment variables:

| Variable              | Description                                        | Default                                 |
| --------------------- | -------------------------------------------------- | --------------------------------------- |
| `DATABASE_URL`        | The connection URL for the PostgreSQL database.    | `postgresql://ollama:ollama@postgres/ollama` |
| `REDIS_URL`           | The connection URL for the Redis cache.            | `redis://redis:6379/0`                     |
| `OLLAMA_API_URL`      | The URL of the Ollama API.                         | `http://ollama:11434`                      |
| `SECRET_KEY`          | The secret key for signing JWTs.                   | `a-very-secret-key`                     |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | The expiration time for access tokens in minutes. | `30`                                    |

## Database Schema

The database schema is defined in the `docker/init-db.sql` file. It consists of the following tables:

- `users`: Stores user information, including their username, hashed password, and role.
- `sessions`: Stores information about chat sessions, including the model used and the system prompt.
- `messages`: Stores the messages in each session.
- `model_usage`: Tracks the usage of each model.
- `api_logs`: Logs all API requests.
