import { Router } from "express";
import authRouter from "./auth.mjs";
import setRouter from "./set.mjs";
import detailRouter from "./detail.mjs";
import searchRouter from "./search.mjs";
import autocompleteRouter from "./autocomplete.mjs";
import popularPicksRouter from "./popularPicks.mjs";
import dbRouter from "./db.mjs";

const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/set", setRouter);
apiRouter.use("/detail", detailRouter);
apiRouter.use("/autocomplete", autocompleteRouter);
apiRouter.use("/search", searchRouter);
apiRouter.use("/db", dbRouter);
apiRouter.use("/popularPicks", popularPicksRouter);

export default apiRouter;
