import { createClient } from 'redis';
import { enVars } from '.';

const redisClient = createClient({
   username: 'default',
   password: enVars.REDIS_PASSWORD,
   socket: {
      host: enVars.REDIS_HOST,
      port: Number(enVars.REDIS_PORT)
   }
});

export default redisClient;

