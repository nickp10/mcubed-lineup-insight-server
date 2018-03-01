import { IPlayer, Sport } from "mcubed-lineup-insight-data/build/interfaces";

export interface IAlternateName {
    id?: string;
    contestName?: string;
    externalName?: string;
    lastUsedDate?: Date;
}

export interface IMissingName {
    id?: string;
    count?: number;
    name?: string;
    sport?: Sport;
    team?: string;
}

export interface IAlternateNameProvider {
    addMissingName(sport: Sport, name: string, team: string): Promise<void>;
    alternateNameUsed(name: string): Promise<void>;
    getAlternateName(name: string): Promise<string>;
    reload(): Promise<void>;
}

export interface IServerPlayer extends IPlayer {
    isPlaying?: boolean;
    likability?: number;
    projectedPointsPerDollar?: number;
    projectedCeiling?: number;
    projectedFloor?: number;
    projectedPoints?: number;
    recentAveragePoints?: number;
    seasonAveragePoints?: number;
}
