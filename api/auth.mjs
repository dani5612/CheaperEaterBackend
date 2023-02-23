import { env } from "node:process";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDB } from "../database.mjs";

const register = ({ username, email, password }) => {
  const saltRounds = 10;
  bcrypt.hash(password, saltRounds, async (err, hash) => {
    if (err) {
      console.error(err);
    } else {
      await (await getDB())
        .collection("users")
        .insertOne({ username: username, email: email, password: hash });
    }
  });
};

const login = async ({ email, password }) => {
  const user = await (await getDB())
    .collection("users")
    .findOne({ email: email }, { password: 1 });

  if (await bcrypt.compare(password, user.password)) {
    const payload = { username: user.username };
    return {
      accessToken: jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
        expiresIn: "20s",
      }),
      refreshToken: jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
        expiresIn: "24h",
      }),
    };
  }
};

const logout = () => {
  //expire tokens
};

export { register, login, logout };
