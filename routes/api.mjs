import express from "express";
import { insertOne, find } from "../api/db.mjs";
import { search } from "../api/search.mjs";

const router = express.Router();

router.get("/search", async (req, res) => {
  try {
    res.json(await search(req.body));
  } catch (e) {
    console.error(e);
  }
});

router.get("/db/get/", async (req, res) => {
  try {
    const results = await find();
    res.status(200).send({ response: results });
  } catch (e) {
    console.error(e);
    res.status(400).send({ message: e });
  }
});

router.post("/db/add/", async (req, res) => {
  try {
    const insertedId = await insertOne({ data: req.body.data });
    res.status(200).send({
      message: insertedId,
    });
  } catch (e) {
    console.error(e);
    res.status(400).send({ message: e });
  }
});

export default router;
