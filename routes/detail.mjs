import { Router } from "express";
import { detailLocation, detailStore } from "../api/detail.mjs";

const detailRouter = Router();

detailRouter.post("/location", async (req, res) => {
  res.json(await detailLocation(req.body));
});

detailRouter.post("/store", async (req, res) => {
  res.json(
    await detailStore({
      serviceIds: Object.keys(req.body.serviceIds).map((key) => ({
        id: req.body.serviceIds[key],
        service: key,
      })),
      page: req.body.page,
    })
  );
});

export default detailRouter;
