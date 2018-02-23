import * as argv from "argv";
import * as utils from "./utils";

class Args {
	port: number;

	constructor() {
		const args = argv
			.option({ name: "port", short: "p", type: "number" })
			.run();
        const argPort = utils.coerceInt(args.options["port"]);
        this.validate(argPort);
	}

	validate(argPort: number): void {
        // Validate port
        this.port = argPort || 8000;
		if (!this.port) {
			console.error("The -p or --port argument must be supplied.");
			process.exit();
		}
	}
}

const args: Args = new Args();
export = args;