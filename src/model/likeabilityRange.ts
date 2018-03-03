import { IServerPlayer } from "../interfaces";

export default class LikeabilityRange {
    private min: number;
    private max: number;

    constructor(public valueFunc: (player: IServerPlayer) => number, public scale: number) {
    }

    addPossibleValue(player: IServerPlayer): void {
        const value = this.valueFunc(player);
        if (value < this.min || typeof this.min !== "number") {
            this.min = value;
        }
        if (value > this.max || typeof this.max !== "number") {
            this.max = value;
        }
    }

    getPercentile(player: IServerPlayer): number {
        const value = this.valueFunc(player);
        if (typeof this.min !== "number" || typeof this.max !== "number") {
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

    getScaledPercentile(player: IServerPlayer): number {
        const percentile = this.getPercentile(player);
        if (typeof percentile !== "number") {
            return undefined;
        }
        return percentile * this.scale;
    }
}