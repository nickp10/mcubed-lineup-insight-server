import insightData, { ContestType, Sport, ITeamInsight } from "mcubed-lineup-insight-data";
import log from "../log";

export default class TeamInsightCache {
    cache: Map<ContestType, Map<Sport, ITeamInsight[]>>;
    lastUpdateTimeMap: Map<ContestType, Map<Sport, Date>>;
    nextUpdateTimeMap: Map<ContestType, Map<Sport, Date>>;

    constructor() {
        this.cache = new Map<ContestType, Map<Sport, ITeamInsight[]>>();
        this.lastUpdateTimeMap = new Map<ContestType, Map<Sport, Date>>();
        this.nextUpdateTimeMap = new Map<ContestType, Map<Sport, Date>>();
    }

    async getTeamInsight(contestType: ContestType, sport: Sport): Promise<ITeamInsight[]> {
        let contestCache = this.cache.get(contestType);
        if (!contestCache) {
            contestCache = new Map<Sport, ITeamInsight[]>();
            this.cache.set(contestType, contestCache);
        }
        let teamInsightCache = contestCache.get(sport);
        if (!teamInsightCache) {
            teamInsightCache = await this.downloadTeamInsight(contestType, sport);
            contestCache.set(sport, teamInsightCache);
        }
        return teamInsightCache;
    }

    async refreshTeamInsight(contestType: ContestType, sport: Sport): Promise<ITeamInsight[]> {
        this.clearTeamInsight(contestType, sport);
        return this.getTeamInsight(contestType, sport);
    }

    clearAllTeamInsight(): void {
        this.cache.clear();
    }

    clearTeamInsight(contestType: ContestType, sport: Sport): void {
        const contestCache = this.cache.get(contestType);
        if (contestCache) {
            contestCache.delete(sport);
        }
    }

    private async downloadTeamInsight(contestType: ContestType, sport: Sport): Promise<ITeamInsight[]> {
        this.setLastUpdateTime(contestType, sport, new Date());
        log.info(`Start retrieving team insight for contestType=${ContestType[contestType]} and sport=${Sport[sport]}`);
        try {
            const teamInsight = await insightData.getTeamInsight(contestType, sport);
            log.info(`Finished retrieving team insight for contestType=${ContestType[contestType]} and sport=${Sport[sport]}`);
            return teamInsight || [];
        } catch (error) {
            log.error(`Could not retrieve team insight for contestType=${ContestType[contestType]} and sport=${Sport[sport]}`);
            log.exception(error);
            return [];
        }
    }

    getLastUpdateTime(contestType: ContestType, sport: Sport): Date {
        const dateCache = this.lastUpdateTimeMap.get(contestType);
        if (dateCache) {
            return dateCache.get(sport);
        }
        return undefined;
    }

    setLastUpdateTime(contestType: ContestType, sport: Sport, lastUpdateTime: Date): void {
        let dateCache = this.lastUpdateTimeMap.get(contestType);
        if (!dateCache) {
            dateCache = new Map<Sport, Date>();
            this.lastUpdateTimeMap.set(contestType, dateCache);
        }
        dateCache.set(sport, lastUpdateTime);
    }

    getNextUpdateTime(contestType: ContestType, sport: Sport): Date {
        const dateCache = this.nextUpdateTimeMap.get(contestType);
        if (dateCache) {
            return dateCache.get(sport);
        }
        return undefined;
    }

    setNextUpdateTime(contestType: ContestType, sport: Sport, nextUpdateTime: Date): void {
        let dateCache = this.nextUpdateTimeMap.get(contestType);
        if (!dateCache) {
            dateCache = new Map<Sport, Date>();
            this.nextUpdateTimeMap.set(contestType, dateCache);
        }
        dateCache.set(sport, nextUpdateTime);
    }
}
