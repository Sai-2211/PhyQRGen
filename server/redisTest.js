import "dotenv/config";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function testRedis() {
  await redis.set("hello", "world");
  const value = await redis.get("hello");
  console.log("Redis test:", value);
}

testRedis();