import { getDB } from "../database.mjs";

const insertOne = async (insertData) => {
  const db = await getDB();
  const testCollection = db.collection("test");
  const response = await testCollection.insertOne(insertData);
  return response.insertedId;
};

const insertReview = async (insertData) => {
  const db = await getDB();
  const testCollection = db.collection("reviews");
  const response = await testCollection.insertOne(insertData);
  return response.insertedId;
};

const find = async () => {
  const db = await getDB();
  const testCollection = db.collection("test");
  const cursor = testCollection.find();
  return await cursor.toArray();
};

export { insertOne, find, insertReview };
