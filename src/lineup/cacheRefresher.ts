import { ContestType, Sport, IContest } from "mcubed-lineup-insight-data/build/interfaces";
import ContestCache from "./contestCache";
import LineupAggregator from "./lineupAggregator";
import log from "../log";
import * as moment from "moment";
import PlayerInsightCache from "./playerInsightCache";

export default class CacheRefresher {
    contestCache: ContestCache;
    contestCacheTimer: NodeJS.Timer;
    lineupAggregator: LineupAggregator;
    playerInsightCache: PlayerInsightCache;
    playerInsightCacheTimers: Map<ContestType, Map<Sport, NodeJS.Timer>>;

    constructor(lineupAggregator: LineupAggregator, contestCache: ContestCache, playerInsightCache: PlayerInsightCache) {
        this.lineupAggregator = lineupAggregator;
        this.contestCache = contestCache;
        this.playerInsightCache = playerInsightCache;
        this.playerInsightCacheTimers = new Map<ContestType, Map<Sport, NodeJS.Timer>>();
    }

    cancelAllTimers(): void {
        if (this.contestCacheTimer) {
            clearTimeout(this.contestCacheTimer);
            this.contestCacheTimer = undefined;
        }
        for (const [contestType, contestTimers] of this.playerInsightCacheTimers.entries()) {
            for (const [sport, timer] of contestTimers.entries()) {
                clearTimeout(timer);
            }
        }
        this.playerInsightCacheTimers.clear();
    }

    async refreshAllData(): Promise<void> {
        this.cancelAllTimers();
        this.playerInsightCache.clearAllPlayerInsight();
        await this.refreshContestCache();
    }

    async refreshContestCache(): Promise<void> {
        // Cancel previous timer
        if (this.contestCacheTimer) {
            clearTimeout(this.contestCacheTimer);
            this.contestCacheTimer = undefined;
        }

        // Create new timer
        this.setupContestCacheTimer();

        // Refresh data
        const contests = await this.contestCache.refreshContests();
        this.setupPlayerInsightCacheTimers(contests);
        await this.lineupAggregator.cacheUpdated();
    }

    async refreshPlayerInsightCache(contestType: ContestType, sport: Sport): Promise<void> {
        // Cancel previous timer
        const contestTimers = this.getContestTimers(contestType);
        const timer = contestTimers.get(sport);
        if (timer) {
            clearTimeout(timer);
            contestTimers.delete(sport);
        }

        // Create new timer
        const contests = await this.contestCache.getContests();
        this.setupPlayerInsightCacheTimers(contests);

        // Refresh data
        await this.playerInsightCache.refreshPlayerInsight(contestType, sport);
        await this.lineupAggregator.cacheUpdatedForContestTypeAndSport(contestType, sport);
    }

    getContestTimers(contestType: ContestType): Map<Sport, NodeJS.Timer> {
        const contestTimers = this.playerInsightCacheTimers.get(contestType);
        if (!contestTimers) {
            const newContestTimers = new Map<Sport, NodeJS.Timer>();
            this.playerInsightCacheTimers.set(contestType, newContestTimers);
            return newContestTimers;
        }
        return contestTimers;
    }

    setupContestCacheTimer(): void {
        const now = new Date();
        const nextUpdateTime = this.getNextContestUpdateTime(now);
        const nextUpdateMoment = moment(nextUpdateTime);
        log.info(`Contest list will refresh at ${nextUpdateMoment.format("MM/DD/YYYY HH:mm:ss.SSS")}`);
        this.contestCacheTimer = setTimeout(async () => {
            await this.refreshContestCache();
        }, nextUpdateTime.getTime() - now.getTime());
        this.contestCache.nextUpdateTime = nextUpdateTime;
    }

    setupPlayerInsightCacheTimers(contests: IContest[]): void {
        const now = new Date();
        const sortedContests = [...contests].sort(this.compareContestStartTime);
        for (let i = 0; i < sortedContests.length; i++) {
            const contest = sortedContests[i];
            const startTime = contest.startTime;
            if (startTime) {
                const contestTimers = this.getContestTimers(contest.contestType);
                const timer = contestTimers.get(contest.sport);
                if (!timer) {
                    const nextUpdateTime = this.getNextPlayerInsightUpdateTime(now, startTime);
                    if (nextUpdateTime) {
                        const nextUpdateMoment = moment(nextUpdateTime);
                        log.info(`Player insight for contestType=${ContestType[contest.contestType]} and sport=${Sport[contest.sport]} will refresh at ${nextUpdateMoment.format("MM/DD/YYYY HH:mm:ss.SSS")}`);
                        const playerInsightTimer = setTimeout(async () => {
                            await this.refreshPlayerInsightCache(contest.contestType, contest.sport);
                        }, nextUpdateTime.getTime() - now.getTime());
                        contestTimers.set(contest.sport, playerInsightTimer);
                        this.playerInsightCache.setNextUpdateTime(contest.contestType, contest.sport, nextUpdateTime);
                    }
                }
            }
        }
    }

    private contestUpdateHours: number[] = [ 0, 1, 2, 3, 5, 9, 13, 17, 19, 21, 23 ];
    private getNextContestUpdateTime(now: Date): Date {
        const nowMoment = moment(now);
        const hour = nowMoment.hour();
        let nextHour = this.contestUpdateHours[0];
        for (let i = 0; i < this.contestUpdateHours.length; i++) {
            const contestUpdateHour = this.contestUpdateHours[i];
            if (contestUpdateHour > hour) {
                nextHour = contestUpdateHour;
                break;
            }
        }
        const updateMoment = moment(now);
        if (hour > nextHour) {
            updateMoment.add(1, "days");
        }
        updateMoment.hour(nextHour);
        updateMoment.minute(0);
        updateMoment.second(0);
        updateMoment.millisecond(0);
        return updateMoment.toDate();
    }

    private millisInHour: number = 3600000;
    private millisInMinute: number = 60000;
    getNextPlayerInsightUpdateTime(now: Date, contestStartTime: Date): Date {
        const millisUntilContestStarts = contestStartTime.getTime() - now.getTime();
        if (millisUntilContestStarts > (15 * this.millisInHour)) {
            // More than 15 hours until contest starts
            // Set next update for 14 hours before contest start
            const hoursUntilContestStarts = Math.floor(millisUntilContestStarts / this.millisInHour);
            const hoursMultiplier = Math.floor(hoursUntilContestStarts / 14);
            const startTimeMoment = moment(contestStartTime);
            startTimeMoment.subtract(14 * hoursMultiplier, "hours");
            startTimeMoment.minute(0);
            startTimeMoment.second(0);
            startTimeMoment.millisecond(0);
            return startTimeMoment.toDate();
        } else if (millisUntilContestStarts > (90 * this.millisInMinute)) {
            // More than 1.5 hours until contest starts
            // Set next update for 1 hour in the future
            const nowMoment = moment(now);
            nowMoment.add(1, "hours");
            if (nowMoment.minute() === 59) {
                nowMoment.add(1, "minutes");
            }
            nowMoment.minute(0);
            nowMoment.second(0);
            nowMoment.millisecond(0);
            return nowMoment.toDate();
        } else if (millisUntilContestStarts > (15 * this.millisInMinute)) {
            // More than 15 minutes until contest starts
            // Set next update for 15 minute intervals before contest start
            const nowMoment = moment(now);
            const nowMinute = nowMoment.minute() + 1;
            const remainder = nowMinute % 15;
            const minutesUntilNextInterval = 16 - remainder;
            nowMoment.add(minutesUntilNextInterval, "minutes");
            nowMoment.second(0);
            nowMoment.millisecond(0);
            return nowMoment.toDate();
        } else if (millisUntilContestStarts > (6 * this.millisInMinute)) {
            // More than 6 minutes until contest starts
            // Set next update for 5 minutes before contest start
            const startTimeMoment = moment(contestStartTime);
            startTimeMoment.subtract(5, "minutes");
            startTimeMoment.second(0);
            startTimeMoment.millisecond(0);
            return startTimeMoment.toDate();
        }
        return undefined;
    }

    compareContestStartTime(contest1: IContest, contest2: IContest): number {
        if (!contest1) {
            return contest2 ? -1 : 0;
        } else if (!contest2) {
            return 1;
        } else {
            const date1 = contest1.startTime;
            const date2 = contest2.startTime;
            if (!date1) {
                return date2 ? -1 : 0;
            } else if (!date2) {
                return 1;
            } else {
                return date1.getTime() - date2.getTime();
            }
        }
    }
}