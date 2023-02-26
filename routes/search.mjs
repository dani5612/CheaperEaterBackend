import { Router } from "express";
import { requireLocation } from "../middleware.mjs";
import { search } from "../api/search.mjs";

const searchRouter = Router();

searchRouter.post("/", requireLocation, async (req, res) => {
  try {
    res.json(await search(req.body));
  } catch (e) {
    console.error(e);
  }
});

export default searchRouter;
