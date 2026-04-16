const { Redis } = require("@upstash/redis");
require('dotenv').config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function main() {
  const result = await redis.set('testkey123', 'testval', { ex: 30, nx: true });
  console.log('Set EX NX result:', result);
  
  await redis.del('testkey123');

  await redis.set('testkey_json', JSON.stringify({ a: 1 }));
  const getRes = await redis.get('testkey_json');
  console.log('Get JSON type:', typeof getRes, getRes);
  
  await redis.del('testkey_json');

  let m = redis.multi();
  m.set('mtest1', '1', { ex: 10 });
  const mRes = await m.exec();
  console.log('Multi exec result:', mRes);
  
  try {
    await redis.watch('mtest1');
  } catch (e) {
    console.log('Watch Error:', e.message);
  }
}

main().catch(console.error);
