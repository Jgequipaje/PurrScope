import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const TEST_URLS = {
  TC01: process.env.TC01_URL ?? "",
  TC02: process.env.TC02_URL ?? "",
  TC03: process.env.TC03_URL ?? "",
  TC04: (process.env.TC04_URLS ?? "").split(",").filter(Boolean),
  TC05: (process.env.TC05_URLS ?? "").split(",").filter(Boolean),
  TC06: process.env.TC06_URL ?? "",
  TC07: (process.env.TC07_URLS ?? "").split(",").filter(Boolean),
};
