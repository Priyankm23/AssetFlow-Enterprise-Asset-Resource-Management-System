const authService = require('./auth.service');
const { signupSchema, loginSchema } = require('./auth.validation');

/**
 * Controller for user registration (Signup)
 */
const signup = async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const { name, email, password } = parsed.data;
    const result = await authService.registerUser({ name, email, password });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for user authentication (Login)
 */
const login = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const { email, password } = parsed.data;
    const result = await authService.loginUser({ email, password });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get current authenticated user profile (Me)
 */
const me = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  me,
};
