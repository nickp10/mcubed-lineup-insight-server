import { IAlternateName, IAlternateNameProvider, IMissingName } from "../interfaces";
import { Sport } from "mcubed-lineup-insight-data/build/interfaces";
import args from "../args";
import log from "../log";
import Persistence from "../persistence";

export default class AlternateNameProvider implements IAlternateNameProvider {
    alternateNames: Map<string, IAlternateName>;
    missingNames: Map<string, IMissingName>;
    persistence: Persistence;
    hasAlternateNameUpdates: boolean;
    hasMissingNameUpdates: boolean;

    constructor() {
        this.alternateNames = new Map<string, IAlternateName>();
        this.missingNames = new Map<string, IMissingName>();
        this.persistence = new Persistence(args.mongoConnectionUrl, args.mongoDBName);
    }

    async addMissingName(name: string, team: string, sport: Sport): Promise<void> {
        const existingMissingName = this.getMissingName(name);
        if (existingMissingName) {
            if (existingMissingName.count) {
                existingMissingName.count++;
            } else {
                existingMissingName.count = 1;
            }
            existingMissingName.team = team;
            existingMissingName.sport = sport;
            this.hasMissingNameUpdates = true;
        } else {
            const newMissingName: IMissingName = {
                count: 1,
                name: name,
                team: team,
                sport: sport
            };
            this.missingNames.set(name.toLowerCase(), newMissingName);
            this.hasMissingNameUpdates = true;
        }
    }

    async alternateNameUsed(name: IAlternateName): Promise<void> {
        name.lastUsedDate = new Date();
        this.hasAlternateNameUpdates = true;
    }

    getAlternateName(name: string): IAlternateName {
        if (name) {
            return this.alternateNames.get(name.toLowerCase());
        }
        return undefined;
    }

    getMissingName(name: string): IMissingName {
        if (name) {
            return this.missingNames.get(name.toLowerCase());
        }
        return undefined;
    }

    async reload(): Promise<void> {
        log.info("Reloading the cache of alternate and missing names");
        this.alternateNames.clear();
        const alternateNames = await this.persistence.getAlternateNames();
        if (Array.isArray(alternateNames)) {
            for (let i = 0; i < alternateNames.length; i++) {
                const alternateName = alternateNames[i];
                if (alternateName.contestName && alternateName.externalName) {
                    this.alternateNames.set(alternateName.externalName.toLowerCase(), alternateName);
                }
            }
        }
        this.missingNames.clear();
        const missingNames = await this.persistence.getMissingNames();
        if (Array.isArray(missingNames)) {
            for (let i = 0; i < missingNames.length; i++) {
                const missingName = missingNames[i];
                if (missingName.name) {
                    this.missingNames.set(missingName.name.toLowerCase(), missingName);
                }
            }
        }
        log.info("Reloaded the cache of alternate and missing names");
    }

    async saveUpdates(): Promise<void> {
        await this.saveAlternateNamesUpdates();
        await this.saveMissingNamesUpdates();
    }

    private async saveAlternateNamesUpdates(): Promise<void> {
        if (this.hasAlternateNameUpdates) {
            log.info("Saving updates to the alternate names");
            try {
                await this.persistence.deleteAlternateNames();
                await this.persistence.postAlternateNames(this.alternateNames.values());
                log.info("Saved updates to the alternate names");
            } catch (error) {
                log.error(error);
            }
        }
        this.hasAlternateNameUpdates = false;
    }

    private async saveMissingNamesUpdates(): Promise<void> {
        if (this.hasMissingNameUpdates) {
            log.info("Saving updates to the missing names");
            try {
                await this.persistence.deleteMissingNames();
                await this.persistence.postMissingNames(this.missingNames.values());
                log.info("Saved updates to the missing names");
            } catch (error) {
                log.error(error);
            }
        }
        this.hasMissingNameUpdates = false;
    }
}