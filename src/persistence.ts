import { Sport } from "mcubed-lineup-insight-data/build/interfaces";
import { IMissingName, IAlternateName } from "./interfaces";
import * as http from "http";
import * as querystring from "querystring";
import log from "./log";

export default class Persistence {
    isValid: boolean;

    constructor(private persistenceServer: string, private persistencePort: number, private persistenceAppName: string, private persistenceAppKey: string) {
        this.isValid = !(!this.persistenceServer || !this.persistencePort || !this.persistenceAppName || !this.persistenceAppKey);
    }

    async getMissingNames(): Promise<IMissingName[]> {
        if (!this.isValid) {
            return undefined;
        }
        try {
            const response = await this.sendRequest({
                path: "/lineupmissingnames",
                method: "GET"
            });
            const missingNames: IMissingName[] = JSON.parse(response);
            if (Array.isArray(missingNames)) {
                return missingNames;
            }
        } catch (error) {
            log.error(error);
        }
        return undefined;
    }

    async deleteMissingNames(): Promise<void> {
        if (!this.isValid) {
            return undefined;
        }
        try {
            await this.sendRequest({
                path: "/lineupmissingnames",
                method: "DELETE"
            });
        } catch (error) {
            log.error(error);
        }
        return undefined;
    }

    async postMissingNames(missingNames: IterableIterator<IMissingName>): Promise<IMissingName[]> {
        if (!this.isValid) {
            return undefined;
        }
        try {
            const response = await this.sendRequest({
                path: "/lineupmissingnames",
                method: "POST"
            }, JSON.stringify([...missingNames]));
            const missingNamesWithIDs: IMissingName[] = JSON.parse(response);
            if (Array.isArray(missingNamesWithIDs)) {
                return missingNamesWithIDs;
            }
        } catch (error) {
            log.error(error);
        }
        return undefined;
    }

    async getAlternateNames(): Promise<IAlternateName[]> {
        if (!this.isValid) {
            return undefined;
        }
        try {
            const response = await this.sendRequest({
                path: "/lineupalternatenames",
                method: "GET"
            });
            const alternateNames: IAlternateName[] = JSON.parse(response);
            if (Array.isArray(alternateNames)) {
                return alternateNames;
            }
        } catch (error) {
            log.error(error);
        }
        return undefined;
    }

    async deleteAlternateNames(): Promise<void> {
        if (!this.isValid) {
            return undefined;
        }
        try {
            await this.sendRequest({
                path: "/lineupalternatenames",
                method: "DELETE"
            });
        } catch (error) {
            log.error(error);
        }
        return undefined;
    }

    async postAlternateNames(alternateNames: IterableIterator<IAlternateName>): Promise<IAlternateName[]> {
        if (!this.isValid) {
            return undefined;
        }
        try {
            const response = await this.sendRequest({
                path: "/lineupalternatenames",
                method: "POST"
            }, JSON.stringify([...alternateNames]));
            const alternateNamesWithIDs: IAlternateName[] = JSON.parse(response);
            if (Array.isArray(alternateNamesWithIDs)) {
                return alternateNamesWithIDs;
            }
        } catch (error) {
            log.error(error);
        }
        return undefined;
    }

    async sendRequest(request: http.RequestOptions, data?: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const headers = request.headers || { };
            if (data) {
                headers["content-type"] = "application/json";
                headers["content-length"] = data.length;
            }
            headers["mcubed-app-name"] = this.persistenceAppName;
            headers["mcubed-app-key"] = this.persistenceAppKey;
            request.headers = headers;
            request.host = this.persistenceServer;
            request.port = this.persistencePort;
            const req = http.request(request, resp => {
                let body = "";
                resp.on("data", data => {
                    body += data;
                });
                resp.on("end", () => {
                    if (resp.statusCode === 200 || resp.statusCode === 201 || resp.statusCode === 202) {
                        resolve(body);
                    } else {
                        const errorObj = JSON.parse(body);
                        if (errorObj && errorObj.error) {
                            reject(errorObj.error);
                        } else {
                            reject(body);
                        }
                    }
                });
            }).on("error", error => {
                reject(error.message);
            });
            if (data) {
                req.write(data);
            }
            req.end();
        });
    }
}
