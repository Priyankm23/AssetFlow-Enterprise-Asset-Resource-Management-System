const assetService = require('./asset.service');
const { createAssetSchema, updateAssetSchema } = require('./asset.validation');

/**
 * Controller to register a new asset
 */
const createAsset = async (req, res, next) => {
  try {
    // If a photo was uploaded via Multer, attach the Cloudinary secure URL
    if (req.file && req.file.path) {
      req.body.photoUrl = req.file.path;
    }

    const parsed = createAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const asset = await assetService.createAsset(parsed.data);

    res.status(201).json({
      success: true,
      data: { asset },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to search and list assets
 */
const getAssets = async (req, res, next) => {
  try {
    const { search, category, status, department, location, page, limit } = req.query;

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const result = await assetService.listAssets({
      search,
      categoryId: category,
      status,
      departmentId: department,
      location,
      page: pageNum,
      limit: limitNum,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch specific asset details (including history and holder)
 */
const getAssetDetails = async (req, res, next) => {
  try {
    const asset = await assetService.getAssetById(req.params.id);

    res.status(200).json({
      success: true,
      data: { asset },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update asset details
 */
const updateAsset = async (req, res, next) => {
  try {
    // If a photo was uploaded, attach it
    if (req.file && req.file.path) {
      req.body.photoUrl = req.file.path;
    }

    const parsed = updateAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const updatedAsset = await assetService.updateAsset(req.params.id, parsed.data);

    res.status(200).json({
      success: true,
      data: { asset: updatedAsset },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAsset,
  getAssets,
  getAssetDetails,
  updateAsset,
};
