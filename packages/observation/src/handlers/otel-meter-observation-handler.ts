import {
	MeterObservationHandler,
	type ObservationContext,
} from "@nestjs-ai/commons";
import type {
	Meter,
	Attributes as MeterAttributes,
	Histogram as MeterHistogram,
	UpDownCounter as MeterUpDownCounter,
} from "@opentelemetry/api";

/**
 * Handler that records duration and active-operation metrics from observations.
 */
export class OtelMeterObservationHandler extends MeterObservationHandler<ObservationContext> {
	private readonly shouldCreateLongTaskTimer: boolean;
	private readonly startedAt = new WeakMap<ObservationContext, bigint>();
	private readonly longTaskAttributes = new WeakMap<
		ObservationContext,
		MeterAttributes
	>();
	private readonly durationHistograms = new Map<string, MeterHistogram>();
	private readonly activeCounters = new Map<string, MeterUpDownCounter>();
	private readonly meter: Meter;

	constructor(meter: Meter);
	constructor(meter: Meter, ...metersToIgnore: IgnoredMeters[]);

	constructor(meter: Meter, ...metersToIgnore: IgnoredMeters[]) {
		super();
		this.meter = meter;
		this.shouldCreateLongTaskTimer = !metersToIgnore.includes(
			IgnoredMeters.LONG_TASK_TIMER,
		);
	}

	onStart(context: ObservationContext): void {
		const name = context.name;
		if (!name) {
			return;
		}

		this.startedAt.set(context, process.hrtime.bigint());

		if (!this.shouldCreateLongTaskTimer) {
			return;
		}

		const attributes = this.createTags(context);
		this.longTaskAttributes.set(context, attributes);
		this.getOrCreateActiveCounter(name).add(1, attributes);
	}

	onStop(context: ObservationContext): void {
		const name = context.name;
		if (!name) {
			return;
		}

		const startedAt = this.startedAt.get(context);
		if (startedAt !== undefined) {
			const durationMs =
				Number(process.hrtime.bigint() - startedAt) / 1_000_000;
			const tags = this.createTags(context);
			tags.error = this.getErrorValue(context);
			this.getOrCreateDurationHistogram(name).record(durationMs, tags);
			this.startedAt.delete(context);
		}

		if (this.shouldCreateLongTaskTimer) {
			const longTaskAttrs = this.longTaskAttributes.get(context);
			this.getOrCreateActiveCounter(name).add(
				-1,
				longTaskAttrs ?? this.createTags(context),
			);
			this.longTaskAttributes.delete(context);
		}
	}

	private createTags(context: ObservationContext): MeterAttributes {
		const attributes: MeterAttributes = {};
		for (const [key, value] of context.lowCardinalityKeyValues) {
			attributes[key] = value;
		}

		return attributes;
	}

	private getOrCreateDurationHistogram(name: string): MeterHistogram {
		const existing = this.durationHistograms.get(name);
		if (existing) {
			return existing;
		}

		const histogram = this.meter.createHistogram(name);
		this.durationHistograms.set(name, histogram);
		return histogram;
	}

	private getOrCreateActiveCounter(name: string): MeterUpDownCounter {
		const metricName = `${name}.active`;
		const existing = this.activeCounters.get(metricName);
		if (existing) {
			return existing;
		}

		const counter = this.meter.createUpDownCounter(metricName);
		this.activeCounters.set(metricName, counter);
		return counter;
	}

	private getErrorValue(context: ObservationContext): string {
		return context.error ? context.error.name : "none";
	}
}

export enum IgnoredMeters {
	LONG_TASK_TIMER = "LONG_TASK_TIMER",
}
