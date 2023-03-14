import { Router } from "express";
import { requireAuthentication } from "../middleware.mjs";
import {
  register,
  resendVerificationEmail,
  login,
  logout,
  sendPasswordResetLink,
  resetAccountPassword,
  refreshToken,
  verifyAccountEmail,
} from "../api/auth.mjs";

const authRouter = Router();

authRouter.post("/refreshToken", async (req, res) => {
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

authRouter.post("/register", async (req, res) => {
  try {
    await register(req.body);
    res.json({ message: "account created" });
  } catch (e) {
    res.status(400);
    res.json({ error: e });
  }
});

authRouter.post("/resendVerificationEmail", async (req, res) => {
  try {
    await resendVerificationEmail(req.body.userId);
    res.sendStatus(200);
  } catch (e) {
    res.status(400);
    res.json({ error: e });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const tokens = await login(req.body);
    res.json(tokens);
  } catch (e) {
    res.status(400);
    res.json({ error: e });
  }
});

authRouter.post("/logout", requireAuthentication, async (req, res) => {
  try {
    await logout({
      username: req.username,
      refreshToken: req.body.refreshToken,
    });
    res.sendStatus(200);
  } catch (e) {
    if (e === "invalid token") {
      res.status(401);
    } else {
      res.status(400);
    }
    res.json({ error: e });
  }
});

authRouter.post("/requestPasswordReset", async (req, res) => {
  try {
    await sendPasswordResetLink(req.body);
    res.sendStatus(200);
  } catch (e) {
    res.status(400);
    res.json({ error: e });
  }
});

authRouter.post("/resetAccountPassword", async (req, res) => {
  try {
    await resetAccountPassword(req.body);
    res.sendStatus(200);
  } catch (e) {
    res.status(400);
    res.json({ error: e });
  }
});

authRouter.post("/verifyAccountEmail", async (req, res) => {
  try {
    await verifyAccountEmail(req.body);
    res.sendStatus(200);
  } catch (e) {
    res.status(400);
    res.json({ error: e });
  }
});

export default authRouter;
