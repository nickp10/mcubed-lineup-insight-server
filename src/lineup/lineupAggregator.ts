import { IAlternateNameProvider, IServerContest } from "../interfaces";
import { IContest, IPlayerCard, ContestType, Sport } from "mcubed-lineup-insight-data";
import CacheRefresher from "./cacheRefresher";
import ContestCache from "./contestCache";
import PlayerInsightCache from "./playerInsightCache";
import PlayerCardService from "./playerCardService";
import ServerContestCreator from "./serverContestCreator";
import TeamInsightCache from "./teamInsightCache";

export default class LineupAggregator {
    private alternateNameProvider: IAlternateNameProvider;
    private contestCache: ContestCache;
    private playerCardService: PlayerCardService;
    private playerInsightCache: PlayerInsightCache;
    private refresher: CacheRefresher;
    private serverContests: Map<string, IServerContest>;
    private teamInsightCache: TeamInsightCache;

    constructor(alternateNameProvider: IAlternateNameProvider) {
        this.alternateNameProvider = alternateNameProvider;
        this.contestCache = new ContestCache();
        this.playerCardService = new PlayerCardService();
        this.playerInsightCache = new PlayerInsightCache();
        this.teamInsightCache = new TeamInsightCache();
        this.refresher = new CacheRefresher(this, this.contestCache, this.playerInsightCache, this.teamInsightCache);
        this.serverContests = new Map<string, IServerContest>();
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

    async getContests(): Promise<IServerContest[]> {
        const now = new Date();
        const serverContests: IServerContest[] = [];
        const cachedContests = await this.contestCache.getContests();
        for (let i = 0; i < cachedContests.length; i++) {
            const cachedContest = cachedContests[i];
            if (cachedContest.startTime && cachedContest.startTime.getTime() > now.getTime()) {
                let serverContest = this.serverContests.get(cachedContest.ID);
                if (!serverContest) {
                    serverContest = await this.createServerContest(cachedContest);
                    this.serverContests.set(cachedContest.ID, serverContest);
                }
                serverContests.push(serverContest);
            }
        }
        return serverContests;
    }

    private async createServerContest(cachedContest: IContest): Promise<IServerContest> {
        const creator = new ServerContestCreator(cachedContest, this.playerInsightCache, this.teamInsightCache, this.alternateNameProvider);
        return await creator.createServerContest();
    }

    async cacheUpdated(): Promise<void> {
        if (this.alternateNameProvider) {
            await this.alternateNameProvider.reload();
        }
        this.serverContests.clear();
        const cachedContests = await this.contestCache.getContests();
        for (const cachedContest of cachedContests) {
            const serverContest = await this.createServerContest(cachedContest);
            this.serverContests.set(cachedContest.ID, serverContest);
        }
        if (this.alternateNameProvider) {
            await this.alternateNameProvider.saveUpdates();
        }
    }

    async cacheUpdatedForContestTypeAndSport(contestType: ContestType, sport: Sport): Promise<void> {
        const cachedContests = await this.contestCache.getContests();
        for (const cachedContest of cachedContests) {
            if (cachedContest.contestType === contestType && cachedContest.sport === sport) {
                const serverContest = await this.createServerContest(cachedContest);
                this.serverContests.set(cachedContest.ID, serverContest);
            }
        }
    }

    destroy(): void {
        this.refresher.cancelAllTimers();
    }
}
