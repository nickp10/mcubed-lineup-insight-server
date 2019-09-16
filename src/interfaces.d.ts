import { IContest, IGame, IPlayer, ITeam, Sport } from "mcubed-lineup-insight-data";
import { ObjectID } from "bson";

export interface IAlternateName {
    _id?: ObjectID;
    contestName?: string;
    externalName?: string;
    lastUsedDate?: Date;
}

export interface IMissingName {
    _id?: ObjectID;
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

export interface IServerContest extends IContest {
    games?: IServerGame[];
}

export interface IServerGame extends IGame {
    awayTeam: IServerTeam;
    homeTeam: IServerTeam;
}

export interface IServerTeam extends ITeam {
    players?: IServerPlayer[];
}

export interface IServerPlayer extends IPlayer {
    isPlaying?: boolean;
    likeability?: number;
    opponent?: string;
    oppositionPercentile?: number;
    projectedPointsPerDollar?: number;
    projectedCeiling?: number;
    projectedFloor?: number;
    projectedPoints?: number;
    recentAveragePoints?: number;
    seasonAveragePoints?: number;
}
