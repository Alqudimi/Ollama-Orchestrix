# =============================================================================
# Makefile - Ollama Manager Docker Commands
# =============================================================================

.PHONY: help build up down restart logs clean dev prod tools

# Default target
help:
	@echo "Ollama Manager - Docker Commands"
	@echo "================================="
	@echo ""
	@echo "Production Commands:"
	@echo "  make build      - Build all Docker images"
	@echo "  make up         - Start all services in production mode"
	@echo "  make down       - Stop all services"
	@echo "  make restart    - Restart all services"
	@echo "  make logs       - View all logs"
	@echo "  make clean      - Remove all containers and volumes"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev        - Start development environment"
	@echo "  make dev-down   - Stop development environment"
	@echo ""
	@echo "Tools Commands:"
	@echo "  make tools      - Start with admin tools (Adminer, Redis Commander)"
	@echo ""
	@echo "Service Commands:"
	@echo "  make logs-backend  - View backend logs"
	@echo "  make logs-nginx    - View nginx logs"
	@echo "  make shell-backend - Open shell in backend container"
	@echo "  make shell-nginx   - Open shell in nginx container"
	@echo ""
	@echo "Database Commands:"
	@echo "  make db-shell      - Open PostgreSQL shell"
	@echo "  make redis-cli     - Open Redis CLI"

# =============================================================================
# Production Commands
# =============================================================================

build:
	@echo "Building Docker images..."
	docker-compose build

up:
	@echo "Starting production services..."
	docker-compose up -d
	@echo ""
	@echo "Services started successfully!"
	@echo "  - Frontend: http://localhost"
	@echo "  - Backend API: http://localhost/api/"
	@echo "  - API Docs: http://localhost/docs"

down:
	@echo "Stopping all services..."
	docker-compose down

restart:
	@echo "Restarting all services..."
	docker-compose restart

logs:
	docker-compose logs -f

clean:
	@echo "WARNING: This will remove all containers, volumes, and images!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	docker-compose down -v --rmi all
	docker system prune -f

# =============================================================================
# Development Commands
# =============================================================================

dev:
	@echo "Starting development environment..."
	docker-compose -f docker/docker-compose.dev.yml up -d
	@echo ""
	@echo "Development services started!"
	@echo "  - Frontend (Vite): http://localhost:5173"
	@echo "  - Backend API: http://localhost:8000"
	@echo "  - API Docs: http://localhost:8000/docs"

dev-down:
	@echo "Stopping development environment..."
	docker-compose -f docker/docker-compose.dev.yml down

dev-logs:
	docker-compose -f docker/docker-compose.dev.yml logs -f

# =============================================================================
# Tools Commands
# =============================================================================

tools:
	@echo "Starting with admin tools..."
	docker-compose --profile tools up -d
	@echo ""
	@echo "Admin tools available:"
	@echo "  - Adminer (DB): http://localhost:8080"
	@echo "  - Redis Commander: http://localhost:8081"

# =============================================================================
# Service Logs
# =============================================================================

logs-backend:
	docker-compose logs -f backend

logs-nginx:
	docker-compose logs -f nginx

logs-postgres:
	docker-compose logs -f postgres

logs-redis:
	docker-compose logs -f redis

# =============================================================================
# Shell Access
# =============================================================================

shell-backend:
	docker-compose exec backend /bin/sh

shell-nginx:
	docker-compose exec nginx /bin/sh

# =============================================================================
# Database Commands
# =============================================================================

db-shell:
	docker-compose exec postgres psql -U ollama -d ollama_manager

redis-cli:
	docker-compose exec redis redis-cli

# =============================================================================
# Health Checks
# =============================================================================

health:
	@echo "Checking service health..."
	@echo ""
	@echo "Backend:"
	@curl -s http://localhost:8000/system/health | jq . || echo "Backend not responding"
	@echo ""
	@echo "Nginx:"
	@curl -s http://localhost/health || echo "Nginx not responding"
	@echo ""

# =============================================================================
# Maintenance
# =============================================================================

backup:
	@echo "Creating database backup..."
	docker-compose exec postgres pg_dump -U ollama ollama_manager > backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup created successfully!"

prune:
	@echo "Cleaning up unused Docker resources..."
	docker system prune -f
	docker volume prune -f
