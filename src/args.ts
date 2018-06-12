import * as argv from "argv";
import utils from "./utils";

export class Args {
    port: number;
    mongoConnectionUrl: string;
    mongoDBName: string;

    constructor() {
        const args = argv
            .option({ name: "port", short: "p", type: "number" })
            .option({ name: "mongoConnectionUrl", type: "string" })
            .option({ name: "mongoDBName", type: "string" })
            .run();
        const argPort = utils.coerceInt(args.options["port"]);
        const argMongoConnectionUrl = args.options["mongoConnectionUrl"];
        const argMongoDBName = args.options["mongoDBName"];
        this.validate(argPort, argMongoConnectionUrl, argMongoDBName);
    }

    validate(argPort: number, argMongoConnectionUrl: string, argMongoDBName: string): void {
        // Validate port
        this.port = argPort || 8000;
        if (!this.port) {
            console.error("The -p or --port argument must be supplied.");
            process.exit();
        }

        // Validate MongoDB options
        this.mongoConnectionUrl = argMongoConnectionUrl;
        this.mongoDBName = argMongoDBName;
    }
}

export default new Args();
