import { getDB } from "../database.mjs";

const insertOne = async (insertData, res) => {
    try {
        const db = await getDB();
        const testCollection = db.collection("test");
        const response = await testCollection.insertOne(insertData);
        return response.insertedId;
    } catch (e) {
        throw e;
    }
};

const find = async (res) => {
    try {
        const db = await getDB();
        const testCollection = db.collection("test");
        const cursor = testCollection.find();
        return await cursor.toArray();
    } catch (e) {
        throw e;
    }
};

export { insertOne, find };
