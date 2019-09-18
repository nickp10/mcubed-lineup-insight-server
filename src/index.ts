import AlternateNameProvider from "./model/alternateNameProvider";
import args from "./args";
import * as express from "express";
import { IServerContestSummary } from "./interfaces";
import LineupAggregator from "./lineup/lineupAggregator";
import log from "./log";

const lineupAggegator = new LineupAggregator(new AlternateNameProvider());
const app = express();
app.get("/contest-list/full", async (req, res) => {
    log.info(`GET - Contest list containing player and team insight`);
    const contests = await lineupAggegator.getContests();
    res.status(200).send(contests);
});
app.get("/contest-list/summary", async (req, res) => {
    log.info(`GET - Contest list containing summary information only`);
    const contests = await lineupAggegator.getContests();
    const summaryContests = contests.map<IServerContestSummary>(c => {
        return {
            contestType: c.contestType,
            ID: c.ID,
            label: c.label,
            sport: c.sport,
            startTime: c.startTime
        };
    });
    res.status(200).send(summaryContests);
});
app.get("/contest-data/:contestID", async (req, res) => {
    const contestID = req.params.contestID;
    log.info(`GET - Contest data with player insight merged for contestID=${contestID}`);
    const contests = await lineupAggegator.getContests();
    const contest = contests.find(c => c.ID === contestID);
    if (contest) {
        res.status(200).send(contest);
    } else {
        res.status(404);
    }
});
app.get("/player-card/:contestID/:playerID", async (req, res) => {
    const contestID = req.params.contestID;
    const playerID = req.params.playerID;
    log.info(`GET - Player card for contestID=${contestID} and playerID=${playerID}`);
    const playerCard = await lineupAggegator.getPlayerCardByContestID(contestID, playerID);
    if (playerCard) {
        res.status(200).send(playerCard);
    } else {
        res.status(404);
    }
});
app.listen(args.port, async () => {
    await lineupAggegator.start();
    log.info(`Server has started on port ${args.port}`);
});
