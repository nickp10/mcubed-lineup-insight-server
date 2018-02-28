#! /usr/bin/env node
import "babel-polyfill";

import AlternateNameProvider from "./model/alternateNameProvider";
import args from "./args";
import * as express from "express";
import LineupAggregator from "./lineup/lineupAggregator";
import log from "./log";

const lineupAggegator = new LineupAggregator(new AlternateNameProvider());
const app = express();
app.get("/", async (req, res) => {
    log.info(`GET - Contest list with player insight merged`);
    const contests = await lineupAggegator.getContests();
    res.status(200).send(contests);
})
app.get("/:contestID/:playerID", async (req, res) => {
    const contestID = req.params.contestID;
    const playerID = req.params.playerID;
    log.info(`GET - Player card for contestID=${contestID} and playerID=${playerID}`);
    const playerCard = await lineupAggegator.getPlayerCardByContestID(contestID, playerID);
    res.status(200).send(playerCard);
});
app.listen(args.port, async () => {
    await lineupAggegator.start();
    log.info(`Server has started on port ${args.port}`);
});
