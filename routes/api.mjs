import express from "express";
import { insertOne, find } from "../api/db.mjs";
import { search } from "../api/search.mjs";
import {
  autocompleteLocation,
  autocompleteSearch,
} from "../api/autocomplete.mjs";
import { detailLocation, detailStore } from "../api/detail.mjs";
import { setLocation } from "../api/set.mjs";

const router = express.Router();

router.post("/set/location", async (req, res) => {
  res.setHeader("Set-Cookie", await setLocation(req.body));
  res.send();
});

router.post("/detail/location", async (req, res) => {
  res.json(await detailLocation(req.body));
});

router.post("/detail/store", async (req, res) => {
  res.json(
    await detailStore({ service: req.body.service, storeId: req.body.storeId })
  );
});

router.post("/autocomplete/location", async (req, res) => {
  res.json(await autocompleteLocation(req.body.query));
});

router.post("/autocomplete/search", async (req, res) => {
  try {
    const requestCookies = req.cookies;
    if (requestCookies["uev2.loc"] === undefined) {
      res.status(400);
      res.json({ error: "missing location data cookie, set location first." })
        .end;
    }
    const { data, responseCookies } = await autocompleteSearch(
      req.body.query,
      requestCookies
    );
    res.setHeader("Set-Cookie", responseCookies);
    res.json(data);
  } catch (e) {
    console.error(e);
  }
});

router.post("/search", async (req, res) => {
  try {
    const requestCookies = req.cookies;
    if (requestCookies["uev2.loc"] === undefined) {
      res.status(400);
      res.json({ error: "missing location data cookie, set location first." })
        .end;
    }
    const { data, responseCookies } = await search(req.body, requestCookies);
    res.setHeader("Set-Cookie", responseCookies);
    res.json(data);
  } catch (e) {
    console.error(e);
  }
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
