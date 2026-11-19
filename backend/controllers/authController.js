const User = require('../models/User');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendOTP } = require('../utils/notifications');
const crypto = require('crypto');
const { saveFcmToken, removeFcmToken } = require('../utils/fcm');
const { userOtps, driverOtps } = require('../utils/otpStore');

// Only our web frontend sends platform 'web' (src/lib/fcm.ts); native apps may send 'mobile', 'android', or nothing
const fcmPlatform = (p) => (String(p).toLowerCase() === 'web' ? 'web' : 'mobile');

// Optional fcmToken/platform sent with verify-otp (native apps) — never blocks login
const storeLoginFcm = (Model, id, body) =>
  body.fcmToken ? saveFcmToken(Model, id, body.fcmToken, fcmPlatform(body.platform)).catch(e => console.error('FCM save failed:', e.message)) : null;

// Generate JWT Token
const generateToken = (id, role = 'user') => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Separate secret so a refresh token never passes as an access token (and vice versa)
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}:refresh`;
const generateRefreshToken = (id, role) =>
  jwt.sign({ id, role, type: 'refresh' }, refreshSecret(), { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' });

// Fixed OTPs for test accounts (User & Driver). Override with TEST_OTP_MAP="9999999999:123456,8888888888:654321"; TEST_OTP_MAP="" disables
const DEFAULT_OTP_MAP = Object.fromEntries(
  (process.env.TEST_OTP_MAP ?? '7610416911:123456').split(',').map(p => p.trim().split(':')).filter(p => p.length === 2)
);

const getDefaultOTPForPhone = (phone) => {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, '').slice(-10);
  return DEFAULT_OTP_MAP[digits] || null;
};

// Send success response
const sendTokenResponse = (user, statusCode, res, role = 'user') => {
  const token = generateToken(user._id, role);

  const options = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  // Set cookie based on role
  const cookieName = role === 'admin' ? 'adminToken' : role === 'driver' ? 'driverToken' : 'token';
  res.cookie(cookieName, token, options);

  res.status(statusCode).json({
    success: true,
    token,
    refreshToken: generateRefreshToken(user._id, role),
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: role,
      isVerified: user.isVerified,
      profilePicture: user.profilePicture
    }
  });
};

// @desc    Send OTP for unified login/signup
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTPForAuth = async (req, res, next) => {
  try {
    const { phone, purpose = 'auth' } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Phone number is required',
          statusCode: 400
        }
      });
    }

    // Normalize phone number
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length < 10) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide a valid 10-digit phone number',
          statusCode: 400
        }
      });
    }

    const normalizedPhone = digits.slice(-10);

    // Check if user exists in database
    const existingUser = await User.findOne({ phone: normalizedPhone });
    const isNewUser = !existingUser;

    // Check if this is a test user or configured default OTP number
    let isTestUser = false;
    let testUserDefaultOTP = getDefaultOTPForPhone(normalizedPhone);

    if (testUserDefaultOTP) {
      isTestUser = true;
    }

    let code, expiresAt;

    if (isTestUser) {
      // Use default OTP for test user (permanent, no expiry)
      code = testUserDefaultOTP;
      expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      console.log(`🧪 Test user detected: ${normalizedPhone}`);
    } else {
      // Generate random OTP for regular users
      code = Math.floor(100000 + Math.random() * 900000).toString();
      expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    }

    // Store OTP in temporary store

    await userOtps.set(normalizedPhone, {
      code,
      expiresAt,
      attempts: 0,
      purpose,
      isNewUser,
      timestamp: new Date(),
      isTestUser: isTestUser
    });


    // Send OTP via SMS (skip for test users)
    if (!isTestUser) {
      try {
        await sendOTP(normalizedPhone, code);
      } catch (error) {
        console.error('SMS OTP sending failed:', error);
        await userOtps.delete(normalizedPhone);
        return res.status(500).json({
          success: false,
          error: {
            message: 'Failed to send OTP. Please try again.',
            statusCode: 500
          }
        });
      }
    } else {
      console.log(`📱 Skipping SMS for test user: ${normalizedPhone}`);
    }

    res.status(200).json({
      success: true,
      message: isTestUser
        ? `Test user OTP ready for ${normalizedPhone}`
        : `OTP sent successfully to ${normalizedPhone}`,
      data: {
        phone: normalizedPhone,
        isNewUser: isNewUser,
        purpose,
        isTestUser: isTestUser
      }
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    next(error);
  }
};

// @desc    Verify OTP and proceed with unified login/signup
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTPAndProceed = async (req, res, next) => {
  try {
    const { phone, otp, purpose = 'auth', userData } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Phone number and OTP are required',
          statusCode: 400
        }
      });
    }

    // Normalize phone number
    const digits = phone.replace(/[^0-9]/g, '');
    const normalizedPhone = digits.slice(-10);

    // Check if OTP exists in temporary store
    const defaultOtp = getDefaultOTPForPhone(normalizedPhone);

    if (!await userOtps.has(normalizedPhone)) {
      if (defaultOtp && defaultOtp === otp) {
        await userOtps.set(normalizedPhone, {
          code: defaultOtp,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          attempts: 0,
          purpose,
          timestamp: new Date(),
          isTestUser: true
        });
      } else {
        return res.status(400).json({
          success: false,
          error: {
            message: 'OTP not found or expired. Please request a new OTP.',
            statusCode: 400
          }
        });
      }
    }

    const otpData = await userOtps.get(normalizedPhone);

    // Check if OTP is expired (skip expiry check for test users)
    if (!otpData.isTestUser && otpData.expiresAt < new Date()) {
      await userOtps.delete(normalizedPhone);
      return res.status(400).json({
        success: false,
        error: {
          message: 'OTP has expired. Please request a new OTP.',
          statusCode: 400
        }
      });
    }

    // Check if OTP matches
    const isOtpValid = otpData.code === otp || (defaultOtp && defaultOtp === otp);
    if (!isOtpValid) {
      otpData.attempts += 1;
      await userOtps.set(normalizedPhone, otpData);

      if (otpData.attempts >= 3) {
        await userOtps.delete(normalizedPhone);
        return res.status(400).json({
          success: false,
          error: {
            message: 'Too many failed attempts. Please request a new OTP.',
            statusCode: 400
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid OTP. Please try again.',
          statusCode: 400
        }
      });
    }

    // OTP is valid
    // Check if user already exists in database
    const existingUser = await User.findOne({ phone: normalizedPhone }).select('+password');

    if (existingUser) {
      // EXISTING USER -> DIRECT LOGIN
      if (!existingUser.isActive) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Account is deactivated. Please contact support.',
            statusCode: 401
          }
        });
      }

      if (!otpData.isTestUser) {
        await userOtps.delete(normalizedPhone);
      }

      console.log(`✅ Existing user verified & logged in directly: ${normalizedPhone}`);
      await storeLoginFcm(User, existingUser._id, req.body);
      return sendTokenResponse(existingUser, 200, res, 'user');
    }

    // NEW USER FLOW
    if (userData && userData.firstName && userData.lastName) {
      // User data provided -> Create user & login directly
      const userDataToSave = {
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        phone: normalizedPhone,
        password: userData.password || crypto.randomBytes(16).toString('hex'),
        gender: userData.gender || 'prefer-not-to-say',
        dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : null,
        isVerified: true
      };

      if (userData.email && userData.email.trim()) {
        userDataToSave.email = userData.email.toLowerCase().trim();
      }

      const newUser = await User.create(userDataToSave);
      await newUser.generateVerificationCode();

      if (!otpData.isTestUser) {
        await userOtps.delete(normalizedPhone);
      }

      console.log(`🎉 New user created & logged in: ${normalizedPhone}`);
      await storeLoginFcm(User, newUser._id, req.body);
      return sendTokenResponse(newUser, 201, res, 'user');
    }

    // If new user and user details not yet passed, mark phone as verified for profile completion step
    otpData.verified = true;
    otpData.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // time to fill the profile form
    await userOtps.set(normalizedPhone, otpData);

    return res.status(200).json({
      success: true,
      isNewUser: true,
      verified: true,
      phone: normalizedPhone,
      message: 'OTP verified successfully. Please enter your profile details.'
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    next(error);
  }
};

// @desc    Register new user after OTP verification
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, gender, dateOfBirth } = req.body;

    if (!phone || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'First name, last name, and phone number are required',
          statusCode: 400
        }
      });
    }

    const digits = phone.replace(/[^0-9]/g, '');
    const normalizedPhone = digits.slice(-10);

    // Phone must have passed /verify-otp first (it sets verified=true on the stored OTP)
    const otpData = await userOtps.get(normalizedPhone);
    if (!otpData || !otpData.verified || (!otpData.isTestUser && otpData.expiresAt < new Date())) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Phone number not verified. Please verify OTP again.',
          statusCode: 401
        }
      });
    }

    // Existing users log in through /verify-otp, never here
    if (await User.exists({ phone: normalizedPhone })) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Account already exists. Please log in with OTP.',
          statusCode: 409
        }
      });
    }

    const userDataToSave = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normalizedPhone,
      password: crypto.randomBytes(16).toString('hex'),
      gender: gender || 'prefer-not-to-say',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      isVerified: true
    };

    if (email && email.trim()) {
      userDataToSave.email = email.toLowerCase().trim();
    }

    const newUser = await User.create(userDataToSave);
    await newUser.generateVerificationCode();

    await userOtps.delete(normalizedPhone);

    console.log(`🎉 New user registered successfully: ${normalizedPhone}`);
    await storeLoginFcm(User, newUser._id, req.body);
    return sendTokenResponse(newUser, 201, res, 'user');
  } catch (error) {
    console.error('Register user error:', error);
    next(error);
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res, next) => {
  try {
    const { phone, purpose = 'auth' } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Phone number is required',
          statusCode: 400
        }
      });
    }

    // Normalize phone number
    const digits = phone.replace(/[^0-9]/g, '');
    const normalizedPhone = digits.slice(-10);

    // Check if this is a test user
    let isTestUser = false;
    let testUserDefaultOTP = getDefaultOTPForPhone(normalizedPhone);

    const user = await User.findOne({ phone: normalizedPhone });
    const isNewUser = !user;

    if (testUserDefaultOTP) {
      isTestUser = true;
    }

    // Remove existing OTP if any (but keep test user OTPs)
    if (await userOtps.has(normalizedPhone)) {
      const existingOtpData = await userOtps.get(normalizedPhone);
      if (!existingOtpData.isTestUser) {
        await userOtps.delete(normalizedPhone);
      }
    }

    let code, expiresAt;

    if (isTestUser) {
      code = testUserDefaultOTP;
      expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      console.log(`🧪 Test user resend: ${normalizedPhone}`);
    } else {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    }

    // Store new OTP

    await userOtps.set(normalizedPhone, {
      code,
      expiresAt,
      attempts: 0,
      purpose,
      isNewUser,
      timestamp: new Date(),
      isTestUser: isTestUser
    });

    // Send new OTP (skip for test users)
    if (!isTestUser) {
      try {
        await sendOTP(normalizedPhone, code);
      } catch (error) {
        console.error('SMS OTP resend failed:', error);
        await userOtps.delete(normalizedPhone);
        return res.status(500).json({
          success: false,
          error: {
            message: 'Failed to resend OTP. Please try again.',
            statusCode: 500
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      message: isTestUser
        ? `Test user OTP ready for ${normalizedPhone}`
        : `OTP resent successfully to ${normalizedPhone}`,
      data: {
        phone: normalizedPhone,
        isNewUser,
        purpose,
        isTestUser: isTestUser
      }
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    next(error);
  }
};

// @desc    Send OTP for driver signup/login/auth
// @route   POST /api/auth/driver/send-otp
// @access  Public
const sendDriverOTP = async (req, res, next) => {
  try {
    const { phone, purpose = 'auth' } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Phone number is required',
          statusCode: 400
        }
      });
    }

    // Normalize phone number
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length < 10) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide a valid 10-digit phone number',
          statusCode: 400
        }
      });
    }

    const normalizedPhone = digits.slice(-10);
    const existingDriver = await Driver.findOne({ phone: normalizedPhone });
    const isNewUser = !existingDriver;

    // Check if this is a test driver
    let isTestDriver = false;
    let testDriverDefaultOTP = getDefaultOTPForPhone(normalizedPhone);

    if (testDriverDefaultOTP) {
      isTestDriver = true;
    }

    let code, expiresAt;

    if (isTestDriver) {
      code = testDriverDefaultOTP;
      expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      console.log(`🧪 Test driver detected: ${normalizedPhone}`);
    } else {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    }

    // Store OTP in temporary store

    await driverOtps.set(normalizedPhone, {
      code,
      expiresAt,
      attempts: 0,
      purpose,
      timestamp: new Date(),
      isTestDriver: isTestDriver
    });


    // Send OTP via SMS (skip for test drivers)
    if (!isTestDriver) {
      try {
        await sendOTP(normalizedPhone, code);
        console.log(`📱 SMS sent successfully to ${normalizedPhone}`);
      } catch (error) {
        console.error('SMS OTP sending failed:', error);
        await driverOtps.delete(normalizedPhone);
        return res.status(500).json({
          success: false,
          error: {
            message: 'Failed to send OTP. Please try again.',
            statusCode: 500
          }
        });
      }
    } else {
      console.log(`📱 Skipping SMS for test driver: ${normalizedPhone}`);
    }

    res.status(200).json({
      success: true,
      message: isTestDriver ? `Test driver OTP ready for ${normalizedPhone}` : `OTP sent successfully to ${normalizedPhone}`,
      data: {
        phone: normalizedPhone,
        purpose,
        isNewUser,
        isTestDriver: isTestDriver
      }
    });
  } catch (error) {
    console.error('Send driver OTP error:', error);
    next(error);
  }
};

// @desc    Verify OTP and proceed with driver signup/login
// @route   POST /api/auth/driver/verify-otp
// @access  Public
const verifyDriverOTPAndProceed = async (req, res, next) => {
  try {
    const { phone, otp, purpose = 'auth', driverData } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Phone number and OTP are required',
          statusCode: 400
        }
      });
    }

    // Normalize phone number
    const digits = phone.replace(/[^0-9]/g, '');
    const normalizedPhone = digits.slice(-10);

    // Check if OTP exists in temporary store
    const defaultOtp = getDefaultOTPForPhone(normalizedPhone);

    if (!await driverOtps.has(normalizedPhone)) {
      if (defaultOtp && defaultOtp === otp) {
        await driverOtps.set(normalizedPhone, {
          code: defaultOtp,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          attempts: 0,
          purpose,
          timestamp: new Date(),
          isTestDriver: true
        });
      } else {
        return res.status(400).json({
          success: false,
          error: {
            message: 'OTP not found or expired. Please request a new OTP.',
            statusCode: 400
          }
        });
      }
    }

    const otpData = await driverOtps.get(normalizedPhone);

    // Check if OTP is expired (skip expiry check for test drivers)
    if (!otpData.isTestDriver && otpData.expiresAt < new Date()) {
      await driverOtps.delete(normalizedPhone);
      return res.status(400).json({
        success: false,
        error: {
          message: 'OTP has expired. Please request a new OTP.',
          statusCode: 400
        }
      });
    }

    // Check if OTP matches
    const isOtpValid = otpData.code === otp || (defaultOtp && defaultOtp === otp);
    if (!isOtpValid) {
      otpData.attempts += 1;
      await driverOtps.set(normalizedPhone, otpData);

      if (otpData.attempts >= 3) {
        await driverOtps.delete(normalizedPhone);
        return res.status(400).json({
          success: false,
          error: {
            message: 'Too many failed attempts. Please request a new OTP.',
            statusCode: 400
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid OTP. Please try again.',
          statusCode: 400
        }
      });
    }

    const existingDriver = await Driver.findOne({ phone: normalizedPhone });

    // Handle new driver creation or profile setup
    if (!existingDriver) {
      if (!driverData || !driverData.firstName || !driverData.lastName) {
        return res.status(200).json({
          success: true,
          isNewUser: true,
          message: 'OTP verified successfully. Please enter your details to complete registration.'
        });
      }

      // Remove OTP now that registration info is provided
      if (!otpData.isTestDriver) {
        await driverOtps.delete(normalizedPhone);
      }

      // Create driver with provided info
      const driverDataToSave = {
        firstName: driverData.firstName.trim(),
        lastName: driverData.lastName.trim(),
        email: (driverData.email || `${normalizedPhone}@driver.chalosawari.com`).toLowerCase().trim(),
        phone: normalizedPhone,
        password: crypto.randomBytes(16).toString('hex'),
        gender: driverData.gender || 'male',
        dateOfBirth: driverData.dateOfBirth ? new Date(driverData.dateOfBirth) : new Date('1990-01-01'),
        address: {
          street: driverData.address?.street || 'N/A',
          city: driverData.address?.city || 'N/A',
          state: driverData.address?.state || 'N/A',
          pincode: driverData.address?.pincode,
          country: 'India'
        },
        documents: {
          drivingLicense: { number: 'PENDING', expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
          vehicleRC: { number: 'PENDING', expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
        },
        vehicleDetails: {
          type: 'car',
          brand: 'TBD',
          model: 'TBD',
          year: new Date().getFullYear(),
          color: 'TBD',
          fuelType: 'petrol',
          seatingCapacity: 4
        },
        bankDetails: {
          accountNumber: 'PENDING',
          ifscCode: 'PENDING',
          bankName: 'PENDING',
          accountHolderName: `${driverData.firstName} ${driverData.lastName}`.trim() || 'PENDING'
        },
        isActive: true,
        isVerified: true,
        isApproved: true
      };

      const newDriver = await Driver.create(driverDataToSave);
      await newDriver.generateVerificationCode();
      await storeLoginFcm(Driver, newDriver._id, req.body);
      return sendTokenResponse(newDriver, 201, res, 'driver');
    }

    // OTP is valid for existing driver - remove it from store (keep test driver OTPs)
    if (!otpData.isTestDriver) {
      await driverOtps.delete(normalizedPhone);
    } else {
      console.log(`🧪 Test driver OTP verified successfully: ${normalizedPhone}`);
    }

    // Existing driver login
    if (!existingDriver.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Account is deactivated. Please contact support.',
          statusCode: 401
        }
      });
    }

    // Every driver API rejects unverified drivers, so a token would only cause a login → logout loop
    if (!existingDriver.isVerified) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Your driver account is under verification. Please contact support.',
          statusCode: 403
        }
      });
    }

    existingDriver.lastLogin = new Date();
    await existingDriver.save();
    await storeLoginFcm(Driver, existingDriver._id, req.body);
    return sendTokenResponse(existingDriver, 200, res, 'driver');
  } catch (error) {
    console.error('Verify driver OTP error:', error);
    next(error);
  }
};

// @desc    Resend OTP for driver
// @route   POST /api/auth/driver/resend-otp
// @access  Public
const resendDriverOTP = async (req, res, next) => {
  try {
    const { phone, purpose = 'signup' } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Phone number is required',
          statusCode: 400
        }
      });
    }

    // Normalize phone number
    const digits = phone.replace(/[^0-9]/g, '');
    const normalizedPhone = digits.slice(-10);

    // Check if this is a test driver
    let isTestDriver = false;
    let testDriverDefaultOTP = getDefaultOTPForPhone(normalizedPhone);

    const driver = await Driver.findOne({ phone: normalizedPhone });
    if (testDriverDefaultOTP) {
      isTestDriver = true;
    }

    // Remove existing OTP if any (but keep test driver OTPs)
    if (await driverOtps.has(normalizedPhone)) {
      const existingOtpData = await driverOtps.get(normalizedPhone);
      if (!existingOtpData.isTestDriver) {
        await driverOtps.delete(normalizedPhone);
      }
    }

    let code, expiresAt;

    if (isTestDriver) {
      // Use default OTP for test driver (permanent, no expiry)
      code = testDriverDefaultOTP;
      expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year (effectively permanent)
      console.log(`🧪 Test driver resend: ${normalizedPhone}`);
    } else {
      // Generate new OTP for regular drivers
      code = Math.floor(100000 + Math.random() * 900000).toString();
      expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    }

    // Store new OTP

    await driverOtps.set(normalizedPhone, {
      code,
      expiresAt,
      attempts: 0,
      purpose,
      timestamp: new Date(),
      isTestDriver: isTestDriver
    });

    // Send new OTP (skip for test drivers)
    if (!isTestDriver) {
      try {
        await sendOTP(normalizedPhone, code);
        console.log(`📱 SMS resent successfully to ${normalizedPhone}`);
      } catch (error) {
        console.error('SMS OTP sending failed:', error);
        await driverOtps.delete(normalizedPhone);
        return res.status(500).json({
          success: false,
          error: {
            message: 'Failed to send OTP. Please try again.',
            statusCode: 500
          }
        });
      }
    } else {
      console.log(`📱 Skipping SMS resend for test driver: ${normalizedPhone}`);
    }

    res.status(200).json({
      success: true,
      message: isTestDriver ? `Test driver OTP ready for ${normalizedPhone}` : 'OTP resent successfully',
      data: {
        phone: normalizedPhone,
        purpose,
        isTestDriver: isTestDriver
      }
    });
  } catch (error) {
    console.error('Resend driver OTP error:', error);
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    const role = req.user ? 'user' : req.driver ? 'driver' : req.admin ? 'admin' : 'user';
    const cookieName = role === 'admin' ? 'adminToken' : role === 'driver' ? 'driverToken' : 'token';

    res.cookie(cookieName, 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save / remove FCM token for logged-in user or driver
// @route   POST|DELETE /api/auth/fcm-token, /api/auth/driver/fcm-token  body: { token, platform: 'web'|'mobile' }
// @access  Private
const saveFcm = async (req, res, next) => {
  try {
    const Model = req.driver ? Driver : User;
    const ok = await saveFcmToken(Model, (req.driver || req.user)._id, req.body.token, fcmPlatform(req.body.platform));
    if (!ok) return res.status(400).json({ success: false, error: { message: 'Valid FCM token is required', statusCode: 400 } });
    res.status(200).json({ success: true, message: 'FCM token saved' });
  } catch (error) {
    next(error);
  }
};

const deleteFcm = async (req, res, next) => {
  try {
    if (typeof req.body.token === 'string') await removeFcmToken(req.driver ? Driver : User, (req.driver || req.user)._id, req.body.token);
    res.status(200).json({ success: true, message: 'FCM token removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = req.user || req.driver || req.admin;
    const role = req.user ? 'user' : req.driver ? 'driver' : 'admin';

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: role,
          isVerified: user.isVerified,
          profilePicture: user.profilePicture
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Swap a refresh token for a new access + refresh token (rotation)
// @route   POST /api/auth/refresh-token
// @access  Public
// ponytail: stateless — logout doesn't revoke an issued refresh token; add a tokenVersion field on User/Driver if forced logout is needed
const refreshAuthToken = async (req, res, next) => {
  const fail = () => res.status(401).json({ success: false, error: { message: 'Session expired. Please login again.', statusCode: 401 } });
  let payload;
  try {
    payload = jwt.verify(String(req.body?.refreshToken || ''), refreshSecret());
  } catch {
    return fail();
  }
  const Model = { user: User, driver: Driver }[payload.role];
  if (payload.type !== 'refresh' || !Model) return fail();
  try {
    const doc = await Model.findById(payload.id);
    // Same checks as protect / protectDriver
    if (!doc || !doc.isActive || (payload.role === 'driver' && !doc.isVerified)) return fail();
    return sendTokenResponse(doc, 200, res, payload.role);
  } catch (error) {
    next(error); // DB error → 500, not 401, so the client keeps its session
  }
};

module.exports = {
  refreshAuthToken,
  saveFcm,
  deleteFcm,
  sendOTPForAuth,
  verifyOTPAndProceed,
  registerUser,
  resendOTP,
  sendDriverOTP,
  verifyDriverOTPAndProceed,
  resendDriverOTP,
  logout,
  getMe
};
