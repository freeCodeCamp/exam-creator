# Contributing

## Development

### Prerequisites

#### Rust

https://www.rust-lang.org/tools/install

#### Bun

https://bun.sh/

#### Nodejs LTS

https://nodejs.org/en

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

## Flight Manual

### Config

Required environment variables:

- `MONGODB_URI`
  - Cluster with `freecodecamp` database, and `EnvExamTemp` and `ExamCreatorUser` collections
- `GITHUB_CLIENT_ID`
  - GitHub OAuth app id
  - NOTE: Not required if `MOCK_AUTH=true`
- `GITHUB_CLIENT_SECRET`
  - GitHub OAuth app secret
  - NOTE: Not required if `MOCK_AUTH=true`
- `COOKIE_KEY`
  - 64+ utf-8 character string

Optional environment variables:

- `PORT`
  - Default: `8080`
- `ALLOWED_ORIGINS`
  - Default: `http://127.0.0.1:<PORT>`
- `GITHUB_REDIRECT_URL`
  - Default: `http://127.0.0.1:<PORT>/auth/callback/github`
- `VITE_MOCK_DATA`
  - Default: `undefined`
  - Only used by the client, and only used when developing the client in isolation
- `MOCK_AUTH`
  - Default: `false`
  - Not allowed unless running a debug build

### Build

```bash
# Minimal
docker build .
# Suggested
docker build -t exam-creator:latest -f Dockerfile .
```

### Run

```bash
# Minimal
docker run --env-file .env -p 8080:8080 <IMAGE_ID>
# Suggested
docker run --env-file .env -p 8080:8080 --name exam-creator-instance exam-creator:latest
```

### Logging

Filter requests by `RUST_LOG="server=<LEVEL>"`.
