import { Router } from "express";
import { insertOne, find, insertReview } from "../api/db.mjs";

const dbRouter = Router();

dbRouter.get("/get", async (req, res) => {
  const results = await find();
  res.status(200).send({ response: results });
});

dbRouter.post("/add", async (req, res) => {
  const insertedId = await insertOne({ data: req.body.data });
  res.status(200).send({
    message: insertedId,
  });
});

dbRouter.post("/addReview", async (req, res) => {
  const insertedId = await insertReview({ data: req.body.data });
  res.status(200).send({
    message: insertedId,
  });
});

export default dbRouter;
