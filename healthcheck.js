
import { request } from 'node:http';

const options = { hostname: 'localhost', port: process.env.PORT, path: '/media/count', method: 'GET' };

request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    try {
      const response = JSON.parse(body);

      if (response.healthy === true) {
        console.log('Healthy response received: ', body);
        process.exit(0);
      }

      console.log('Unhealthy response received: ', body);
      process.exit(1);

    } catch (error) {
      console.log('Error parsing JSON response body: ', error);
      process.exit(1);
    }
  });
})
  .on('error', (err) => {
    console.log('Error: ', err);
    process.exit(1);
  })
  .end();
