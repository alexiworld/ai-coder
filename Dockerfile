FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM python:3.12-alpine

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY backend/pyproject.toml ./backend/
RUN cd backend && uv sync --no-dev

COPY backend/ ./backend/

COPY --from=frontend-builder /app/frontend/out/ ./frontend/out/

ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uv", "run", "--directory", "/app/backend", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]