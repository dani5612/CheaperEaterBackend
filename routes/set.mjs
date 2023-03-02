import { Router } from "express";
import { setLocation } from "../api/set.mjs";

const setRouter = Router();

setRouter.post("/location", async (req, res) => {
  res.json(await setLocation(req.body));
});

export default setRouter;
