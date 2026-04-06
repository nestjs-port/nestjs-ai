import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

export function createProductionOtelRuntime(): NodeSDK {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

  return new NodeSDK({
    serviceName: 'observation-sample',
    contextManager: new AsyncLocalStorageContextManager(),
    spanProcessor: new BatchSpanProcessor(
      new OTLPTraceExporter({
        url:
          process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
          'http://127.0.0.1:4318/v1/traces',
      }),
    ),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url:
          process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ??
          'http://127.0.0.1:14318/v1/metrics',
      }),
      exportIntervalMillis: 5_000,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
}

export async function shutdownProductionOtelRuntime(
  runtime: NodeSDK | null,
): Promise<void> {
  if (!runtime) {
    return;
  }

  await runtime.shutdown();
}
