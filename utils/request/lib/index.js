"use strict";
const axios = require("axios").default;

const Base_url = process.env.FIE_CIL_BASE_URL
  ? process.env.FIE_CIL_BASE_URL
  : "http://sunnycc:7002";
const request = axios.create({ baseURL: Base_url, timeout: 3000 });
request.interceptors.response.use(
  (res) => {
    return res.data;
  },
  (err) => {
    return Promise.reject(err);
  }
);

module.exports = request;
