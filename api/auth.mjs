import { env } from "node:process";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDB } from "../database.mjs";

/* get username from jwt access token
 * @param {String} accessToken with username information
 * @return {String} username
 */
const getUsernameFromAccessToken = (accessToken) => {
  return jwt.verify(accessToken, env.ACCESS_TOKEN_SECRET).username;
};

/* Refresh tokens
 * @param {String} valid refresh token
 * @return {Object} new refresh and auth token
 */
const refreshToken = async (refreshToken) => {
  try {
    const users = (await getDB()).collection("users");
    const user = await users.findOne({ refreshTokens: refreshToken });

    // mitigating token reuse attack
    if (!user) {
      jwt.verify(
        refreshToken,
        env.REFRESH_TOKEN_SECRET,
        async (err, payload) => {
          if (err) {
            return Promise.reject("bad token");
          } else {
            await users.updateOne(
              {
                username: payload.username,
              },
              { $set: { refreshTokens: [] } }
            );
          }
        }
      );
      return Promise.reject("unauthorized");
    }

    // refresh tokens can only be used once
    const refreshTokens = user.refreshTokens.filter(
      (rToken) => refreshToken !== rToken
    );

    const payload = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET);
    const decodedPayload = { username: payload.username };

    try {
      // update both access and refresh tokens
      const newRefreshToken = generateRefreshToken(decodedPayload);
      await users.updateOne(decodedPayload, {
        $set: { refreshTokens: [...refreshTokens, newRefreshToken] },
      });
      return {
        accessToken: generateAccessToken(decodedPayload),
        refreshToken: newRefreshToken,
      };
    } catch (tokenErr) {
      console.error(tokenErr);
      await users.updateOne(decodedPayload, {
        $push: { refreshTokens: refreshTokens },
      });
    }
  } catch (e) {
    console.error(e);
  }
};

/*Generate access token
 *@param {Object} Payload the payload to encode in the token
 *@param {String} expiresIn token expiration time, default of 15m
 */
const generateAccessToken = (payload, expiresIn = "15m") => {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: expiresIn,
  });
};

/*Generate refresh token
 *@param {Object} Payload the payload to encode in the token
 *@param {String} expiresIn token expiration time, default of 15m
 */
const generateRefreshToken = (payload, expiresIn = "24h") => {
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: expiresIn,
  });
};

/* Register a new user
 * @param {Object} containing username,email, and password
 */
const register = async ({ username, email, password }) => {
  const saltRounds = 10;

  email = email.toLowerCase();
  username = username.toLowerCase();

  const emailValidator = /\S+@\S+\.\S+/;

  if (!emailValidator.test(email)) {
    return Promise.reject("invalid email");
  }

  try {
    const users = (await getDB()).collection("users");
    const user = await users.findOne({
      $or: [{ username: username }, { email: email }],
    });

    if (user) {
      if (user.email === email) {
        return Promise.reject("a user with this email already exists");
      } else if (user.username === username) {
        return Promise.reject("a user with this username already exists");
      }
    }

    bcrypt.hash(password, saltRounds, async (err, hash) => {
      if (err) {
        console.error(err);
      }
      await users.insertOne({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hash,
        refreshTokens: [],
      });
    });
  } catch (e) {
    console.error(e);
  }
};

/*Login a new user
 *@param {Object} containing email and password
 *@return {Object} with access token and refresh token
 */
const login = async ({ email, password }) => {
  try {
    const users = (await getDB()).collection("users");
    const user = await users.findOne({ email: email }, { password: 1 });

    if (!user) {
      return Promise.reject("account not found");
    }

    if (user?.password && (await bcrypt.compare(password, user.password))) {
      const payload = { username: user.username };
      const refreshToken = jwt.sign(payload, env.REFRESH_TOKEN_SECRET);
      await users.updateOne(user, { $push: { refreshTokens: refreshToken } });
      return {
        accessToken: generateAccessToken(payload),
        refreshToken: refreshToken,
      };
    } else {
      return Promise.reject("invalid login credentials");
    }
  } catch (e) {
    console.error(e);
  }
};

/* Logout user
 * @param {String} username to logout
 */
const logout = async (username) => {
  await (await getDB())
    .collection("users")
    .updateOne({ username: username }, { $set: { refreshTokens: [] } });
};

export { register, login, logout, refreshToken, getUsernameFromAccessToken };
