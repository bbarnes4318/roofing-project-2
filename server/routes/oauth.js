const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const { asyncHandler } = require("../middleware/errorHandler");
const { generateToken } = require("../middleware/auth");
const { prisma } = require("../config/prisma");

const router = express.Router();

// Initialize Google OAuth client
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI ||
    `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/auth/google/callback`
);

// @desc    Initiate Google OAuth login
// @route   GET /api/oauth/google
// @access  Public
router.get(
  "/google",
  asyncHandler(async (req, res) => {
    try {
      const authUrl = client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/userinfo.email",
        ],
        prompt: "consent",
      });

      res.redirect(authUrl);
    } catch (error) {
      console.error("Google OAuth initiation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to initiate Google OAuth",
      });
    }
  })
);

// @desc    Handle Google OAuth callback
// @route   GET /api/oauth/google/callback
// @access  Public
router.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    try {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: "Authorization code not provided",
        });
      }

      // Exchange code for tokens
      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      // Get user info from Google
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const {
        sub: googleId,
        email,
        given_name: firstName,
        family_name: lastName,
        picture: avatar,
      } = payload;

      console.log("🔍 GOOGLE OAUTH: User authenticated:", {
        googleId,
        email,
        firstName,
        lastName,
      });

      // Find or create user in database
      let user = await prisma.user.findUnique({
        where: { email: email },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          permissions: true,
          isActive: true,
          theme: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        console.log("👤 Creating new user from Google OAuth");
        user = await prisma.user.create({
          data: {
            email: email,
            firstName: firstName || email.split("@")[0],
            lastName: lastName || "",
            password: "GOOGLE_OAUTH_MANAGED", // Placeholder since Google handles authentication
            role: "WORKER", // Default role
            isActive: true,
            theme: "LIGHT",
            lastLogin: new Date(),
            avatar: avatar,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            permissions: true,
            isActive: true,
            theme: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        console.log("✅ New user created:", user.id);
      } else {
        console.log("👤 Existing user found, updating last login");
        // Update last login and avatar
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLogin: new Date(),
            avatar: avatar,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            permissions: true,
            isActive: true,
            theme: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        console.log("✅ User last login updated");
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Account is deactivated.",
        });
      }

      // Generate JWT token
      const token = generateToken(user.id, user.role);
      console.log("✅ JWT token generated for user:", user.id);

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(
        JSON.stringify(user)
      )}`;

      console.log("🎉 OAuth flow completed, redirecting to:", redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      console.error("Google OAuth callback error details:", {
        errorCode: error.code,
        errorMessage: error.message,
        response: error.response?.data,
      });

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      // Handle specific OAuth errors gracefully
      // These occur when user returns to app with stale auth code in URL
      if (
        error.message?.includes("invalid_grant") ||
        error.message?.includes("Token has been expired or revoked") ||
        error.message?.includes("already been used") ||
        error.message?.includes("code has expired")
      ) {
        // Stale authorization code - just redirect to login without error
        // This happens when user refreshes or returns with old URL
        console.log("🔄 Stale OAuth code detected, redirecting to clean login");
        return res.redirect(frontendUrl);
      }

      // For other errors, also redirect to login but log the issue
      console.log("⚠️ OAuth error, redirecting to clean login:", error.message);
      res.redirect(frontendUrl);
    }
  })
);

// @desc    Verify Google OAuth token
// @route   POST /api/oauth/verify
// @access  Public
router.post(
  "/verify",
  asyncHandler(async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token not provided",
        });
      }

      // Verify the token with Google
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { email } = payload;

      // Find user in database
      const user = await prisma.user.findUnique({
        where: { email: email },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          permissions: true,
          isActive: true,
          theme: true,
          lastLogin: true,
        },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: "User not found or inactive",
        });
      }

      // Generate new JWT token
      const jwtToken = generateToken(user.id, user.role);

      res.json({
        success: true,
        token: jwtToken,
        user: user,
      });
    } catch (error) {
      console.error("Google OAuth verification error:", error);
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
  })
);

module.exports = router;
