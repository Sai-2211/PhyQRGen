const express = require('express');
const { fetchEntropyHex } = require('../utils/qrng');

function createQrngRouter({ qrngUrl }) {
  const router = express.Router();

  router.get('/', async (_req, res, next) => {
    try {
      const { bytes, source } = await fetchEntropyHex(qrngUrl);
      res.json({ bytes, source });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createQrngRouter;
