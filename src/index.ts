#! /usr/bin/env node

import args from "./args";
import * as express from "express";
import LineupAggregator from "./lineupAggregator";

const app = express();
app.get("/", (req, res) => {
    new LineupAggregator();
    res.sendStatus(200);
})
app.get("/:contestId/:playerId", (req, res) => {
    const contestId = req.params.contestId;
    const playerId = req.params.playerId;
    res.sendStatus(200);
});
app.listen(args.port, () => {
    console.log(`Server has started on port ${args.port}`);
});
