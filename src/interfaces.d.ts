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
    addMissingName(name: string, team: string, sport: Sport): Promise<void>;
    alternateNameUsed(name: IAlternateName): Promise<void>;
    getAlternateName(name: string): IAlternateName;
    getMissingName(name: string): IMissingName;
    reload(): Promise<void>;
    saveUpdates(): Promise<void>;
}

export interface IServerPlayer extends IPlayer {
    isPlaying?: boolean;
    likeability?: number;
    projectedPointsPerDollar?: number;
    projectedCeiling?: number;
    projectedFloor?: number;
    projectedPoints?: number;
    recentAveragePoints?: number;
    seasonAveragePoints?: number;
}