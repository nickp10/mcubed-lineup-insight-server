export default class PercentileUtil<T> {
    private min: number;
    private max: number;

    constructor(public valueFunc: (item: T) => number, public scale: number) {
    }

    addPossibleValue(item: T): void {
        const value = this.valueFunc(item);
        if (typeof value !== "number") {
            return;
        }
        if (value < this.min || typeof this.min !== "number") {
            this.min = value;
        }
        if (value > this.max || typeof this.max !== "number") {
            this.max = value;
        }
    }

    private getPercentile(item: T): number {
        const value = this.valueFunc(item);
        if (typeof this.min !== "number" || typeof this.max !== "number") {
            return 1;
        } else if (typeof value !== "number") {
            return undefined;
        } else if (this.min === this.max) {
            if (value === this.min) {
                return 1;
            } else {
                return undefined;
            }
        } else {
            return (value - this.min) / (this.max - this.min);
        }
    }

    getScaledPercentile(item: T): number {
        const percentile = this.getPercentile(item);
        if (typeof percentile !== "number") {
            return undefined;
        }
        return percentile * this.scale;
    }
}
