import * as argv from "argv";
import utils from "./utils";

export class Args {
    port: number;
    persistenceServer: string;
    persistencePort: number;
    persistenceAppName: string;
    persistenceAppKey: string;

    constructor() {
        const args = argv
            .option({ name: "port", short: "p", type: "number" })
            .option({ name: "persistenceServer", type: "string" })
            .option({ name: "persistencePort", type: "number" })
            .option({ name: "persistenceAppName", type: "string" })
            .option({ name: "persistenceAppKey", type: "string" })
            .run();
        const argPort = utils.coerceInt(args.options["port"]);
        const argPersistenceServer = args.options["persistenceServer"];
        const argPersistencePort = utils.coerceInt(args.options["persistencePort"]);
        const argPersistenceAppName = args.options["persistenceAppName"];
        const argPersistenceAppKey = args.options["persistenceAppKey"];
        this.validate(argPort, argPersistenceServer, argPersistencePort, argPersistenceAppName, argPersistenceAppKey);
    }

    validate(argPort: number, argPersistenceServer: string, argPersistencePort: number, argPersistenceAppName: string, argPersistenceAppKey: string): void {
        // Validate port
        this.port = argPort || 8000;
        if (!this.port) {
            console.error("The -p or --port argument must be supplied.");
            process.exit();
        }

        // Validate persistence options
        this.persistenceServer = argPersistenceServer;
        this.persistencePort = argPersistencePort;
        this.persistenceAppName = argPersistenceAppName;
        this.persistenceAppKey = argPersistenceAppKey;
    }
}

const args: Args = new Args();
export default args;