import { logger } from './log.js'

if (process.env.HTTP_PORT)
  try {
    const response = await fetch("http://localhost:" + process.env.HTTP_PORT + "/app/count/");
    const data = await response.json();

    if (data.healthy !== true) {
      logger.warn('HTTP: Unhealthy response received: ' + JSON.stringify(data));
      process.exit(1);
    }

    logger.debug('HTTP: Healthy response received: ' + JSON.stringify(data));

  } catch (error) {
    logger.error('HTTP: Error parsing JSON response body: ' + error);
    process.exit(1);
  }


if (process.env.HTTPS_PORT)
  try {
    const response = await fetch("http://localhost:" + process.env.HTTP_PORT + "/app/count/");
    const data = await response.json();

    if (data.healthy !== true) {
      logger.warn('HTTPS: Unhealthy response received: ' + JSON.stringify(data));
      process.exit(1);
    }

    logger.debug('HTTPS: Healthy response received: ' + JSON.stringify(data));

  } catch (error) {
    logger.error('HTTPS: Error parsing JSON response body: ' + error);
    process.exit(1);
  }

process.exit(0);
