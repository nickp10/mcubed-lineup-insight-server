#! /usr/bin/env node

import * as args from "./args";
import * as express from "express";

const app = express();
app.listen(args.port, () => {
    console.log(`Server has started on port ${args.port}`);
});
