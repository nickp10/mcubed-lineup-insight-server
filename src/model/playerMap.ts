import { IAlternateNameProvider } from "../interfaces";
import { IContest, IPlayer, ITeam } from "mcubed-lineup-insight-data/build/interfaces";

export default class PlayerMap {
    players: Map<string, IPlayer>;
    unmergedPlayers: IPlayer[];

    constructor(contest: IContest) {
        this.players = new Map<string, IPlayer>();
        this.unmergedPlayers = [];
        this.addPlayersFromContest(contest);
    }

    addPlayersFromContest(contest: IContest): void {
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

    addPlayersFromTeam(team: ITeam): void {
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

    async getPlayer(team: string, name: string, alternateNameProvider: IAlternateNameProvider): Promise<IPlayer> {
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
}
