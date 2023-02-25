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
import {
  register,
  login,
  logout,
  sendPasswordResetLink,
  resetAccountPassword,
  refreshToken,
  getUsernameFromAccessToken,
} from "../api/auth.mjs";

const router = express.Router();

/*Middleware to require authentication
 * @param {Object} req request
 * @param {Object} res response
 *@param {Object} next next middleware call
 */
const requireAuthentication = (req, res, next) => {
  const auth = req.headers.authorization;
  const accessToken = auth && auth.split(" ")[1];
  if (!accessToken) {
    res.sendStatus(401);
  }
  try {
    req.username = getUsernameFromAccessToken(accessToken);
    next();
  } catch (e) {
    console.error(e);
    res.sendStatus(403);
  }
};

/*Middleware to require location
 * @param {Object} req request
 * @param {Object} res response
 *@param {Object} next next middleware call
 */
const requireLocation = (req, res, next) => {
  if (!req?.body?.cookies) {
    res.status(400);
    res.json({ error: "missing cookie data" });
  } else if (!req?.body?.cookies["uev2.loc"]) {
    res.status(400);
    res.json({ error: "missing location data" });
  } else {
    next();
  }
};

router.post("/auth/refreshToken", async (req, res) => {
  try {
    const rToken = req.body.refreshToken;
    if (!rToken) {
      return res.sendStatus(401);
    }
    res.json(await refreshToken(rToken));
  } catch (e) {
    console.error(e);
    res.sendStatus(403);
  }
});

router.post("/auth/register", async (req, res) => {
  try {
    await register(req.body);
    res.json({ message: "account created" });
  } catch (e) {
    res.status(400);
    res.json({ error: e });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const tokens = await login(req.body);
    res.json(tokens);
  } catch (e) {
    res.status(400);
    res.json({ error: e });
  }
});

router.post("/auth/logout", requireAuthentication, async (req, res) => {
  res.json(await logout(req.username));
});

router.post("/auth/requestPasswordReset", async (req, res) => {
  try {
    await sendPasswordResetLink(req.body);
    res.sendStatus(200);
  } catch (e) {
    res.status(400);
    res.json({ error: e });
  }
});

router.post("/auth/resetAccountPassword", async (req, res) => {
  try {
    await resetAccountPassword(req.body);
    res.sendStatus(200);
  } catch (e) {
    res.status(400);
    res.json({ error: e });
  }
});

router.post("/set/location", async (req, res) => {
  res.json(await setLocation(req.body));
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

router.post("/autocomplete/search", requireLocation, async (req, res) => {
  try {
    res.json(await autocompleteSearch(req.body));
  } catch (e) {
    console.error(e);
  }
});

router.post("/search", requireLocation, async (req, res) => {
  try {
    res.json(await search(req.body));
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

router.post("/popularPicks", requireLocation, async (req, res) => {
  try {
    res.json(await popularRestaurants(req.body));
  } catch (e) {
    console.error(e);
  }
});

export default router;
