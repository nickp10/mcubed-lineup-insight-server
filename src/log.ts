import * as moment from "moment";

export class Log {
    formatMessage(message: string): string {
        const now = moment();
        return `${now.format("MM/DD/YYYY HH:mm:ss.SSS")} - ${message}`;
    }

    error(message: string): void {
        console.error(this.formatMessage(message));
    }

    info(message: string): void {
        console.log(this.formatMessage(message));
    }
}

export default new Log();
