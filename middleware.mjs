import { getUsernameFromAccessToken } from "./api/auth.mjs";

/* Middleware to require location
 * @param {Object} req request
 * @param {Object} res response
 * @param {Object} next next middleware call
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

/* Middleware to require authentication
 * @param {Object} req request
 * @param {Object} res response
 * @param {Object} next next middleware call
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

export { requireLocation, requireAuthentication };
