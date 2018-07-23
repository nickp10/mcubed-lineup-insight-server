import { IContest } from "mcubed-lineup-insight-data/build/interfaces";
import insightData from "mcubed-lineup-insight-data";
import log from "../log";

export default class ContestCache {
    contests: IContest[];
    lastUpdateTime: Date;
    nextUpdateTime: Date;

    async getContests(): Promise<IContest[]> {
        if (!this.contests) {
            this.contests = await this.downloadContests();
        }
        return this.contests;
    }

    async refreshContests(): Promise<IContest[]> {
        this.contests = undefined;
        return this.getContests();
    }

    private async downloadContests(): Promise<IContest[]> {
        this.lastUpdateTime = new Date();
        log.info(`Start retrieving contest list`);
        try {
            const contests = await insightData.getContestList();
            log.info(`Finished retrieving contest list`);
            return contests || [];
        } catch (error) {
            log.error(`Could not retrieve contest list`);
            log.exception(error);
            return [];
        }
    }
}
