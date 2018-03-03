import { IAlternateNameProvider, IServerPlayer } from "../interfaces";
import { IContest, IPlayer, ITeam, IPlayerStats } from "mcubed-lineup-insight-data/build/interfaces";
import LikeabilityRange from "./likeabilityRange";

export default class PlayerMap {
    private players: Map<string, IServerPlayer>;
    unmergedPlayers: IPlayer[];

    constructor(contest: IContest) {
        this.players = new Map<string, IServerPlayer>();
        this.unmergedPlayers = [];
        this.addPlayersFromContest(contest);
    }

    private addPlayersFromContest(contest: IContest): void {
        const games = contest.games;
        if (Array.isArray(games)) {
            for (let i = 0; i < games.length; i++) {
                const game = games[i];
                if (game.awayTeam) {
                    this.addPlayersFromTeam(game.awayTeam);
                }
                if (game.homeTeam) {
                    this.addPlayersFromTeam(game.homeTeam);
                }
            }
        }
    }

    private addPlayersFromTeam(team: ITeam): void {
        const players = team.players;
        if (Array.isArray(players)) {
            for (let i = 0; i < players.length; i++) {
                const player = players[i];
                this.players.set(`${player.team}-${player.name}`.toLowerCase(), player);
            }
        }
    }

    clearPlayers(): void {
        this.players.clear();
    }

    clearUnmergedPlayers(): void {
        this.unmergedPlayers = [];
    }

    private async getPlayer(team: string, name: string, alternateNameProvider: IAlternateNameProvider): Promise<IServerPlayer> {
        const player = this.players.get(`${team}-${name}`.toLowerCase());
        if (!player && alternateNameProvider) {
            const alternateName = await alternateNameProvider.getAlternateName(name);
            if (alternateName) {
                const alternatePlayer = this.players.get(`${team}-${alternateName}`.toLowerCase());
                if (alternatePlayer) {
                    await alternateNameProvider.alternateNameUsed(name);
                    return alternatePlayer;
                }
            }
        }
        return player;
    }

    async mergePlayer(player: IPlayer, alternateNameProvider: IAlternateNameProvider): Promise<void> {
        const targetPlayer = await this.getPlayer(player.team, player.name, alternateNameProvider);
        if (targetPlayer != null) {
            const sourceStats = player.stats || (player.stats = []);
            const targetStats = targetPlayer.stats || (targetPlayer.stats = []);
            for (let i = 0; i < sourceStats.length; i++) {
                const sourceStat = sourceStats[i];
                let found = false;
                for (let j = 0; j < targetStats.length; j++) {
                    const targetStat = targetStats[j];
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
            if (this.isBattingOrder(player.battingOrder) && !this.isBattingOrder(targetPlayer.battingOrder)) {
                targetPlayer.battingOrder = player.battingOrder;
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

    performPlayerCalculations(pointsPerDollarMultiplier: number): void {
        const likeabilityRanges = [
            new LikeabilityRange(p => p.projectedPoints, 40),
            new LikeabilityRange(p => p.projectedPointsPerDollar, 40),
            new LikeabilityRange(p => p.recentAveragePoints, 15),
            new LikeabilityRange(p => p.seasonAveragePoints, 5)
        ];

        // Aggregate stats from the player stats array onto the player itself
        for (const [name, player] of this.players.entries()) {
            player.isPlaying = player.isStarter || player.isProbablePitcher;
            player.projectedCeiling = this.performSinglePlayerCalculation(player, ps => ps.projectedCeiling);
            player.projectedFloor = this.performSinglePlayerCalculation(player, ps => ps.projectedFloor);
            player.projectedPoints = this.performSinglePlayerCalculation(player, ps => ps.projectedPoints);
            player.recentAveragePoints = this.performSinglePlayerCalculation(player, ps => ps.recentAveragePoints);
            player.seasonAveragePoints = this.performSinglePlayerCalculation(player, ps => ps.seasonAveragePoints);
            const points = player.projectedPoints || 0;
            const salary = player.salary;
            player.projectedPointsPerDollar = salary ? (points / salary) * pointsPerDollarMultiplier : undefined;
            for (const likeabilityRange of likeabilityRanges) {
                likeabilityRange.addPossibleValue(player);
            }
        }

        // Now that we know the full likeability ranges, get each player's percentile
        for (const [name, player] of this.players.entries()) {
            player.likeability = 0;
            for (const likeabilityRange of likeabilityRanges) {
                player.likeability += likeabilityRange.getScaledPercentile(player);
            }
        }
    }

    private performSinglePlayerCalculation(player: IServerPlayer, func: (playerStat: IPlayerStats) => number): number {
        let total = 0;
        let count = 0;
        const stats = player.stats;
        if (Array.isArray(stats)) {
            for (let i = 0; i < stats.length; i++) {
                const stat = stats[i];
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
