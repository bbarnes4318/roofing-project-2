const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class MFAService {
  /**
   * Generate TOTP secret and QR code for user
   * @param {string} userId - User ID
   * @param {string} userEmail - User's email for QR code label
   */
  static async generateTOTPSecret(userId, userEmail) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `Kenstruction (${userEmail})`,
        issuer: 'Kenstruction',
        length: 32,
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Store the secret temporarily (not enabled until verified)
      await prisma.userMFA.upsert({
        where: {
          userId_method: {
            userId,
            method: 'TOTP',
          },
        },
        update: {
          secret: this.encrypt(secret.base32),
          enabled: false, // Not enabled until first verification
        },
        create: {
          userId,
          method: 'TOTP',
          secret: this.encrypt(secret.base32),
          enabled: false,
        },
      });

      return {
        success: true,
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes: await this.generateBackupCodes(userId),
      };
    } catch (error) {
      console.error('Error generating TOTP secret:', error);
      return {
        success: false,
        message: 'Failed to generate TOTP secret',
        error: error.message,
      };
    }
  }

  /**
   * Verify TOTP token and enable MFA
   * @param {string} userId - User ID
   * @param {string} token - TOTP token from user
   */
  static async verifyTOTPSetup(userId, token) {
    try {
      const mfaRecord = await prisma.userMFA.findUnique({
        where: {
          userId_method: {
            userId,
            method: 'TOTP',
          },
        },
      });

      if (!mfaRecord || !mfaRecord.secret) {
        return {
          success: false,
          message: 'TOTP setup not found',
        };
      }

      const secret = this.decrypt(mfaRecord.secret);
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2, // Allow some time drift
      });

      if (!verified) {
        return {
          success: false,
          message: 'Invalid TOTP code',
        };
      }

      // Enable TOTP MFA
      await prisma.userMFA.update({
        where: { id: mfaRecord.id },
        data: {
          enabled: true,
          lastUsed: new Date(),
        },
      });

      // Log security event
      await this.logSecurityEvent(userId, 'MFA_ENABLED', {
        method: 'TOTP',
      });

      return {
        success: true,
        message: 'TOTP MFA enabled successfully',
      };
    } catch (error) {
      console.error('Error verifying TOTP setup:', error);
      return {
        success: false,
        message: 'Failed to verify TOTP setup',
        error: error.message,
      };
    }
  }

  /**
   * Verify TOTP token during login
   * @param {string} userId - User ID
   * @param {string} token - TOTP token from user
   */
  static async verifyTOTP(userId, token) {
    try {
      const mfaRecord = await prisma.userMFA.findFirst({
        where: {
          userId,
          method: 'TOTP',
          enabled: true,
        },
      });

      if (!mfaRecord || !mfaRecord.secret) {
        return {
          success: false,
          message: 'TOTP MFA not enabled for this user',
        };
      }

      const secret = this.decrypt(mfaRecord.secret);
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2, // Allow some time drift
      });

      if (!verified) {
        // Log failed attempt
        await this.logSecurityEvent(userId, 'MFA_FAILURE', {
          method: 'TOTP',
        });

        return {
          success: false,
          message: 'Invalid TOTP code',
        };
      }

      // Update last used
      await prisma.userMFA.update({
        where: { id: mfaRecord.id },
        data: { lastUsed: new Date() },
      });

      // Log successful verification
      await this.logSecurityEvent(userId, 'MFA_SUCCESS', {
        method: 'TOTP',
      });

      return {
        success: true,
        message: 'TOTP verification successful',
      };
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      return {
        success: false,
        message: 'Failed to verify TOTP',
        error: error.message,
      };
    }
  }

  /**
   * Generate backup codes for user
   * @param {string} userId - User ID
   */
  static async generateBackupCodes(userId) {
    try {
      // Generate 10 backup codes
      const codes = Array.from({ length: 10 }, () => 
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      // Encrypt backup codes
      const encryptedCodes = codes.map(code => this.encrypt(code));

      // Store backup codes
      await prisma.userMFA.upsert({
        where: {
          userId_method: {
            userId,
            method: 'BACKUP',
          },
        },
        update: {
          backupCodes: encryptedCodes,
          enabled: true,
        },
        create: {
          userId,
          method: 'BACKUP',
          backupCodes: encryptedCodes,
          enabled: true,
        },
      });

      return codes;
    } catch (error) {
      console.error('Error generating backup codes:', error);
      return [];
    }
  }

  /**
   * Verify backup code
   * @param {string} userId - User ID
   * @param {string} code - Backup code
   */
  static async verifyBackupCode(userId, code) {
    try {
      const mfaRecord = await prisma.userMFA.findFirst({
        where: {
          userId,
          method: 'BACKUP',
          enabled: true,
        },
      });

      if (!mfaRecord || !mfaRecord.backupCodes || mfaRecord.backupCodes.length === 0) {
        return {
          success: false,
          message: 'No backup codes available',
        };
      }

      // Check if code matches any backup code
      const normalizedCode = code.toUpperCase().replace(/\s/g, '');
      let validCodeIndex = -1;

      for (let i = 0; i < mfaRecord.backupCodes.length; i++) {
        const decryptedCode = this.decrypt(mfaRecord.backupCodes[i]);
        if (decryptedCode === normalizedCode) {
          validCodeIndex = i;
          break;
        }
      }

      if (validCodeIndex === -1) {
        await this.logSecurityEvent(userId, 'MFA_FAILURE', {
          method: 'BACKUP',
        });

        return {
          success: false,
          message: 'Invalid backup code',
        };
      }

      // Remove used backup code
      const remainingCodes = [...mfaRecord.backupCodes];
      remainingCodes.splice(validCodeIndex, 1);

      await prisma.userMFA.update({
        where: { id: mfaRecord.id },
        data: {
          backupCodes: remainingCodes,
          lastUsed: new Date(),
        },
      });

      // Log successful verification
      await this.logSecurityEvent(userId, 'MFA_SUCCESS', {
        method: 'BACKUP',
        remainingCodes: remainingCodes.length,
      });

      return {
        success: true,
        message: 'Backup code verification successful',
        remainingCodes: remainingCodes.length,
      };
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return {
        success: false,
        message: 'Failed to verify backup code',
        error: error.message,
      };
    }
  }

  /**
   * Get user's MFA methods
   * @param {string} userId - User ID
   */
  static async getUserMFAMethods(userId) {
    try {
      const methods = await prisma.userMFA.findMany({
        where: { userId, enabled: true },
        select: {
          method: true,
          lastUsed: true,
          phoneNumber: true,
          backupCodes: true,
        },
      });

      return {
        success: true,
        methods: methods.map(method => ({
          ...method,
          backupCodesCount: method.backupCodes ? method.backupCodes.length : 0,
          backupCodes: undefined, // Don't send actual codes
        })),
      };
    } catch (error) {
      console.error('Error fetching MFA methods:', error);
      return {
        success: false,
        message: 'Failed to fetch MFA methods',
        error: error.message,
      };
    }
  }

  /**
   * Disable MFA method
   * @param {string} userId - User ID
   * @param {string} method - MFA method to disable
   */
  static async disableMFAMethod(userId, method) {
    try {
      const mfaRecord = await prisma.userMFA.findFirst({
        where: {
          userId,
          method: method.toUpperCase(),
          enabled: true,
        },
      });

      if (!mfaRecord) {
        return {
          success: false,
          message: 'MFA method not found',
        };
      }

      await prisma.userMFA.update({
        where: { id: mfaRecord.id },
        data: { enabled: false },
      });

      // Log security event
      await this.logSecurityEvent(userId, 'MFA_DISABLED', {
        method: method.toUpperCase(),
      });

      return {
        success: true,
        message: `${method} MFA disabled successfully`,
      };
    } catch (error) {
      console.error('Error disabling MFA method:', error);
      return {
        success: false,
        message: 'Failed to disable MFA method',
        error: error.message,
      };
    }
  }

  /**
   * Check if user has any MFA enabled
   * @param {string} userId - User ID
   */
  static async userHasMFA(userId) {
    try {
      const mfaCount = await prisma.userMFA.count({
        where: {
          userId,
          enabled: true,
          method: { not: 'BACKUP' }, // Don't count backup codes alone
        },
      });

      return mfaCount > 0;
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return false;
    }
  }

  /**
   * Encrypt sensitive data
   * @param {string} text - Text to encrypt
   */
  static encrypt(text) {
    const key = process.env.MFA_ENCRYPTION_KEY || 'default-key-change-in-production';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedText - Encrypted text
   */
  static decrypt(encryptedText) {
    const key = process.env.MFA_ENCRYPTION_KEY || 'default-key-change-in-production';
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = parts.join(':');
    
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Log security event
   * @param {string} userId - User ID
   * @param {string} eventType - Event type
   * @param {Object} details - Event details
   */
  static async logSecurityEvent(userId, eventType, details = {}) {
    try {
      await prisma.securityEvent.create({
        data: {
          userId,
          eventType,
          details,
          riskScore: this.calculateRiskScore(eventType, details),
        },
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Calculate risk score for security events
   * @param {string} eventType - Event type
   * @param {Object} details - Event details
   */
  static calculateRiskScore(eventType, details) {
    switch (eventType) {
      case 'MFA_ENABLED':
        return 0; // Good security practice
      case 'MFA_DISABLED':
        return 30; // Moderate risk
      case 'MFA_FAILURE':
        return 50; // Higher risk
      case 'MFA_SUCCESS':
        return 0; // Normal operation
      default:
        return 10; // Default low risk
    }
  }
}

module.exports = MFAService;