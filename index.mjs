import express from "express";
import cors from "cors";
import apiRouter from "./routes/api.mjs";

const app = express();
const port = 8000;

app.use(
    cors({
        origin: "http://localhost:19006",
        credentials: true,
    })
);

app.use(express.json());

app.use("/api", apiRouter);

app.listen(port, () => {
    console.log(`server started on port ${port}`);
});
