import insightData, { ContestType, Sport, IPlayer } from "mcubed-lineup-insight-data";
import log from "../log";

export default class PlayerInsightCache {
    cache: Map<ContestType, Map<Sport, IPlayer[]>>;
    lastUpdateTimeMap: Map<ContestType, Map<Sport, Date>>;
    nextUpdateTimeMap: Map<ContestType, Map<Sport, Date>>;

    constructor() {
        this.cache = new Map<ContestType, Map<Sport, IPlayer[]>>();
        this.lastUpdateTimeMap = new Map<ContestType, Map<Sport, Date>>();
        this.nextUpdateTimeMap = new Map<ContestType, Map<Sport, Date>>();
    }

    async getPlayerInsight(contestType: ContestType, sport: Sport): Promise<IPlayer[]> {
        let contestCache = this.cache.get(contestType);
        if (!contestCache) {
            contestCache = new Map<Sport, IPlayer[]>();
            this.cache.set(contestType, contestCache);
        }
        let playersCache = contestCache.get(sport);
        if (!playersCache) {
            playersCache = await this.downloadPlayerInsight(contestType, sport);
            contestCache.set(sport, playersCache);
        }
        return playersCache;
    }

    async refreshPlayerInsight(contestType: ContestType, sport: Sport): Promise<IPlayer[]> {
        this.clearPlayerInsight(contestType, sport);
        return this.getPlayerInsight(contestType, sport);
    }

    clearAllPlayerInsight(): void {
        this.cache.clear();
    }

    clearPlayerInsight(contestType: ContestType, sport: Sport): void {
        const contestCache = this.cache.get(contestType);
        if (contestCache) {
            contestCache.delete(sport);
        }
    }

    private async downloadPlayerInsight(contestType: ContestType, sport: Sport): Promise<IPlayer[]> {
        this.setLastUpdateTime(contestType, sport, new Date());
        log.info(`Start retrieving player insight for contestType=${ContestType[contestType]} and sport=${Sport[sport]}`);
        try {
            const playerInsight = await insightData.getPlayerInsight(contestType, sport);
            log.info(`Finished retrieving player insight for contestType=${ContestType[contestType]} and sport=${Sport[sport]}`);
            return playerInsight || [];
        } catch (error) {
            log.error(`Could not retrieve player insight for contestType=${ContestType[contestType]} and sport=${Sport[sport]}`);
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
