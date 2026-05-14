FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/requirements.txt
# Default PyPI "torch" on Linux pulls CUDA wheels (~2GB+). CPU wheels are ~200MB and avoid
# BuildKit/Docker Desktop timeouts (rpc error: Unavailable / EOF) on long installs.
RUN pip install --no-cache-dir "torch>=2.2.0" --index-url https://download.pytorch.org/whl/cpu \
    && sed '/^torch/d' /app/requirements.txt > /app/requirements-no-torch.txt \
    && pip install --no-cache-dir -r /app/requirements-no-torch.txt \
    && rm /app/requirements-no-torch.txt

COPY backend/app /app/app

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
