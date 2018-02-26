/// <reference path="../node_modules/mcubed-lineup-insight-data/index.d.ts" />

import insightData from "mcubed-lineup-insight-data";
import * as interfaces from "mcubed-lineup-insight-data/build/interfaces";

export default class LineupAggregator {
    constructor() {
        const aggregator = insightData.getContestList(interfaces.ContestType.FanDuel, interfaces.Sport.NBA).then(contests => {
            contests.forEach(contest => {
                console.log(contest.label);
            });
        });
    }
}