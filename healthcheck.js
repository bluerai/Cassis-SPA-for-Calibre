
import { request } from 'node:http';
import { logger } from './log.js'

const options = { hostname: 'localhost', port: process.env.PORT, path: '/app/count', method: 'GET' };

request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    try {
      const response = JSON.parse(body);

      if (response.healthy === true) {
        logger.info('Healthy response received: ' + body);
        process.exit(0);
      }

      logger.warn('Unhealthy response received: ' + body);
      process.exit(1);

    } catch (error) {
      logger.error('Error parsing JSON response body: ' + error);
      process.exit(1);
    }
  });
})
  .on('error', (error) => {
    logger.error('Error: ', error);
    process.exit(1);
  })
  .end();
