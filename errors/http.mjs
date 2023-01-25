class HTTPResponseError extends Error {
  constructor(response) {
    super(`HTTP Error Response: ${response.status} ${response.statusText}`);
    this.response = response;
  }

  async getError() {
    return {
      status: this.response.status,
      statusText: this.response.statusText,
      response: await this.response.json(),
    };
  }
}

export { HTTPResponseError };
