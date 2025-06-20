# Contributing

## Prerequisites

### Rust

https://www.rust-lang.org/tools/install

### Bun

https://bun.sh/

### Nodejs LTS

https://nodejs.org/en

## Development

### Quick Start

1. Copy the sample .env file:

```bash
cp sample.env .env
```

2. Build the client:

```bash
bun run build
```

3. Start the server:

```bash
bun run develop:server
```

### Information

The client can be developed without the backend by setting `VITE_MOCK_DATA="true"`, then using:

```bash
bun run dev
```

Build the Docker image:

```bash
docker build -t exam-creator -f Dockerfile .
```

```bash
docker run --env-file .env -d -p 3001:3001 --name exam-creator-instance exam-creator
```
