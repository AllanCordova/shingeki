FROM golang:1.25-bookworm AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /worker ./cmd/worker

FROM python:3.12-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir semgrep

WORKDIR /app
COPY --from=builder /worker /app/worker

ENV SEMGREP_BINARY=semgrep

CMD ["/app/worker"]
