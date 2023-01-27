import fetch from "node-fetch";
import { HTTPResponseError } from "../errors/http.mjs";
import Service from "./Service.mjs";

class Grubhub extends Service {
  constructor() {
    super();
    this.service = "grubhub";
    this.clientId = "ghiphone_Vkuxbs6t0f4SZjTOW42Y52z1itJ7Li0Tw3FEcboT";
  }

  /*Parse token data from API response
   * @param {Object} data the API reponse from getting token info
   * @return {Object} parased token data
   */
  parseTokenData(data) {
    const {
      access_token,
      refresh_token,
      token_expire_time,
      refresh_token_expire_time,
    } = data.session_handle;

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      accessTokenExpireTime: token_expire_time,
      refreshTokenExpireTime: refresh_token_expire_time,
    };
  }

  /* Create a new token, this method should only be called
   * if valid token data does not already exists in the database.
   * if you want to get a token to use, getToken() should be used
   * instead.
   * @return {Object} newly create token data
   */
  async createNewToken() {
    const res = await fetch("https://api-gtm.grubhub.com/auth", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        tracestate: "@nr=0-2-0-0-cfd18ff8408d2318--0--1674429822078",
        "x-px-authorization": "4",
        accept: "*/*",
        "accept-language": "en-us",
        "user-agent": "GrubHub/2022.32 (iPhone; iOS 13.3.1; Scale/3.00)",
        vary: "Accept-Encoding",
      },
      body: JSON.stringify({
        brand: "GRUBHUB",
        client_id: this.clientId,
        scope: "anonymous",
      }),
    });
    return await this.updateToken(this.parseTokenData(await res.json()));
  }

  /* Refresh authentication tokens and store new token data in database
   * @param {String} refreshToken the refresh token used to get new tokens
   * @return {Object} the object containing the new token data
   */
  async refreshAuth(refreshToken) {
    const res = await fetch("https://api-gtm.grubhub.com/auth/refresh", {
      method: "POST",
      headers: {
        accept: "*/*",
        "accept-language": "en-us",
        "content-type": "application/json",
        "user-agent": "GrubHub/2022.32 (iPhone; iOS 13.3.1; Scale/3.00)",
        vary: "Accept-Encoding",
        "x-newrelic-id": "VQQDVlBVGwoBVVRSBQkO",
        "x-px-authorization": "4",
        "x-px-bypass-reason":
          "An%20SSL%20error%20has%20occurred%20and%20a%20secure%20connection%20to%20the%20server%20cannot%20be%20made.",
        "x-px-original-token":
          "2:eyJ1IjoiMWVkZTg0OTYtMzE2My0xMWVkLWIyMmUtZTMxZDAwZjEwM2Q3IiwidiI6IjI1MWM2MmM4LTMwOWUtMTFlZC04M2VlLTZhNDk0ZDU5NmQ0NCIsInQiOjE2NjI4NTQyMzExMTUsImgiOiI1MDU0NDNkZmZhN2ZlMzlmMGEwODVhNTczZmFmNTMzMWY4MTAxOGVkMGU3NWEwMjY5YmNjNjQxNDk0NjZiMjU3In0=",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        scope: "anonymous",
        brand: "GRUBHUB",
        refresh_token: refreshToken,
      }),
    });

    const tokenData = this.parseTokenData(await res.json());
    await this.updateToken(tokenData);
    return tokenData;
  }

  /*Checks if tokens are valid using database experitation times
   *@return {Object} boolean values indicating the validity of both the refresh
   * and access tokens
   */
  areTokensValid({ refreshTokenExpireTime, accessTokenExpireTime }) {
    const today = new Date().getTime();
    return {
      refreshTokenIsValid: today < refreshTokenExpireTime,
      accessTokenIsValid: today < accessTokenExpireTime,
    };
  }

  /* Search query
   * @param {String} query the query to search
   * @return {Object} the search result or HTTPResponseError
   */
  async search({ query, location }) {
    //const authData = await auth((await getToken()).refreshToken);
    // check if token is expired
    let tokenData = await this.getToken();
    const { refreshTokenIsValid, accessTokenIsValid } =
      this.areTokensValid(tokenData);

    // update tokens if invalid
    if (!accessTokenIsValid) {
      if (refreshTokenIsValid) {
        tokenData = await this.refreshAuth(tokenData.refreshToken);
      } else {
        tokenData = await this.createNewToken();
      }
    }

    let endpoint = new URL("https://api-gtm.grubhub.com/restaurants/search");
    const params = new URLSearchParams({
      orderMethod: "delivery",
      locationMode: "DELIVERY",
      facetSet: "umamiV6",
      pageSize: 20,
      hideHateos: true,
      searchMetrics: true,
      queryText: query,
      location: `POINT(${location.longitude} ${location.latitude})`,
      preciseLocation: true,
      //geohash: "9q5czyy7tpky", // does not seem to be required
      includeOffers: true,
      sortSetId: "umamiv3",
      sponsoredSize: 3,
      countOmittingTimes: true,
    });

    endpoint.search = params;

    const res = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        "content-type": "application/json",
        // unknow if this auth ever expires
        "x-px-authorization":
          "2:eyJ1IjoiODgxM2JlMzYtOWFhNC0xMWVkLTljZGQtODdmNmFiNTMyYWYyIiwidiI6IjI1MWM2MmM4LTMwOWUtMTFlZC04M2VlLTZhNDk0ZDU5NmQ0NCIsInQiOjE2NzQ0MjcxOTY3ODksImgiOiI4NTM3ZTY0MmNiN2Y0ZTQ5NzExNDRiNzY1ZTFjYWU0YjY5ZGZhNTg2YzQ5M2E0MGE0MjljY2Q4YzAyODY2ZGI2In0=",
        accept: "*/*",
        authorization: `Bearer ${tokenData.accessToken}`,
        "accept-language": "en-us",
        "user-agent": "GrubHub/2022.32 (iPhone; iOS 13.3.1; Scale/3.00)",
        vary: "Accept-Encoding",
      },
    });

    if (res.ok) {
      return await res.json();
    } else {
      throw new HTTPResponseError(res);
    }
  }
}

export default Grubhub;
