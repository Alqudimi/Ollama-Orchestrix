# Nginx Documentation

The `nginx` service acts as a reverse proxy for the Ollama Manager application. It routes incoming traffic to the appropriate service (`backend` or `frontend`) and serves the static assets for the frontend.

## Configuration Files

The Nginx configuration is split into several files for clarity and maintainability:

-   **`nginx/Dockerfile`**: The Dockerfile for building the Nginx image. It copies the configuration files into the image and sets up the necessary permissions.
-   **`nginx/nginx.conf`**: The main Nginx configuration file. It sets up the global Nginx settings, such as worker processes and logging.
-   **`nginx/conf.d/default.conf`**: The server block configuration for the application. It defines the virtual host and the location blocks for routing traffic.

## Key Features

### Reverse Proxy

Nginx proxies requests to the `backend` service and the `frontend` service.

-   Requests to `/api/` are forwarded to the `backend` service.
-   All other requests are served by the `frontend` service.

### Static File Serving

Nginx is responsible for serving the static assets of the React frontend. The `frontend` service in the `docker-compose.yml` file builds the static assets and copies them to a volume that is shared with the `nginx` service.

### Security Headers

The Nginx configuration includes several security headers to protect the application from common web vulnerabilities:

-   `X-Frame-Options`: Prevents clickjacking attacks.
-   `X-Content-Type-Options`: Prevents MIME-sniffing attacks.
-   `X-XSS-Protection`: Enables the XSS filter in modern browsers.
-   `Referrer-Policy`: Controls how much referrer information is sent with requests.
-   `Permissions-Policy`: Controls which browser features can be used by the application.

### Rate Limiting

The Nginx configuration includes rate limiting to protect the API from abuse.

-   Requests to the API are limited to 30 requests per second.
-   Requests to the authentication endpoints are limited to 5 requests per minute.

## Customization

To customize the Nginx configuration, you can modify the configuration files in the `nginx` directory and then rebuild the `nginx` image:

```bash
docker-compose build nginx
```

After rebuilding the image, you can restart the services to apply the changes:

```bash
docker-compose up -d --force-recreate nginx
```
