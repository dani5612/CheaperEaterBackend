import { Router } from "express";
import { requireLocation } from "../middleware.mjs";
import {
  autocompleteLocation,
  autocompleteSearch,
} from "../api/autocomplete.mjs";

const autocompleteRouter = Router();

autocompleteRouter.post("/location", async (req, res) => {
  res.json(await autocompleteLocation(req.body.query));
});

autocompleteRouter.post("/search", requireLocation, async (req, res) => {
  try {
    res.json(await autocompleteSearch(req.body));
  } catch (e) {
    console.error(e);
  }
});

export default autocompleteRouter;
