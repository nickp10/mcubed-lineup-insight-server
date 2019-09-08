import { IAlternateNameProvider } from "../interfaces";
import { IContest, IPlayerCard, IPositionPoints, ContestType, Sport } from "mcubed-lineup-insight-data";
import CacheRefresher from "./cacheRefresher";
import ContestCache from "./contestCache";
import log from "../log";
import PercentileUtil from "../model/percentileUtil";
import PlayerInsightCache from "./playerInsightCache";
import PlayerCardService from "./playerCardService";
import PlayerMap from "../model/playerMap";
import TeamInsightCache from "./teamInsightCache";

export default class LineupAggregator {
    private alternateNameProvider: IAlternateNameProvider;
    private contestCache: ContestCache;
    private mergedPlayerInsight: IContest[];
    private playerCardService: PlayerCardService;
    private playerInsightCache: PlayerInsightCache;
    private pointsPerDollarMultipliers: Map<ContestType, number>;
    private refresher: CacheRefresher;
    private teamInsightCache: TeamInsightCache;

    constructor(alternateNameProvider: IAlternateNameProvider) {
        this.alternateNameProvider = alternateNameProvider;
        this.contestCache = new ContestCache();
        this.mergedPlayerInsight = [];
        this.playerCardService = new PlayerCardService();
        this.playerInsightCache = new PlayerInsightCache();
        this.teamInsightCache = new TeamInsightCache();
        this.pointsPerDollarMultipliers = new Map<ContestType, number>();
        this.pointsPerDollarMultipliers.set(ContestType.DraftKings, 1000);
        this.pointsPerDollarMultipliers.set(ContestType.FanDuel, 1000);
        this.pointsPerDollarMultipliers.set(ContestType.Yahoo, 1);
        this.refresher = new CacheRefresher(this, this.contestCache, this.playerInsightCache, this.teamInsightCache);
    }

    async start(): Promise<void> {
        await this.refresher.refreshContestCache();
    }

    async getPlayerCardByContestID(contestID: string, playerID: string): Promise<IPlayerCard> {
        const contests = await this.contestCache.getContests();
        for (let i = 0; i < contests.length; i++) {
            const contest = contests[i];
            if (contest.ID === contestID) {
                return await this.getPlayerCardByContest(contest, playerID);
            }
        }
        return undefined;
    }

    async getPlayerCardByContest(contest: IContest, playerID: string): Promise<IPlayerCard> {
        return await this.playerCardService.getPlayerCard(contest, playerID);
    }

    async getContests(): Promise<IContest[]> {
        const now = new Date();
        const contests: IContest[] = [];
        const contestsCached = await this.contestCache.getContests();
        for (let i = 0; i < contestsCached.length; i++) {
            const contest = contestsCached[i];
            if (contest.startTime && contest.startTime.getTime() > now.getTime()) {
                if (this.mergedPlayerInsight.indexOf(contest) < 0) {
                    await this.mergePlayerInsight(contest);
                }
                contests.push(contest);
            }
        }
        return contests;
    }

    private async mergeTeamInsight(contest: IContest, playerMap: PlayerMap): Promise<void> {
        const teamInsight = await this.teamInsightCache.getTeamInsight(contest.contestType, contest.sport);
        const teamPercentilesCache = new Map<string, Map<string, number>>();
        if (teamInsight) {
            // Calculate the minimum and maximum values for all of the positions
            const percentilesCache = new Map<string, PercentileUtil<IPositionPoints>>();
            for (const team of teamInsight) {
                if (team.pointsAllowedPerPosition) {
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
                if (team.pointsAllowedPerPosition) {
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
        playerMap.mergeTeamInsight(teamPercentilesCache);
    }

    private async mergePlayerInsight(contest: IContest): Promise<void> {
        const playerMap = new PlayerMap(contest);
        const playerInsight = await this.playerInsightCache.getPlayerInsight(contest.contestType, contest.sport);
        for (let i = 0; i < playerInsight.length; i++) {
            const player = playerInsight[i];
            await playerMap.mergePlayer(player, this.alternateNameProvider);
        }
        await this.saveMissingPlayers(contest, playerMap, this.alternateNameProvider);
        playerMap.performPlayerCalculations(this.pointsPerDollarMultipliers.get(contest.contestType));
        await this.mergeTeamInsight(contest, playerMap);
        this.mergedPlayerInsight.push(contest);
        contest.playerDataLastUpdateTime = this.playerInsightCache.getLastUpdateTime(contest.contestType, contest.sport);
        contest.playerDataNextUpdateTime = this.playerInsightCache.getNextUpdateTime(contest.contestType, contest.sport);
    }

    private async saveMissingPlayers(contest: IContest, playerMap: PlayerMap, alternateNameProvider: IAlternateNameProvider): Promise<void> {
        const teamCodes: string[] = [];
        const games = contest.games;
        if (Array.isArray(games)) {
            for (let i = 0; i < games.length; i++) {
                const game = games[i];
                if (game.awayTeam) {
                    teamCodes.push(game.awayTeam.code);
                }
                if (game.homeTeam) {
                    teamCodes.push(game.homeTeam.code);
                }
            }
        }
        const missingPlayers = playerMap.unmergedPlayers;
        if (Array.isArray(missingPlayers)) {
            for (let i = 0; i < missingPlayers.length; i++) {
                const missingPlayer = missingPlayers[i];
                if (missingPlayer.team && missingPlayer.name) {
                    if (teamCodes.indexOf(missingPlayer.team) > -1) {
                        await alternateNameProvider.addMissingName(missingPlayer.name, missingPlayer.team, contest.sport);
                    }
                } else {
                    log.error(`Failed to save missing player: name=${missingPlayer.name}, team=${missingPlayer.team}, sport=${contest.sport}`);
                }
            }
        }
        playerMap.clearUnmergedPlayers();
    }

    async cacheUpdated(): Promise<void> {
        if (this.alternateNameProvider) {
            await this.alternateNameProvider.reload();
        }
        const contests = await this.contestCache.getContests();
        for (let i = 0; i < contests.length; i++) {
            const contest = contests[i];
            await this.mergePlayerInsight(contest);
        }
        if (this.alternateNameProvider) {
            await this.alternateNameProvider.saveUpdates();
        }
    }

    async cacheUpdatedForContestTypeAndSport(contestType: ContestType, sport: Sport): Promise<void> {
        const contests = await this.contestCache.getContests();
        for (let i = 0; i < contests.length; i++) {
            const contest = contests[i];
            if (contest.contestType === contestType && contest.sport === sport) {
                await this.mergePlayerInsight(contest);
            }
        }
    }

    destroy(): void {
        this.refresher.cancelAllTimers();
    }
}
