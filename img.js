
import sharp from 'sharp';

const IMGCACHE = process.env.IMGCACHE || "./Cache";

// Image-Cache einrichten:
logger.info("Cache for bookcovers found at " + IMGCACHE);
fs.ensureDirSync(IMGCACHE, (error, exists) => {
  if (error) { errorLogger(error); process.exit(1) }
})

