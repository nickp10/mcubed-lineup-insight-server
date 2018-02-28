import { IAlternateName, IAlternateNameProvider, IMissingName } from "../interfaces";
import { Sport } from "mcubed-lineup-insight-data/build/interfaces";

export default class AlternateNameProvider implements IAlternateNameProvider {
    alternateNames: Map<string, string>;

    constructor() {
        this.alternateNames = new Map<string, string>();
    }

    async addMissingName(sport: Sport, name: string, team: string): Promise<void> {
        const existingMissingName: IMissingName = undefined; // TODO Get missingNames by name=name
        if (existingMissingName) {
            if (existingMissingName.count) {
                existingMissingName.count++;
            } else {
                existingMissingName.count = 1;
            }
            // TODO Save existingMissingName
        } else {
            const newMissingName: IMissingName = {
                count: 1,
                name: name,
                team: team,
                sport: sport
            };
            // TODO Save newMissingName
        }
    }

    async alternateNameUsed(name: string): Promise<void> {
        const alternameName: IAlternateName = undefined; // TODO Get alternateNames by externalName=name (case-insensitive)
        if (alternameName) {
            alternameName.lastUsedDate = new Date();
            // TODO Save alternateName
        }
    }

    async getAlternateName(name: string): Promise<string> {
        if (name) {
            return this.alternateNames.get(name.toLowerCase());
        }
        return undefined;
    }

    async reload(): Promise<void> {
        this.alternateNames.clear();
        const alternateNames: IAlternateName[] = undefined; // TODO Get alternateNames
        if (Array.isArray(alternateNames)) {
            for (let i = 0; i < alternateNames.length; i++) {
                const alternateName = alternateNames[i];
                if (alternateName.contestName && alternateName.externalName) {
                    this.alternateNames.set(alternateName.externalName.toLowerCase(), alternateName.contestName);
                }
            }
        }
    }
}