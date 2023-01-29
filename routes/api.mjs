import express from "express";
import { insertOne, find } from "../api/db.mjs";
import { search } from "../api/search.mjs";
import { autocompleteLocation } from "../api/autocomplete.mjs";
import { detailLocation } from "../api/detail.mjs";
import { setLocation } from "../api/set.mjs";

const router = express.Router();

router.post("/set/location", async (req, res) => {
  res.setHeader("Set-Cookie", await setLocation(req.body));
  res.send();
});

router.get("/detail/location", async (req, res) => {
  res.json(await detailLocation(req.body));
});

router.get("/autocomplete/location", async (req, res) => {
  res.json(await autocompleteLocation(req.body.query));
});

router.get("/search", async (req, res) => {
  const requestCookies = req.cookies;
  if (requestCookies["uev2.loc"] === undefined) {
    res.status(400);
    res.json({ error: "missing location data cookie, set location first." })
      .end;
  }
  const { data, responseCookies } = await search(req.body, requestCookies);
  res.setHeader("Set-Cookie", responseCookies);
  res.json(data);
});

router.get("/db/get/", async (req, res) => {
  const results = await find();
  res.status(200).send({ response: results });
});

router.post("/db/add/", async (req, res) => {
  const insertedId = await insertOne({ data: req.body.data });
  res.status(200).send({
    message: insertedId,
  });
});

export default router;
