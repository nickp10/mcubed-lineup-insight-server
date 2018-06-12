import { IAlternateName, IMissingName } from "./interfaces";
import { MongoClient, Db, ObjectID } from "mongodb";
import log from "./log";

export default class Persistence {
    isValid: boolean;
    client: MongoClient;
    db: Db;

    constructor(private mongoConnectionUrl: string, private mongoDBName: string) {
        this.isValid = !(!this.mongoConnectionUrl || !this.mongoDBName);
    }

    async connectDB(): Promise<Db> {
        if (!this.client) {
            this.client = await MongoClient.connect(this.mongoConnectionUrl);
        }
        if (!this.db) {
            this.db = this.client.db(this.mongoDBName);
        }
        return this.db;
    }

    disconnectDB(): void {
        if (this.db) {
            this.db = undefined;
        }
        if (this.client) {
            this.client.close();
            this.client = undefined;
        }
    }

    async getMissingNames(): Promise<IMissingName[]> {
        return await this.getAll<IMissingName>("lineupmissingnames");
    }

    async deleteMissingNames(): Promise<void> {
        return await this.deleteAll("lineupmissingnames");
    }

	async postMissingNames(missingNames: IterableIterator<IMissingName>): Promise<IMissingName[]> {
        return await this.postMany("lineupmissingnames", missingNames);
	}

    async getAlternateNames(): Promise<IAlternateName[]> {
        return await this.getAll<IAlternateName>("lineupalternatenames");
    }

    async deleteAlternateNames(): Promise<void> {
        return await this.deleteAll("lineupalternatenames");
    }

	async postAlternateNames(alternateNames: IterableIterator<IAlternateName>): Promise<IAlternateName[]> {
        return await this.postMany("lineupalternatenames", alternateNames);
	}

    async deleteAll(table: string): Promise<void> {
        if (!this.isValid) {
            return undefined;
        }
        try {
            const db = await this.connectDB();
            const collections = await db.collections();
            if (collections.find(c => c.collectionName === table)) {
                await db.dropCollection(table);
            }
        } catch (error) {
            log.error(error);
            throw new Error("Cannot delete all the records. Ensure the database is running and the correct database parameters have been specified.");
        }
    }

    async deleteSingle(table: string, id: ObjectID): Promise<void> {
        if (!this.isValid || !id) {
            return undefined;
        }
        try {
            const db = await this.connectDB();
            await db.collection(table).deleteOne({ _id: id });
        } catch (error) {
            log.error(error);
            throw new Error("Cannot delete the specified record. Ensure the database is running and the correct database parameters have been specified.");
        }
    }

    async getAll<T>(table: string): Promise<T[]> {
        if (!this.isValid) {
            return undefined;
        }
        try {
            const db = await this.connectDB();
            const cursor = await db.collection(table).find<T>();
            return await cursor.toArray();
        } catch (error) {
            log.error(error);
            throw new Error("Cannot read all the records. Ensure the database is running and the correct database parameters have been specified.");
        }
    }

    async getAllFiltered<T>(table: string, filter: T): Promise<T[]> {
        if (!this.isValid) {
            return undefined;
        }
        try {
            const db = await this.connectDB();
            const cursor = await db.collection(table).find<T>(filter);
            return await cursor.toArray();
        } catch (error) {
            log.error(error);
            throw new Error("Cannot read the filtered records. Ensure the database is running and the correct database parameters have been specified.");
        }
    }

    async getSingle<T>(table: string, id: ObjectID): Promise<T> {
        if (!this.isValid || !id) {
            return undefined;
        }
        try {
            const db = await this.connectDB();
            return await db.collection(table).findOne<T>({ _id: id });
        } catch (error) {
            log.error(error);
            throw new Error("Cannot read the record with the specified ID. Ensure the database is running and the correct database parameters have been specified.");
        }
    }

    async getSingleFiltered<T>(table: string, filter: T): Promise<T> {
        try {
            const db = await this.connectDB();
            return await db.collection(table).findOne<T>(filter);
        } catch (error) {
            throw error;
        }
    }

    async postSingle<T extends { _id?: ObjectID }>(table: string, item: T): Promise<T> {
        if (!this.isValid || !item || item._id) {
            return item;
        }
        delete item._id;
        try {
            const db = await this.connectDB();
            const result = await db.collection(table).insertOne(item);
            item._id = result.insertedId;
            return item;
        } catch (error) {
            log.error(error);
            throw new Error("Cannot create the specified record. Ensure the database is running and the correct database parameters have been specified.");
        }
    }

    async postMany<T extends { _id?: ObjectID }>(table: string, items: IterableIterator<T>): Promise<T[]> {
        if (!this.isValid || !items) {
            return undefined;
        }
        try {
            const newItems: T[] = [];
            for (const item of items) {
                delete item._id;
                newItems.push(item);
            }
            const db = await this.connectDB();
            const result = await db.collection(table).insertMany(newItems);
            for (let i = 0; i < newItems.length; i++) {
                const newItem = newItems[i];
                newItem._id = result.insertedIds[i];
            }
            return newItems;
        } catch (error) {
            log.error(error);
            throw new Error("Cannot create the specified records. Ensure the database is running and the correct database parameters have been specified.");
        }
    }

    async putSingle<T extends { _id?: ObjectID }>(table: string, item: T): Promise<void> {
        if (!this.isValid || !item || !item._id) {
            return undefined;
        }
        try {
            const db = await this.connectDB();
            await db.collection(table).findOneAndUpdate({ _id: item._id }, { $set: item });
        } catch (error) {
            log.error(error);
            throw new Error("Cannot update the specified record. Ensure the database is running and the correct database parameters have been specified.");
        }
    }
}
