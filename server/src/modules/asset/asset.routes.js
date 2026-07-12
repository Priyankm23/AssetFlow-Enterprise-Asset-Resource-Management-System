const express = require('express');
const assetController = require('./asset.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

const router = express.Router();

router.post(
  '/assets',
  authenticate,
  authorize(['AssetManager']),
  upload.single('photo'),
  assetController.createAsset
);

router.get('/assets', authenticate, assetController.getAssets);

router.get('/assets/:id', authenticate, assetController.getAssetDetails);

router.put(
  '/assets/:id',
  authenticate,
  authorize(['AssetManager']),
  upload.single('photo'),
  assetController.updateAsset
);

module.exports = router;
