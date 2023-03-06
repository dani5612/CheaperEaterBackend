import { env } from "node:process";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { sendEmail } from "../utils/email/email.mjs";
import { getDB } from "../database.mjs";

const SALT_ROUNDS = 10;

/* get username from jwt access token
 * @param {String} accessToken with username information
 * @return {String} username
 */
const getUsernameFromAccessToken = (accessToken) => {
  return jwt.verify(accessToken, env.ACCESS_TOKEN_SECRET).username;
};

/* Refresh tokens
 * @param {String} valid refresh token
 * @return {Object} tokens
 * @return {String} tokens.accessToken new refresh token
 * @return {String} tokens.refreshToken new auth token
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

/* Generate access token
 * @param {Object} Payload the payload to encode in the token
 * @param {String} expiresIn token expiration time, default of 15m
 * @return {String} access token
 */
const generateAccessToken = (payload, expiresIn = "15m") => {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: expiresIn,
  });
};

/* Generate refresh token
 * @param {Object} Payload the payload to encode in the token
 * @param {String} expiresIn token expiration time, default of 15m
 * @return {String} refresh token
 */
const generateRefreshToken = (payload, expiresIn = "24h") => {
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: expiresIn,
  });
};

/*Send account verification email
 * @param {Object} payload
 * @param {String} payload.email user email to send verification to
 * @param {ObjectId} payload.userId account user id
 * @param {String} payload.username account username
 */
const sendAccountVerificationEmail = async ({ email, userId, username }) => {
  const registerToken = await createTemporaryUserToken({
    userId: userId,
    tokenType: "register",
  });
  await sendEmail({
    from: env.SMTP_HOST,
    to: email,
    subject: "Verify Your Email Address",
    emailTemplate: "verifyAccountEmail.html",
    templatePayload: {
      username: username,
      link: `http://${env.DOMAIN}:${env.PORT}/verifyAccountEmail?token=${registerToken}&id=${userId}`,
      logoUrl:
        "https://raw.githubusercontent.com/cheaper-eater/frontend/main/assets/logos/logo.png",
      indexUrl: `http://${env.DOMAIN}:${env.PORT}`,
    },
  });
};

/* Resend verification eamil
 * @param {String} userId of the account to resent the
 * verification eamil to
 */
const resendVerificationEmail = async (userId) => {
  try {
    const user = await (await getDB())
      .collection("users")
      .findOne({ _id: ObjectId(userId) });

    if (!user) {
      return Promise.reject("user not found");
    }

    if (!user.isEmailVerified) {
      await sendAccountVerificationEmail({
        email: user.email,
        userId: user._id,
        username: user.username,
      });
    } else {
      return Promise.reject("email already verified");
    }
  } catch (e) {
    console.error(e);
    return Promise.reject("invaid user id");
  }
};

/* Register a new user and send email verification
 * @param {Object} userPayload
 * @param {String} userPayload.username username for new account
 * @param {String} userPayload.email email for new account
 * @param {String} userPayload.password password for new account
 */
const register = async ({ username, email, password }) => {
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

    bcrypt.hash(password, SALT_ROUNDS, async (err, hash) => {
      if (err) {
        console.error(err);
      }
      const newUser = await users.insertOne({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hash,
        isEmailVerified: false,
        refreshTokens: [],
      });

      await sendAccountVerificationEmail({
        username: username,
        email: email,
        userId: newUser.insertedId,
      });
    });
  } catch (e) {
    console.error(e);
  }
};

/* Create temporary hashed user token that expires withint 1 hour in indexed collection
 * @param {Object} userTokenPayload
 * @param {ObjectId} userTokenPayload.userId the userId to create a token for
 * @param {String} userTokenPayload.tokenType the type of the token
 * @return {String} the plainText token
 */
const createTemporaryUserToken = async ({ userId, tokenType }) => {
  try {
    const plainToken = crypto.randomBytes(32).toString("hex");
    await (await getDB()).collection("temporaryTokens").insertOne({
      createdAt: new Date(),
      userId: userId,
      token: await bcrypt.hash(plainToken, SALT_ROUNDS),
      tokenType: tokenType,
    });
    return plainToken;
  } catch (e) {
    console.error(e);
  }
};

/* Action on verify
 * @callback onVerify
 * @param {db} a mongodb databse instance
 */

/* Verify if a temporary user token is valid and perform an action if that token
 * is valid
 * @param {Object} tokenData
 * @param {String} tokenData.toketokenToVerify: The plain text token to veriry
 * @param {String} tokenData.userId: The user the token belongs to
 * @param {String} tokenData.tokenType: The token type to look for
 * @param {onVerify} action to perform
 */
const onVerifyTemporaryUserToken = async (
  { tokenToVerify, userId, tokenType },
  onVerify
) => {
  try {
    if (!userId) {
      return Promise.reject("missing expected userId");
    }
    const db = await getDB();
    const temporaryTokens = db.collection("temporaryTokens");
    const userToken = await temporaryTokens.findOne({
      userId: ObjectId(userId),
    });

    if (userToken && userToken.tokenType == tokenType) {
      if (await bcrypt.compare(tokenToVerify, userToken.token)) {
        onVerify(db);
      }
      await temporaryTokens.deleteOne(userToken);
    } else {
      return Promise.reject("invalid token");
    }
  } catch (e) {
    console.error(e);
  }
};

/* Veriy an account's email address
 * @param {Object} accountInformation
 * @param {String} accountInformation.verifyAccountEmailToken the token to verify an email address
 * @param {String} userId the account id to verify
 */
const verifyAccountEmail = async ({ verifyAccountEmailToken, userId }) => {
  await onVerifyTemporaryUserToken(
    {
      tokenToVerify: verifyAccountEmailToken,
      userId: userId,
      tokenType: "register",
    },
    async (db) => {
      try {
        await db
          .collection("users")
          .updateOne(
            { _id: ObjectId(userId) },
            { $set: { isEmailVerified: true } }
          );
      } catch (e) {
        console.error(e);
      }
    }
  );
};

/* Reset account password
 * @param {Object} payload
 * @param {String} payload.userId the user id for the account
 * @param {String} payload.newPassword the new password for the account
 * @param {String} payload.passwordResetToken a token to reset the password
 */
const resetAccountPassword = async ({
  userId,
  newPassword,
  passwordResetToken,
}) => {
  await onVerifyTemporaryUserToken(
    {
      tokenToVerify: passwordResetToken,
      userId: userId,
      tokenType: "passwordReset",
    },
    async (db) => {
      try {
        bcrypt.hash(newPassword, SALT_ROUNDS, async (err, hash) => {
          if (err) {
            console.error(err);
          }
          await db.collection("users").updateOne(
            {
              _id: ObjectId(userId),
            },
            { $set: { password: hash } }
          );
        });
      } catch (e) {
        console.error(e);
      }
    }
  );
};

/* Login a new user
 * @param {Object} loginPayload
 * @param {String} loginPayload.email the account email to log into
 * @param {String} loginPayload.password the account password
 * @return {Object} loginResponse
 * @return {String} loginResponse.accessToken token for user access
 * @return {String} loginResponse.refreshToken token for refresh
 */
const login = async ({ email, password }) => {
  try {
    const users = (await getDB()).collection("users");
    const user = await users.findOne({ email: email }, { password: 1 });

    if (!user) {
      return Promise.reject("account not found");
    } else if (!user.isEmailVerified) {
      return Promise.reject("email not verified");
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
 * @param {Object} payload
 * @param {String} payload.username username to logout
 * @param {String} payload.refreshToken most recent refresh token to remove from refresh Tokens
 */
const logout = async ({ username, refreshToken }) => {
  const users = (await getDB()).collection("users");
  const refreshTokens = (await users.findOne({ username: username }))
    .refreshTokens;

  if (!refreshTokens.includes(refreshToken)) {
    return Promise.reject("invalid token");
  }

  await users.updateOne(
    { username: username },
    {
      $set: {
        refreshTokens: refreshTokens.filter(
          (rToken) => rToken !== refreshToken
        ),
      },
    }
  );
};

/* Send password reset link to user email
 * @param {Object} accountPayload
 * @param {String} accountPayload.email the account's email to reset
 */
const sendPasswordResetLink = async ({ email }) => {
  try {
    const user = await (await getDB())
      .collection("users")
      .findOne({ email: email });

    if (user) {
      const passwordResetToken = await createTemporaryUserToken({
        userId: user._id,
        tokenType: "passwordReset",
      });

      await sendEmail({
        from: env.SMTP_HOST,
        to: email,
        subject: "Reset your password",
        emailTemplate: "resetAccountPassword.html",
        templatePayload: {
          username: user.username,
          link: `http://${env.DOMAIN}:${env.PORT}/passwordReset?token=${passwordResetToken}&id=${user._id}`,
          logoUrl:
            "https://raw.githubusercontent.com/cheaper-eater/frontend/main/assets/logos/logo.png",
          indexUrl: `http://${env.DOMAIN}:${env.PORT}`,
        },
      });
    } else {
      return Promise.reject("account not found");
    }
  } catch (e) {
    console.error(e);
  }
};

export {
  register,
  login,
  logout,
  sendPasswordResetLink,
  verifyAccountEmail,
  resendVerificationEmail,
  refreshToken,
  resetAccountPassword,
  getUsernameFromAccessToken,
};
