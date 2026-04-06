# Observation Sample

This is a self-contained NestJS sample for local embedding generation and OpenTelemetry observation.
It is not part of the npm workspace. Run it directly from this folder.

## What it shows

- A free local embedding model from `@nestjs-ai/model-transformers`
- Automatic observation span and metric recording for embedding calls
- Export of traces and metrics to the local OTLP stack

## Run the observability stack

Run these commands from `nestjs-ai/samples/observation`.
Make sure ports `16686`, `4317`, `4318`, and `9090` are free before starting.

```bash
npm run docker:up
```

This starts:

- Jaeger UI at `http://localhost:16686`
- Prometheus at `http://localhost:9090`
- OTLP collector on `http://localhost:4317` and `http://localhost:4318`

## Install with npm

If you want to treat this sample as a standalone app, install dependencies with npm from this directory:

```bash
npm install
```

This creates a local `package-lock.json` and `node_modules/` for the sample only.

## Run the app

```bash
npm run start:dev
```

The first request may take a little longer while the embedding model is downloaded.

The sample exposes:

- `GET /embedding`

Example:

```bash
curl 'http://localhost:3000/embedding?text=hello%20world'
```

## Stop the stack

```bash
npm run docker:down
```
