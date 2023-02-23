import { env } from "node:process";
import jwt from "jsonwebtoken";
import express from "express";
import { insertOne, find, insertReview, insertSignUp } from "../api/db.mjs";
import { search } from "../api/search.mjs";
import {
  autocompleteLocation,
  autocompleteSearch,
} from "../api/autocomplete.mjs";
import { detailLocation, detailStore } from "../api/detail.mjs";
import { setLocation } from "../api/set.mjs";
import { popularRestaurants } from "../api/get.mjs";
import { register, login, logout } from "../api/auth.mjs";

const router = express.Router();

const authenticateUser = (req, res, next) => {
  const auth = req.headers.authorization;
  const token = auth && auth.split(" ")[1];
  if (!token) {
    res.sendStatus(401);
  }
  jwt.verify(token, env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      res.sendStatus(403);
    } else {
      req.user = user;
      next();
    }
  });
};

router.post("/auth/register", (req, res) => {
  res.json(register(req.body));
});

router.post("/auth/login", async (req, res) => {
  res.json(await login(req.body));
});

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

router.post("/autocomplete/search", authenticateUser, async (req, res) => {
  try {
    const requestCookies = req.cookies;
    const { locationRes, exists } = doesLocationCookieExist(res, req);
    res = locationRes;

    if (exists) {
      const { data, responseCookies } = await autocompleteSearch(
        req.body.query,
        requestCookies
      );
      res.setHeader("Set-Cookie", responseCookies);
      res.json(data);
    }
  } catch (e) {
    console.error(e);
  }
});

router.post("/search", async (req, res) => {
  try {
    const requestCookies = req.cookies;
    const { locationRes, exists } = doesLocationCookieExist(res, req);
    res = locationRes;
    if (exists) {
      const { data, responseCookies } = await search(req.body, requestCookies);
      res.setHeader("Set-Cookie", responseCookies);
      res.json(data);
    }
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

router.post("/auth/signup/", async (req, res) => {
  const insertedId = await insertSignUp({ data: req.body.data });
  res.status(200).send({
    message: insertedId,
  });
});

router.post("/db/addReview/", async (req, res) => {
  const insertedId = await insertReview({ data: req.body.data });
  res.status(200).send({
    message: insertedId,
  });
});

router.post("/popularPicks/", async (req, res) => {
  try {
    const requestCookies = req.cookies;

    const { locationRes, exists } = doesLocationCookieExist(res, req);
    res = locationRes;

    if (exists) {
      res.json(await popularRestaurants(req.body, requestCookies));
    }
  } catch (e) {
    console.error(e);
  }
});

const doesLocationCookieExist = (res, req) => {
  const cookies = req.cookies;
  if (cookies["uev2.loc"] === undefined) {
    res.status(400);
    return { locationRes: res, exists: false };
  }
  res.status(200);
  return { locationRes: res, exists: true };
};

export default router;
