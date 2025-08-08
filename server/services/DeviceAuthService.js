const crypto = require('crypto');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class DeviceAuthService {
  /**
   * Generate device fingerprint from request headers and client data
   * @param {Object} req - Express request object
   * @param {Object} clientFingerprint - Client-side fingerprint data
   */
  static generateDeviceFingerprint(req, clientFingerprint = {}) {
    const ua = new UAParser(req.headers['user-agent']);
    const uaResult = ua.getResult();

    // Collect device characteristics
    const deviceData = {
      // User Agent components
      browser: {
        name: uaResult.browser.name,
        version: uaResult.browser.version?.split('.')[0], // Major version only
      },
      os: {
        name: uaResult.os.name,
        version: uaResult.os.version?.split('.')[0], // Major version only
      },
      device: {
        type: uaResult.device.type || 'desktop',
        vendor: uaResult.device.vendor,
        model: uaResult.device.model,
      },
      engine: {
        name: uaResult.engine.name,
        version: uaResult.engine.version?.split('.')[0],
      },
      // Network characteristics
      ip: this.getClientIP(req),
      acceptLanguage: req.headers['accept-language']?.split(',')[0],
      acceptEncoding: req.headers['accept-encoding'],
      // Client-side fingerprint data
      ...clientFingerprint,
    };

    // Create consistent fingerprint hash
    const fingerprintString = JSON.stringify(deviceData, Object.keys(deviceData).sort());
    return crypto.createHash('sha256').update(fingerprintString).digest('hex');
  }

  /**
   * Register or identify a device
   * @param {string} userId - User ID
   * @param {Object} req - Express request object
   * @param {Object} clientFingerprint - Client-side fingerprint data
   */
  static async registerDevice(userId, req, clientFingerprint = {}) {
    try {
      const fingerprint = this.generateDeviceFingerprint(req, clientFingerprint);
      const ua = new UAParser(req.headers['user-agent']);
      const uaResult = ua.getResult();
      const ip = this.getClientIP(req);
      const location = geoip.lookup(ip);

      // Check if device already exists
      let device = await prisma.userDevice.findUnique({
        where: { deviceFingerprint: fingerprint },
      });

      if (device) {
        // Update existing device
        device = await prisma.userDevice.update({
          where: { id: device.id },
          data: {
            lastUsed: new Date(),
            ipAddress: ip,
            location: location ? {
              country: location.country,
              region: location.region,
              city: location.city,
              timezone: location.timezone,
              ll: location.ll, // lat/long
            } : null,
          },
        });

        // Check for suspicious activity
        await this.analyzeSuspiciousActivity(device, ip, location);
      } else {
        // Create new device
        const deviceName = this.generateDeviceName(uaResult, clientFingerprint);
        
        device = await prisma.userDevice.create({
          data: {
            userId,
            deviceFingerprint: fingerprint,
            deviceName,
            deviceType: this.getDeviceType(uaResult, clientFingerprint),
            userAgent: req.headers['user-agent'],
            ipAddress: ip,
            location: location ? {
              country: location.country,
              region: location.region,
              city: location.city,
              timezone: location.timezone,
              ll: location.ll,
            } : null,
            trusted: false, // New devices are untrusted by default
            lastUsed: new Date(),
          },
        });

        // Log new device event
        await this.logSecurityEvent(userId, 'DEVICE_NEW', {
          deviceFingerprint: fingerprint,
          deviceName,
          deviceType: device.deviceType,
          ipAddress: ip,
          location,
          userAgent: req.headers['user-agent'],
        });
      }

      return {
        success: true,
        device,
        isNewDevice: !device.trusted,
        riskScore: this.calculateDeviceRiskScore(device, ip, location),
      };
    } catch (error) {
      console.error('Error registering device:', error);
      return {
        success: false,
        message: 'Failed to register device',
        error: error.message,
      };
    }
  }

  /**
   * Verify device trustworthiness
   * @param {string} deviceFingerprint - Device fingerprint
   * @param {string} userId - User ID
   */
  static async verifyDevice(deviceFingerprint, userId) {
    try {
      const device = await prisma.userDevice.findFirst({
        where: {
          deviceFingerprint,
          userId,
          isActive: true,
        },
      });

      if (!device) {
        return {
          success: false,
          message: 'Device not found',
          riskScore: 90, // High risk for unknown devices
        };
      }

      const riskScore = this.calculateDeviceRiskScore(device);
      
      return {
        success: true,
        device,
        trusted: device.trusted,
        riskScore,
      };
    } catch (error) {
      console.error('Error verifying device:', error);
      return {
        success: false,
        message: 'Failed to verify device',
        error: error.message,
        riskScore: 100, // Maximum risk on error
      };
    }
  }

  /**
   * Trust a device
   * @param {string} userId - User ID
   * @param {string} deviceId - Device ID
   */
  static async trustDevice(userId, deviceId) {
    try {
      const device = await prisma.userDevice.findFirst({
        where: {
          id: deviceId,
          userId,
          isActive: true,
        },
      });

      if (!device) {
        return {
          success: false,
          message: 'Device not found',
        };
      }

      await prisma.userDevice.update({
        where: { id: deviceId },
        data: { trusted: true },
      });

      // Log device trusted event
      await this.logSecurityEvent(userId, 'DEVICE_TRUSTED', {
        deviceId,
        deviceFingerprint: device.deviceFingerprint,
        deviceName: device.deviceName,
      });

      return {
        success: true,
        message: 'Device trusted successfully',
      };
    } catch (error) {
      console.error('Error trusting device:', error);
      return {
        success: false,
        message: 'Failed to trust device',
        error: error.message,
      };
    }
  }

  /**
   * Remove a device
   * @param {string} userId - User ID
   * @param {string} deviceId - Device ID
   */
  static async removeDevice(userId, deviceId) {
    try {
      const device = await prisma.userDevice.findFirst({
        where: {
          id: deviceId,
          userId,
        },
      });

      if (!device) {
        return {
          success: false,
          message: 'Device not found',
        };
      }

      // Soft delete by marking as inactive
      await prisma.userDevice.update({
        where: { id: deviceId },
        data: { isActive: false },
      });

      // Log device removal event
      await this.logSecurityEvent(userId, 'DEVICE_REMOVED', {
        deviceId,
        deviceFingerprint: device.deviceFingerprint,
        deviceName: device.deviceName,
      });

      return {
        success: true,
        message: 'Device removed successfully',
      };
    } catch (error) {
      console.error('Error removing device:', error);
      return {
        success: false,
        message: 'Failed to remove device',
        error: error.message,
      };
    }
  }

  /**
   * Get user's devices
   * @param {string} userId - User ID
   */
  static async getUserDevices(userId) {
    try {
      const devices = await prisma.userDevice.findMany({
        where: {
          userId,
          isActive: true,
        },
        select: {
          id: true,
          deviceName: true,
          deviceType: true,
          trusted: true,
          biometricEnabled: true,
          lastUsed: true,
          createdAt: true,
          ipAddress: true,
          location: true,
        },
        orderBy: { lastUsed: 'desc' },
      });

      return {
        success: true,
        devices,
      };
    } catch (error) {
      console.error('Error fetching user devices:', error);
      return {
        success: false,
        message: 'Failed to fetch devices',
        error: error.message,
      };
    }
  }

  /**
   * Analyze suspicious activity for a device
   * @param {Object} device - Device object
   * @param {string} currentIP - Current IP address
   * @param {Object} currentLocation - Current location data
   */
  static async analyzeSuspiciousActivity(device, currentIP, currentLocation) {
    try {
      const suspiciousEvents = [];
      let riskScore = 0;

      // Check for IP address changes
      if (device.ipAddress && device.ipAddress !== currentIP) {
        const previousLocation = device.location;
        
        if (previousLocation && currentLocation) {
          // Calculate distance between locations
          const distance = this.calculateDistance(
            previousLocation.ll,
            currentLocation.ll
          );

          // Suspicious if location changed significantly in short time
          const timeDiff = new Date() - new Date(device.lastUsed);
          const hoursDiff = timeDiff / (1000 * 60 * 60);

          if (distance > 100 && hoursDiff < 24) {
            suspiciousEvents.push('rapid_location_change');
            riskScore += 40;
          }

          if (previousLocation.country !== currentLocation.country) {
            suspiciousEvents.push('country_change');
            riskScore += 30;
          }
        }

        // Log location change
        await this.logSecurityEvent(device.userId, 'LOCATION_NEW', {
          deviceId: device.id,
          previousIP: device.ipAddress,
          currentIP,
          previousLocation: device.location,
          currentLocation,
          riskScore,
        });
      }

      // If suspicious activity detected, log it
      if (suspiciousEvents.length > 0) {
        await this.logSecurityEvent(device.userId, 'DEVICE_SUSPICIOUS', {
          deviceId: device.id,
          events: suspiciousEvents,
          riskScore,
          deviceFingerprint: device.deviceFingerprint,
        });
      }

      return riskScore;
    } catch (error) {
      console.error('Error analyzing suspicious activity:', error);
      return 0;
    }
  }

  /**
   * Calculate device risk score
   * @param {Object} device - Device object
   * @param {string} currentIP - Current IP (optional)
   * @param {Object} currentLocation - Current location (optional)
   */
  static calculateDeviceRiskScore(device, currentIP = null, currentLocation = null) {
    let riskScore = 0;

    // New device risk
    if (!device.trusted) {
      riskScore += 30;
    }

    // Time since last use
    const daysSinceLastUse = (Date.now() - new Date(device.lastUsed)) / (1000 * 60 * 60 * 24);
    if (daysSinceLastUse > 30) {
      riskScore += 20;
    }

    // Location analysis if current data available
    if (currentIP && currentLocation && device.location) {
      const distance = this.calculateDistance(
        device.location.ll,
        currentLocation.ll
      );

      if (distance > 500) {
        riskScore += 25;
      }

      if (device.location.country !== currentLocation.country) {
        riskScore += 20;
      }
    }

    return Math.min(riskScore, 100); // Cap at 100
  }

  /**
   * Generate user-friendly device name
   * @param {Object} uaResult - User agent parse result
   * @param {Object} clientFingerprint - Client fingerprint data
   */
  static generateDeviceName(uaResult, clientFingerprint) {
    const browser = uaResult.browser.name || 'Unknown Browser';
    const os = uaResult.os.name || 'Unknown OS';
    const deviceType = this.getDeviceType(uaResult, clientFingerprint);

    return `${browser} on ${os} (${deviceType})`;
  }

  /**
   * Determine device type
   * @param {Object} uaResult - User agent parse result  
   * @param {Object} clientFingerprint - Client fingerprint data
   */
  static getDeviceType(uaResult, clientFingerprint) {
    if (uaResult.device.type) {
      return uaResult.device.type;
    }

    // Use client-side data if available
    if (clientFingerprint.isMobile) return 'mobile';
    if (clientFingerprint.isTablet) return 'tablet';

    // Default to desktop
    return 'desktop';
  }

  /**
   * Extract client IP address
   * @param {Object} req - Express request object
   */
  static getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           req.ip;
  }

  /**
   * Calculate distance between two coordinates
   * @param {Array} coord1 - [lat, lng] of first point
   * @param {Array} coord2 - [lat, lng] of second point
   */
  static calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2 || coord1.length !== 2 || coord2.length !== 2) {
      return 0;
    }

    const [lat1, lon1] = coord1;
    const [lat2, lon2] = coord2;

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees
   */
  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
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
          riskScore: details.riskScore || 0,
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

module.exports = DeviceAuthService;