import { Router } from "express";
import { requireLocation } from "../middleware.mjs";
import { popularRestaurants } from "../api/get.mjs";

const popularPicksRouter = Router();

popularPicksRouter.post("/", requireLocation, async (req, res) => {
  try {
    res.json(await popularRestaurants(req.body));
  } catch (e) {
    console.error(e);
  }
});

export default popularPicksRouter;
