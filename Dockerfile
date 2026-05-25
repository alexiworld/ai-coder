# Stage 1: Build NextJS frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend serving frontend static files
FROM python:3.12-alpine

WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn pydantic

COPY backend/pyproject.toml ./backend/
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/out/ ./frontend/out/

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]