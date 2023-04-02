import { Router } from "express";
import { detailLocation, detailStore } from "../api/detail.mjs";

const detailRouter = Router();

detailRouter.post("/location", async (req, res) => {
  res.json(await detailLocation(req.body));
});

detailRouter.post("/store", async (req, res) => {
  res.json(
    await detailStore(
      Object.keys(req.body).map((key) => ({
        id: req.body[key],
        service: key,
      }))
    )
  );
});

export default detailRouter;
