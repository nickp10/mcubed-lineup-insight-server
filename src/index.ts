#! /usr/bin/env node

import * as args from "./args";
import * as express from "express";

const app = express();
app.get("/", (req, res) => {
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
