import { IAlternateNameProvider, IServerContest, IServerPlayer, IServerTeam } from "../interfaces";
import { IContest, IPlayer, IPlayerStats, IPositionPoints, ContestType } from "mcubed-lineup-insight-data";
import * as lodash from "lodash";
import log from "../log";
import PercentileUtil from "../model/percentileUtil";
import PlayerInsightCache from "./playerInsightCache";
import TeamInsightCache from "./teamInsightCache";

export default class ServerContestCreator {
    private pointsPerDollarMultipliers: Map<ContestType, number>;
    private players: Map<string, IServerPlayer>;
    private teams: Map<string, IServerTeam>;
    private unmergedPlayers: IPlayer[];

    constructor(private cachedContest: IContest, private playerInsightCache: PlayerInsightCache, private teamInsightCache: TeamInsightCache, private alternateNameProvider: IAlternateNameProvider) {
        this.pointsPerDollarMultipliers = new Map<ContestType, number>();
        this.pointsPerDollarMultipliers.set(ContestType.DraftKings, 1000);
        this.pointsPerDollarMultipliers.set(ContestType.FanDuel, 1000);
        this.pointsPerDollarMultipliers.set(ContestType.Yahoo, 1);
        this.players = new Map<string, IServerPlayer>();
        this.teams = new Map<string, IServerTeam>();
        this.unmergedPlayers = [];
    }

    async createServerContest(): Promise<IServerContest> {
        const serverContest: IServerContest = lodash.cloneDeep(this.cachedContest);
        this.addTeamsAndPlayersFromContest(serverContest);
        await this.mergePlayerInsight();
        await this.mergeTeamInsight();
        if (this.alternateNameProvider) {
            await this.saveMissingPlayers();
        }
        this.performPlayerCalculations(this.pointsPerDollarMultipliers.get(this.cachedContest.contestType));
        serverContest.playerDataLastUpdateTime = this.playerInsightCache.getLastUpdateTime(this.cachedContest.contestType, this.cachedContest.sport);
        serverContest.playerDataNextUpdateTime = this.playerInsightCache.getNextUpdateTime(this.cachedContest.contestType, this.cachedContest.sport);
        return serverContest;
    }

    private addTeamsAndPlayersFromContest(serverContest: IServerContest): void {
        this.players.clear();
        this.teams.clear();
        const games = serverContest.games;
        if (Array.isArray(games)) {
            for (const game of games) {
                if (game.awayTeam) {
                    this.addTeamAndPlayers(game.awayTeam, game.homeTeam);
                }
                if (game.homeTeam) {
                    this.addTeamAndPlayers(game.homeTeam, game.awayTeam);
                }
            }
        }
    }

    private addTeamAndPlayers(team: IServerTeam, opponent: IServerTeam): void {
        // Add team
        this.teams.set(team.code, team);

        // Add players
        const players = team.players;
        if (Array.isArray(players)) {
            for (const player of players) {
                player.opponent = opponent.code;
                this.players.set(`${player.team}-${player.name}`.toLowerCase(), player);
            }
        }
    }

    private async getPlayer(team: string, name: string): Promise<IServerPlayer> {
        const player = this.players.get(`${team}-${name}`.toLowerCase());
        if (!player && this.alternateNameProvider) {
            const alternateName = await this.alternateNameProvider.getAlternateName(name);
            if (alternateName) {
                const alternatePlayer = this.players.get(`${team}-${alternateName.contestName}`.toLowerCase());
                if (alternatePlayer) {
                    await this.alternateNameProvider.alternateNameUsed(alternateName);
                    return alternatePlayer;
                }
            }
        }
        return player;
    }

    private async mergePlayerInsight(): Promise<void> {
        const playerInsight = await this.playerInsightCache.getPlayerInsight(this.cachedContest.contestType, this.cachedContest.sport);
        for (const cachedPlayer of playerInsight) {
            await this.mergePlayer(cachedPlayer);
        }
    }

    private async mergePlayer(player: IPlayer): Promise<void> {
        const targetPlayer = await this.getPlayer(player.team, player.name);
        if (targetPlayer) {
            const sourceStats = player.stats || (player.stats = []);
            const targetStats = targetPlayer.stats || (targetPlayer.stats = []);
            for (const sourceStat of sourceStats) {
                let found = false;
                for (const targetStat of targetStats) {
                    if (sourceStat.source === targetStat.source) {
                        if (sourceStat.projectedPoints) {
                            targetStat.projectedPoints = sourceStat.projectedPoints;
                        }
                        if (sourceStat.projectedCeiling) {
                            targetStat.projectedCeiling = sourceStat.projectedCeiling;
                        }
                        if (sourceStat.projectedFloor) {
                            targetStat.projectedFloor = sourceStat.projectedFloor;
                        }
                        if (sourceStat.recentAveragePoints) {
                            targetStat.recentAveragePoints = sourceStat.recentAveragePoints;
                        }
                        if (sourceStat.seasonAveragePoints) {
                            targetStat.seasonAveragePoints = sourceStat.seasonAveragePoints;
                        }
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    targetStats.push(sourceStat);
                }
            }
            if (player.mlbSpecific) {
                if (!targetPlayer.mlbSpecific) {
                    targetPlayer.mlbSpecific = { };
                }
                if (this.isBattingOrder(player.mlbSpecific.battingOrder) && !this.isBattingOrder(targetPlayer.mlbSpecific.battingOrder)) {
                    targetPlayer.mlbSpecific.battingOrder = player.mlbSpecific.battingOrder;
                }
            }
            if (player.isStarter && !targetPlayer.isStarter) {
                targetPlayer.isStarter = player.isStarter;
            }
        } else {
            this.unmergedPlayers.push(player);
        }
    }

    private isBattingOrder(battingOrder: string): boolean {
        return battingOrder && "na" !== battingOrder.toLowerCase();
    }

    private async mergeTeamInsight(): Promise<void> {
        const teamInsight = await this.teamInsightCache.getTeamInsight(this.cachedContest.contestType, this.cachedContest.sport);
        const teamPercentilesCache = new Map<string, Map<string, number>>();
        if (teamInsight) {
            // Calculate the minimum and maximum values for all of the positions
            const percentilesCache = new Map<string, PercentileUtil<IPositionPoints>>();
            for (const team of teamInsight) {
                if (team.pointsAllowedPerPosition && this.teams.has(team.code)) {
                    for (const pointsAllowed of team.pointsAllowedPerPosition) {
                        if (pointsAllowed.position) {
                            let positionUtil = percentilesCache.get(pointsAllowed.position);
                            if (!positionUtil) {
                                positionUtil = new PercentileUtil<IPositionPoints>(p => p.points, 100);
                                percentilesCache.set(pointsAllowed.position, positionUtil);
                            }
                            positionUtil.addPossibleValue(pointsAllowed);
                        }
                    }
                }
            }

            // Calculate the percentile that each of the teams fall within for each position
            for (const team of teamInsight) {
                if (team.pointsAllowedPerPosition && this.teams.has(team.code)) {
                    let teamCache = teamPercentilesCache.get(team.code);
                    if (!teamCache) {
                        teamCache = new Map<string, number>();
                        teamPercentilesCache.set(team.code, teamCache);
                    }
                    for (const pointsAllowed of team.pointsAllowedPerPosition) {
                        if (pointsAllowed.position) {
                            const positionUtil = percentilesCache.get(pointsAllowed.position);
                            if (positionUtil) {
                                const percentile = positionUtil.getScaledPercentile(pointsAllowed);
                                if (typeof percentile === "number") {
                                    teamCache.set(pointsAllowed.position, percentile);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Update each player's percentile
        this.mergeTeamInsightPercentiles(teamPercentilesCache);
    }

    private mergeTeamInsightPercentiles(teamPercentileCache: Map<string, Map<string, number>>): void {
        for (const [name, serverPlayer] of this.players) {
            const positionPercentileCache = teamPercentileCache.get(serverPlayer.opponent);
            if (positionPercentileCache) {
                // Should be true for NBA, NFL, and NHL
                if (positionPercentileCache.has(serverPlayer.position)) {
                    serverPlayer.oppositionPercentile = positionPercentileCache.get(serverPlayer.position);
                }

                // Otherwise, check for MLB
                if (serverPlayer.mlbSpecific) {
                    if (serverPlayer.position === "P") {
                        const key = `PITCH-${serverPlayer.mlbSpecific.handednessThrow}`;
                        if (positionPercentileCache.has(key)) {
                            serverPlayer.oppositionPercentile = positionPercentileCache.get(key);
                        }
                    }
                    else {
                        const key = `BAT-${serverPlayer.mlbSpecific.handednessBat}`;
                        if (positionPercentileCache.has(key)) {
                            serverPlayer.oppositionPercentile = positionPercentileCache.get(key);
                        }
                    }
                }
            }
        }
    }

    private async saveMissingPlayers(): Promise<void> {
        const teamCodes: string[] = [];
        const games = this.cachedContest.games;
        if (Array.isArray(games)) {
            for (const game of games) {
                if (game.awayTeam) {
                    teamCodes.push(game.awayTeam.code);
                }
                if (game.homeTeam) {
                    teamCodes.push(game.homeTeam.code);
                }
            }
        }
        const missingPlayers = this.unmergedPlayers;
        if (Array.isArray(missingPlayers)) {
            for (const missingPlayer of missingPlayers) {
                if (missingPlayer.team && missingPlayer.name) {
                    if (teamCodes.indexOf(missingPlayer.team) > -1) {
                        await this.alternateNameProvider.addMissingName(missingPlayer.name, missingPlayer.team, this.cachedContest.sport);
                    }
                } else {
                    log.error(`Failed to save missing player: name=${missingPlayer.name}, team=${missingPlayer.team}, sport=${this.cachedContest.sport}`);
                }
            }
        }
        this.unmergedPlayers = [];
    }

    private performPlayerCalculations(pointsPerDollarMultiplier: number): void {
        const likeabilityRanges = [
            new PercentileUtil<IServerPlayer>(p => p.projectedPoints, 40),
            new PercentileUtil<IServerPlayer>(p => p.projectedPointsPerDollar, 40),
            new PercentileUtil<IServerPlayer>(p => p.recentAveragePoints, 15),
            new PercentileUtil<IServerPlayer>(p => p.seasonAveragePoints, 5)
        ];
        const positionProjectedPointsPercentiles = new Map<string, PercentileUtil<IServerPlayer>>();
        const positionProjectedPointsPerDollarPercentiles = new Map<string, PercentileUtil<IServerPlayer>>();

        // Aggregate stats from the player stats array onto the player itself
        for (const [name, player] of this.players) {
            player.isPlaying = player.isStarter || (player.mlbSpecific && player.mlbSpecific.isProbablePitcher);
            player.projectedCeiling = this.performSinglePlayerCalculation(player, ps => ps.projectedCeiling);
            player.projectedFloor = this.performSinglePlayerCalculation(player, ps => ps.projectedFloor);
            player.projectedPoints = this.performSinglePlayerCalculation(player, ps => ps.projectedPoints);
            player.recentAveragePoints = this.performSinglePlayerCalculation(player, ps => ps.recentAveragePoints);
            player.seasonAveragePoints = this.performSinglePlayerCalculation(player, ps => ps.seasonAveragePoints);
            const projectedPoints = player.projectedPoints;
            const salary = player.salary;
            if (typeof projectedPoints === "number" && typeof salary === "number") {
                player.projectedPointsPerDollar = salary === 0 ? 0 : (projectedPoints / salary) * pointsPerDollarMultiplier;
            }
            for (const likeabilityRange of likeabilityRanges) {
                likeabilityRange.addPossibleValue(player);
            }
            for (const position of this.getPlayerLabeledPositions(player)) {
                let positionProjectedPointsPercentile = positionProjectedPointsPercentiles.get(position);
                if (!positionProjectedPointsPercentile) {
                    positionProjectedPointsPercentile = new PercentileUtil<IServerPlayer>(p => p.projectedPoints, 100);
                    positionProjectedPointsPercentiles.set(position, positionProjectedPointsPercentile);
                }
                positionProjectedPointsPercentile.addPossibleValue(player);

                let positionProjectedPointsPerDollarPercentile = positionProjectedPointsPerDollarPercentiles.get(position);
                if (!positionProjectedPointsPerDollarPercentile) {
                    positionProjectedPointsPerDollarPercentile = new PercentileUtil<IServerPlayer>(p => p.projectedPointsPerDollar, 100);
                    positionProjectedPointsPerDollarPercentiles.set(position, positionProjectedPointsPerDollarPercentile);
                }
                positionProjectedPointsPerDollarPercentile.addPossibleValue(player);
            }
        }

        // Now that we know the full likeability ranges, get each player's percentile
        for (const [name, player] of this.players) {
            player.likeability = 0;
            for (const likeabilityRange of likeabilityRanges) {
                const scaledPercentile = likeabilityRange.getScaledPercentile(player);
                player.likeability += typeof scaledPercentile === "number" ? scaledPercentile : 0;
            }
            for (const position of this.getPlayerLabeledPositions(player)) {
                const positionProjectedPointsPercentile = positionProjectedPointsPercentiles.get(position);
                if (positionProjectedPointsPercentile) {
                    const percentile = positionProjectedPointsPercentile.getScaledPercentile(player);
                    if (typeof percentile === "number") {
                        if (!player.projectedPointsPercentiles) {
                            player.projectedPointsPercentiles = [];
                        }
                        player.projectedPointsPercentiles.push({
                            position,
                            percentile
                        });
                    }
                }

                const positionProjectedPointsPerDollarPercentile = positionProjectedPointsPerDollarPercentiles.get(position);
                if (positionProjectedPointsPerDollarPercentile) {
                    const percentile = positionProjectedPointsPerDollarPercentile.getScaledPercentile(player);
                    if (typeof percentile === "number") {
                        if (!player.projectedPointsPerDollarPercentiles) {
                            player.projectedPointsPerDollarPercentiles = [];
                        }
                        player.projectedPointsPerDollarPercentiles.push({
                            position,
                            percentile
                        });
                    }
                }
            }
        }
    }

    private getPlayerLabeledPositions(player: IServerPlayer): string[] {
        const positions: string[] = [];
        for (const position of this.cachedContest.positions) {
            if (position.eligiblePlayerPositions && position.eligiblePlayerPositions.indexOf(player.position) > -1) {
                positions.push(position.label);
            }
        }
        return positions;
    }

    private performSinglePlayerCalculation(player: IServerPlayer, func: (playerStat: IPlayerStats) => number): number {
        let total = 0;
        let count = 0;
        const stats = player.stats;
        if (Array.isArray(stats)) {
            for (const stat of stats) {
                const value = func(stat);
                // Skip undefined, null, etc., but allow 0 (a valid number for the calculation, but not a truthy value)
                if (typeof value === "number") {
                    total += value;
                    count++;
                }
            }
        }
        return count > 0 ? total / count : undefined;
    }
}
