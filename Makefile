.PHONY: help build up down restart clean logs ps dev run

GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m 

help:
	@echo "$(GREEN)Transcendence - Available Commands:$(NC)"
	@echo ""
	@echo "  $(YELLOW)make run$(NC)       - Build and start all containers"
	@echo "  $(YELLOW)make build$(NC)     - Build Docker images"
	@echo "  $(YELLOW)make up$(NC)        - Start containers"
	@echo "  $(YELLOW)make down$(NC)      - Stop containers"
	@echo "  $(YELLOW)make restart$(NC)   - Restart containers"
	@echo "  $(YELLOW)make re$(NC)        - Rebuild (preserves database)"
	@echo "  $(YELLOW)make clean$(NC)     - Remove containers/images (preserves database)"
	@echo "  $(YELLOW)make clean-all$(NC) - Remove everything including database"
	@echo "  $(YELLOW)make logs$(NC)      - Show logs"
	@echo "  $(YELLOW)make ps$(NC)        - Show container status"
	@echo "  $(YELLOW)make dev$(NC)       - Run in development mode"
	@echo ""
	@echo "Quick start: $(YELLOW)make run$(NC)"

run:
	@echo "$(GREEN)Starting Transcendence...$(NC)"
	@$(MAKE) build
	@$(MAKE) up
	@sleep 3
	@$(MAKE) ps
	@echo ""
	@echo "$(GREEN)Application ready at https://localhost:8443$(NC)"

build:
	@echo "$(GREEN)Building images...$(NC)"
	@docker compose build

up:
	@echo "$(GREEN)Starting containers...$(NC)"
	@docker compose up -d

down:
	@echo "$(RED)Stopping containers...$(NC)"
	@docker compose down



clean:
	@echo "$(RED)Cleaning all resources (preserving database)...$(NC)"
	@docker compose down --rmi all
	@docker volume rm -f game_client-build 2>/dev/null || true
	@rm -rf client/public/dist server/dist server/nodes_module
	@echo "$(GREEN)Clean complete$(NC)"

clean-all:
	@echo "$(RED)Cleaning ALL resources including database...$(NC)"
	@docker compose down -v --rmi all
	@rm -rf client/public/dist server/dist server/nodes_module
	@rm -rf server/uploads/avatars/users/*
	@echo "$(GREEN)Full clean complete$(NC)"

re:
	@echo "$(YELLOW)Rebuilding containers...$(NC)"
	@make clean
	@make run

restart:
	@echo "$(YELLOW)Restarting containers...$(NC)"
	@docker compose restart

logs:
	@docker compose logs -f

ps:
	@docker compose ps

dev:
	@echo "$(GREEN)Starting development mode...$(NC)"
	@docker compose -f docker-compose.dev.yml up --build

dev-database: 
	@echo "$(GREEN)Setting database web app...$(NC)"
	docker exec -it transcendence-server-dev sqlite_web /app/data/transcendaire.db --host 0.0.0.0 --port 8081
	@echo "$(GREEN)Application ready at http://localhost:8081${NC}"



dev-down:
	@docker compose -f docker-compose.dev.yml down -v

dev-restart:
	@echo "$(YELLOW)Restarting containers...$(NC)"
	@docker compose -f docker-compose.dev.yml restart
