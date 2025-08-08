const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// WebAuthn configuration
const rpName = 'Kenstruction';
const rpID = process.env.NODE_ENV === 'production' 
  ? 'goldfish-app-4yuma.ondigitalocean.app' 
  : 'localhost';
const origin = process.env.NODE_ENV === 'production'
  ? 'https://goldfish-app-4yuma.ondigitalocean.app'
  : 'http://localhost:3000';

class BiometricAuthService {
  /**
   * Generate registration options for new biometric credentials
   * @param {string} userId - User ID
   * @param {string} userName - User's display name
   * @param {string} userEmail - User's email
   */
  static async generateRegistrationOptions(userId, userName, userEmail) {
    try {
      // Get existing credentials for this user
      const existingCredentials = await prisma.webAuthnCredential.findMany({
        where: { userId, isActive: true },
        select: {
          credentialID: true,
          transports: true,
        },
      });

      const excludeCredentials = existingCredentials.map(cred => ({
        id: Buffer.from(cred.credentialID, 'base64url'),
        type: 'public-key',
        transports: cred.transports,
      }));

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: Buffer.from(userId),
        userName: userEmail,
        userDisplayName: userName,
        timeout: 60000,
        attestationType: 'none',
        excludeCredentials,
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Prefer platform authenticators
          userVerification: 'preferred',
          residentKey: 'preferred',
        },
        supportedAlgorithmIDs: [-7, -257], // ES256, RS256
      });

      // Store challenge for verification
      await prisma.user.update({
        where: { id: userId },
        data: {
          // Store challenge in a temporary field (you might want to use Redis for this in production)
          twoFactorSecret: JSON.stringify({
            challenge: options.challenge,
            timestamp: Date.now(),
          }),
        },
      });

      return {
        success: true,
        options,
      };
    } catch (error) {
      console.error('Error generating WebAuthn registration options:', error);
      return {
        success: false,
        message: 'Failed to generate biometric registration options',
        error: error.message,
      };
    }
  }

  /**
   * Verify registration response and create credential
   * @param {string} userId - User ID
   * @param {Object} response - WebAuthn registration response
   * @param {string} nickname - User-friendly name for the credential
   */
  static async verifyRegistrationResponse(userId, response, nickname = null) {
    try {
      // Get stored challenge
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorSecret: true },
      });

      if (!user?.twoFactorSecret) {
        return {
          success: false,
          message: 'No registration challenge found',
        };
      }

      const challengeData = JSON.parse(user.twoFactorSecret);
      const { challenge, timestamp } = challengeData;

      // Check if challenge is still valid (5 minutes)
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        return {
          success: false,
          message: 'Registration challenge expired',
        };
      }

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return {
          success: false,
          message: 'Biometric registration verification failed',
        };
      }

      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

      // Store the credential
      await prisma.webAuthnCredential.create({
        data: {
          userId,
          credentialID: Buffer.from(credentialID).toString('base64url'),
          credentialPublicKey: Buffer.from(credentialPublicKey),
          counter,
          deviceType: response.response.authenticatorAttachment || 'unknown',
          backedUp: verification.registrationInfo.credentialBackedUp,
          transports: response.response.transports || [],
          nickname: nickname || `Biometric Key ${Date.now()}`,
          lastUsed: new Date(),
        },
      });

      // Clear the challenge
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorSecret: null },
      });

      // Log security event
      await this.logSecurityEvent(userId, 'CREDENTIAL_CREATED', {
        credentialType: 'webauthn',
        deviceType: response.response.authenticatorAttachment,
        nickname,
      });

      return {
        success: true,
        message: 'Biometric credential registered successfully',
        credentialID: Buffer.from(credentialID).toString('base64url'),
      };
    } catch (error) {
      console.error('Error verifying WebAuthn registration:', error);
      return {
        success: false,
        message: 'Failed to verify biometric registration',
        error: error.message,
      };
    }
  }

  /**
   * Generate authentication options for existing credentials
   * @param {string} userId - User ID (optional, for usernameless flow)
   */
  static async generateAuthenticationOptions(userId = null) {
    try {
      let allowCredentials = [];

      if (userId) {
        // Get user's credentials
        const userCredentials = await prisma.webAuthnCredential.findMany({
          where: { userId, isActive: true },
          select: {
            credentialID: true,
            transports: true,
          },
        });

        allowCredentials = userCredentials.map(cred => ({
          id: Buffer.from(cred.credentialID, 'base64url'),
          type: 'public-key',
          transports: cred.transports,
        }));
      }

      const options = await generateAuthenticationOptions({
        rpID,
        timeout: 60000,
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
        userVerification: 'preferred',
      });

      // Store challenge temporarily (in production, use Redis or session)
      const challengeKey = crypto.randomUUID();
      
      // For now, store in database (replace with Redis in production)
      await prisma.user.updateMany({
        where: userId ? { id: userId } : {},
        data: {
          twoFactorSecret: JSON.stringify({
            challenge: options.challenge,
            timestamp: Date.now(),
            challengeKey,
          }),
        },
      });

      return {
        success: true,
        options,
        challengeKey,
      };
    } catch (error) {
      console.error('Error generating WebAuthn authentication options:', error);
      return {
        success: false,
        message: 'Failed to generate biometric authentication options',
        error: error.message,
      };
    }
  }

  /**
   * Verify authentication response
   * @param {Object} response - WebAuthn authentication response
   * @param {string} challengeKey - Challenge key for verification
   */
  static async verifyAuthenticationResponse(response, challengeKey) {
    try {
      const credentialID = Buffer.from(response.id, 'base64url').toString('base64url');

      // Find the credential
      const credential = await prisma.webAuthnCredential.findFirst({
        where: {
          credentialID,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              twoFactorSecret: true,
            },
          },
        },
      });

      if (!credential) {
        return {
          success: false,
          message: 'Biometric credential not found',
        };
      }

      // Verify challenge
      if (!credential.user.twoFactorSecret) {
        return {
          success: false,
          message: 'No authentication challenge found',
        };
      }

      const challengeData = JSON.parse(credential.user.twoFactorSecret);
      const { challenge, timestamp } = challengeData;

      // Check if challenge is still valid
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        return {
          success: false,
          message: 'Authentication challenge expired',
        };
      }

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: {
          credentialID: Buffer.from(credential.credentialID, 'base64url'),
          credentialPublicKey: credential.credentialPublicKey,
          counter: credential.counter,
        },
      });

      if (!verification.verified) {
        await this.logSecurityEvent(credential.userId, 'MFA_FAILURE', {
          method: 'webauthn',
          credentialID: credential.credentialID,
        });

        return {
          success: false,
          message: 'Biometric authentication failed',
        };
      }

      // Update credential counter and last used
      await prisma.webAuthnCredential.update({
        where: { id: credential.id },
        data: {
          counter: verification.authenticationInfo.newCounter,
          lastUsed: new Date(),
        },
      });

      // Clear challenge
      await prisma.user.update({
        where: { id: credential.userId },
        data: { twoFactorSecret: null },
      });

      // Log successful authentication
      await this.logSecurityEvent(credential.userId, 'MFA_SUCCESS', {
        method: 'webauthn',
        credentialID: credential.credentialID,
      });

      return {
        success: true,
        message: 'Biometric authentication successful',
        user: credential.user,
      };
    } catch (error) {
      console.error('Error verifying WebAuthn authentication:', error);
      return {
        success: false,
        message: 'Failed to verify biometric authentication',
        error: error.message,
      };
    }
  }

  /**
   * Get user's biometric credentials
   * @param {string} userId - User ID
   */
  static async getUserCredentials(userId) {
    try {
      const credentials = await prisma.webAuthnCredential.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          credentialID: true,
          deviceType: true,
          nickname: true,
          lastUsed: true,
          createdAt: true,
          transports: true,
        },
        orderBy: { lastUsed: 'desc' },
      });

      return {
        success: true,
        credentials,
      };
    } catch (error) {
      console.error('Error fetching user credentials:', error);
      return {
        success: false,
        message: 'Failed to fetch biometric credentials',
        error: error.message,
      };
    }
  }

  /**
   * Delete a biometric credential
   * @param {string} userId - User ID
   * @param {string} credentialId - Credential ID to delete
   */
  static async deleteCredential(userId, credentialId) {
    try {
      const credential = await prisma.webAuthnCredential.findFirst({
        where: {
          id: credentialId,
          userId,
          isActive: true,
        },
      });

      if (!credential) {
        return {
          success: false,
          message: 'Credential not found',
        };
      }

      // Soft delete by marking as inactive
      await prisma.webAuthnCredential.update({
        where: { id: credentialId },
        data: { isActive: false },
      });

      // Log security event
      await this.logSecurityEvent(userId, 'CREDENTIAL_DELETED', {
        credentialID: credential.credentialID,
        nickname: credential.nickname,
      });

      return {
        success: true,
        message: 'Biometric credential deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting credential:', error);
      return {
        success: false,
        message: 'Failed to delete biometric credential',
        error: error.message,
      };
    }
  }

  /**
   * Log security event
   * @param {string} userId - User ID
   * @param {string} eventType - Event type
   * @param {Object} details - Event details
   * @param {number} riskScore - Risk score (0-100)
   */
  static async logSecurityEvent(userId, eventType, details = {}, riskScore = 0) {
    try {
      await prisma.securityEvent.create({
        data: {
          userId,
          eventType,
          details,
          riskScore,
          ipAddress: details.ipAddress,
          userAgent: details.userAgent,
          deviceId: details.deviceId,
        },
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }
}

module.exports = BiometricAuthService;