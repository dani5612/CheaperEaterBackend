import { MongoClient } from "mongodb";
import "dotenv/config";

const client = new MongoClient(process.env.MONGO_URI);
const getDB = async () => {
    try {
        const connection = await client.connect();
        return connection.db("cheapereater");
    } catch (e) {
        console.log(e);
    }
};

const closeDB = async () => {
    try {
        await client.close();
    } catch (e) {
        console.log(e);
    }
};

export { getDB, closeDB };
