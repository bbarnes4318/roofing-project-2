const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class BehaviorAnalysisService {
  /**
   * Analyze keystroke dynamics
   * @param {Object} keystrokeData - Keystroke timing data
   * @param {string} userId - User ID
   */
  static async analyzeKeystrokeDynamics(keystrokeData, userId) {
    try {
      const { keystrokes, text } = keystrokeData;

      // Calculate keystroke metrics
      const dwellTimes = []; // Key press to release time
      const flightTimes = []; // Release to next press time
      const typingRhythm = [];

      for (let i = 0; i < keystrokes.length; i++) {
        const keystroke = keystrokes[i];
        
        // Dwell time (press to release)
        if (keystroke.pressTime && keystroke.releaseTime) {
          dwellTimes.push(keystroke.releaseTime - keystroke.pressTime);
        }

        // Flight time (release to next press)
        if (i < keystrokes.length - 1 && keystroke.releaseTime) {
          const nextPress = keystrokes[i + 1].pressTime;
          if (nextPress) {
            flightTimes.push(nextPress - keystroke.releaseTime);
          }
        }

        // Overall typing rhythm
        if (i > 0 && keystroke.pressTime) {
          typingRhythm.push(keystroke.pressTime - keystrokes[i - 1].pressTime);
        }
      }

      const patterns = {
        avgDwellTime: this.calculateAverage(dwellTimes),
        stdDwellTime: this.calculateStandardDeviation(dwellTimes),
        avgFlightTime: this.calculateAverage(flightTimes),
        stdFlightTime: this.calculateStandardDeviation(flightTimes),
        typingSpeed: text.length / (keystrokes[keystrokes.length - 1].pressTime - keystrokes[0].pressTime) * 1000, // chars per second
        rhythmConsistency: 1 / (1 + this.calculateStandardDeviation(typingRhythm)), // Higher = more consistent
        digraphPatterns: this.analyzeDigraphs(keystrokes, text),
        timestamp: new Date(),
      };

      // Store or update behavior pattern
      await this.updateBehaviorPattern(userId, 'keystroke', patterns);

      // Calculate anomaly score
      const anomalyScore = await this.calculateKeystrokeAnomalyScore(userId, patterns);

      return {
        success: true,
        patterns,
        anomalyScore,
        isAnomalous: anomalyScore > 0.7, // Threshold for anomaly detection
      };
    } catch (error) {
      console.error('Error analyzing keystroke dynamics:', error);
      return {
        success: false,
        message: 'Failed to analyze keystroke dynamics',
        error: error.message,
      };
    }
  }

  /**
   * Analyze mouse movement patterns
   * @param {Object} mouseData - Mouse movement data
   * @param {string} userId - User ID
   */
  static async analyzeMousePatterns(mouseData, userId) {
    try {
      const { movements, clicks } = mouseData;

      // Calculate mouse movement metrics
      const velocities = [];
      const accelerations = [];
      const curvatures = [];
      const totalDistance = 0;

      for (let i = 1; i < movements.length; i++) {
        const prev = movements[i - 1];
        const curr = movements[i];
        const timeDiff = curr.timestamp - prev.timestamp;

        if (timeDiff > 0) {
          // Calculate velocity
          const distance = Math.sqrt(
            Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
          );
          const velocity = distance / timeDiff;
          velocities.push(velocity);

          // Calculate acceleration
          if (i > 1 && velocities.length > 1) {
            const acceleration = (velocity - velocities[velocities.length - 2]) / timeDiff;
            accelerations.push(acceleration);
          }

          // Calculate curvature (change in direction)
          if (i > 1) {
            const prevAngle = Math.atan2(prev.y - movements[i - 2].y, prev.x - movements[i - 2].x);
            const currAngle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const curvature = Math.abs(currAngle - prevAngle);
            curvatures.push(curvature);
          }
        }
      }

      // Analyze click patterns
      const clickIntervals = [];
      for (let i = 1; i < clicks.length; i++) {
        clickIntervals.push(clicks[i].timestamp - clicks[i - 1].timestamp);
      }

      const patterns = {
        avgVelocity: this.calculateAverage(velocities),
        stdVelocity: this.calculateStandardDeviation(velocities),
        avgAcceleration: this.calculateAverage(accelerations),
        avgCurvature: this.calculateAverage(curvatures),
        movementSmoothness: 1 / (1 + this.calculateStandardDeviation(velocities)), // Higher = smoother
        clickRhythm: this.calculateAverage(clickIntervals),
        clickConsistency: 1 / (1 + this.calculateStandardDeviation(clickIntervals)),
        pausePatterns: this.analyzePausePatterns(movements),
        timestamp: new Date(),
      };

      // Store or update behavior pattern
      await this.updateBehaviorPattern(userId, 'mouse', patterns);

      // Calculate anomaly score
      const anomalyScore = await this.calculateMouseAnomalyScore(userId, patterns);

      return {
        success: true,
        patterns,
        anomalyScore,
        isAnomalous: anomalyScore > 0.7,
      };
    } catch (error) {
      console.error('Error analyzing mouse patterns:', error);
      return {
        success: false,
        message: 'Failed to analyze mouse patterns',
        error: error.message,
      };
    }
  }

  /**
   * Analyze touch/gesture patterns for mobile devices
   * @param {Object} touchData - Touch interaction data
   * @param {string} userId - User ID
   */
  static async analyzeTouchPatterns(touchData, userId) {
    try {
      const { touches, gestures } = touchData;

      const patterns = {
        avgTouchPressure: this.calculateAverage(touches.map(t => t.pressure || 1)),
        avgTouchArea: this.calculateAverage(touches.map(t => t.radiusX * t.radiusY || 1)),
        swipeVelocities: this.analyzeSwipeVelocities(gestures.filter(g => g.type === 'swipe')),
        tapRhythm: this.analyzeTapRhythm(gestures.filter(g => g.type === 'tap')),
        gestureComplexity: this.calculateGestureComplexity(gestures),
        timestamp: new Date(),
      };

      // Store or update behavior pattern
      await this.updateBehaviorPattern(userId, 'touch', patterns);

      // Calculate anomaly score
      const anomalyScore = await this.calculateTouchAnomalyScore(userId, patterns);

      return {
        success: true,
        patterns,
        anomalyScore,
        isAnomalous: anomalyScore > 0.7,
      };
    } catch (error) {
      console.error('Error analyzing touch patterns:', error);
      return {
        success: false,
        message: 'Failed to analyze touch patterns',
        error: error.message,
      };
    }
  }

  /**
   * Analyze usage patterns (navigation, timing, etc.)
   * @param {Object} usageData - Usage pattern data
   * @param {string} userId - User ID
   */
  static async analyzeUsagePatterns(usageData, userId) {
    try {
      const { pageViews, interactions, sessionData } = usageData;

      const patterns = {
        sessionDuration: sessionData.duration,
        pagesPerSession: pageViews.length,
        avgTimePerPage: sessionData.duration / pageViews.length,
        navigationPatterns: this.analyzeNavigationFlow(pageViews),
        interactionFrequency: interactions.length / sessionData.duration,
        preferredFeatures: this.identifyPreferredFeatures(interactions),
        timeOfDayPattern: new Date().getHours(), // Current hour
        timestamp: new Date(),
      };

      // Store or update behavior pattern
      await this.updateBehaviorPattern(userId, 'usage', patterns);

      // Calculate anomaly score
      const anomalyScore = await this.calculateUsageAnomalyScore(userId, patterns);

      return {
        success: true,
        patterns,
        anomalyScore,
        isAnomalous: anomalyScore > 0.7,
      };
    } catch (error) {
      console.error('Error analyzing usage patterns:', error);
      return {
        success: false,
        message: 'Failed to analyze usage patterns',
        error: error.message,
      };
    }
  }

  /**
   * Update behavior pattern in database
   * @param {string} userId - User ID
   * @param {string} type - Pattern type (keystroke, mouse, touch, usage)
   * @param {Object} patterns - Pattern data
   */
  static async updateBehaviorPattern(userId, type, patterns) {
    try {
      const existingPattern = await prisma.userBehaviorPattern.findUnique({
        where: { userId },
      });

      const patternField = `${type}Patterns`;
      const updateData = {
        [patternField]: patterns,
        lastAnalysis: new Date(),
      };

      if (existingPattern) {
        // Update existing pattern
        await prisma.userBehaviorPattern.update({
          where: { userId },
          data: updateData,
        });
      } else {
        // Create new pattern record
        await prisma.userBehaviorPattern.create({
          data: {
            userId,
            ...updateData,
            riskBaseline: 0.3, // Initial baseline
            anomalyThreshold: 0.7, // Initial threshold
          },
        });
      }
    } catch (error) {
      console.error('Error updating behavior pattern:', error);
    }
  }

  /**
   * Calculate keystroke anomaly score
   * @param {string} userId - User ID
   * @param {Object} currentPatterns - Current keystroke patterns
   */
  static async calculateKeystrokeAnomalyScore(userId, currentPatterns) {
    try {
      const behaviorPattern = await prisma.userBehaviorPattern.findUnique({
        where: { userId },
      });

      if (!behaviorPattern?.keystrokePatterns) {
        return 0.3; // Default score for new users
      }

      const baseline = behaviorPattern.keystrokePatterns;
      let anomalyScore = 0;
      let factors = 0;

      // Compare key metrics
      const metrics = [
        'avgDwellTime',
        'avgFlightTime',
        'typingSpeed',
        'rhythmConsistency'
      ];

      for (const metric of metrics) {
        if (baseline[metric] && currentPatterns[metric]) {
          const deviation = Math.abs(currentPatterns[metric] - baseline[metric]) / baseline[metric];
          anomalyScore += deviation;
          factors++;
        }
      }

      return factors > 0 ? anomalyScore / factors : 0.3;
    } catch (error) {
      console.error('Error calculating keystroke anomaly score:', error);
      return 0.5; // Default moderate risk
    }
  }

  /**
   * Calculate mouse anomaly score
   * @param {string} userId - User ID
   * @param {Object} currentPatterns - Current mouse patterns
   */
  static async calculateMouseAnomalyScore(userId, currentPatterns) {
    try {
      const behaviorPattern = await prisma.userBehaviorPattern.findUnique({
        where: { userId },
      });

      if (!behaviorPattern?.mousePatterns) {
        return 0.3;
      }

      const baseline = behaviorPattern.mousePatterns;
      let anomalyScore = 0;
      let factors = 0;

      const metrics = ['avgVelocity', 'movementSmoothness', 'clickRhythm'];

      for (const metric of metrics) {
        if (baseline[metric] && currentPatterns[metric]) {
          const deviation = Math.abs(currentPatterns[metric] - baseline[metric]) / baseline[metric];
          anomalyScore += deviation;
          factors++;
        }
      }

      return factors > 0 ? anomalyScore / factors : 0.3;
    } catch (error) {
      console.error('Error calculating mouse anomaly score:', error);
      return 0.5;
    }
  }

  /**
   * Calculate touch anomaly score
   * @param {string} userId - User ID
   * @param {Object} currentPatterns - Current touch patterns
   */
  static async calculateTouchAnomalyScore(userId, currentPatterns) {
    // Similar implementation to mouse/keystroke
    return 0.3; // Simplified for demo
  }

  /**
   * Calculate usage anomaly score
   * @param {string} userId - User ID
   * @param {Object} currentPatterns - Current usage patterns
   */
  static async calculateUsageAnomalyScore(userId, currentPatterns) {
    // Similar implementation focusing on navigation and timing patterns
    return 0.3; // Simplified for demo
  }

  // Helper methods
  static calculateAverage(array) {
    return array.length > 0 ? array.reduce((a, b) => a + b, 0) / array.length : 0;
  }

  static calculateStandardDeviation(array) {
    const avg = this.calculateAverage(array);
    const squareDiffs = array.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(this.calculateAverage(squareDiffs));
  }

  static analyzeDigraphs(keystrokes, text) {
    const digraphs = {};
    for (let i = 0; i < text.length - 1; i++) {
      const pair = text.substring(i, i + 2);
      if (!digraphs[pair]) {
        digraphs[pair] = [];
      }
      if (keystrokes[i + 1] && keystrokes[i]) {
        digraphs[pair].push(keystrokes[i + 1].pressTime - keystrokes[i].pressTime);
      }
    }
    return digraphs;
  }

  static analyzePausePatterns(movements) {
    const pauses = [];
    let lastMovement = movements[0];
    
    for (let i = 1; i < movements.length; i++) {
      const timeDiff = movements[i].timestamp - lastMovement.timestamp;
      if (timeDiff > 100) { // Pause threshold: 100ms
        pauses.push(timeDiff);
      }
      lastMovement = movements[i];
    }
    
    return {
      avgPauseDuration: this.calculateAverage(pauses),
      pauseFrequency: pauses.length / movements.length,
    };
  }

  static analyzeSwipeVelocities(swipes) {
    return swipes.map(swipe => {
      const distance = Math.sqrt(
        Math.pow(swipe.endX - swipe.startX, 2) + 
        Math.pow(swipe.endY - swipe.startY, 2)
      );
      return distance / swipe.duration;
    });
  }

  static analyzeTapRhythm(taps) {
    const intervals = [];
    for (let i = 1; i < taps.length; i++) {
      intervals.push(taps[i].timestamp - taps[i - 1].timestamp);
    }
    return {
      avgInterval: this.calculateAverage(intervals),
      rhythmConsistency: 1 / (1 + this.calculateStandardDeviation(intervals)),
    };
  }

  static calculateGestureComplexity(gestures) {
    return gestures.reduce((complexity, gesture) => {
      switch (gesture.type) {
        case 'tap': return complexity + 1;
        case 'swipe': return complexity + 2;
        case 'pinch': return complexity + 3;
        case 'rotate': return complexity + 4;
        default: return complexity + 1;
      }
    }, 0) / gestures.length;
  }

  static analyzeNavigationFlow(pageViews) {
    const flow = {};
    for (let i = 1; i < pageViews.length; i++) {
      const from = pageViews[i - 1].page;
      const to = pageViews[i].page;
      const transition = `${from}->${to}`;
      flow[transition] = (flow[transition] || 0) + 1;
    }
    return flow;
  }

  static identifyPreferredFeatures(interactions) {
    const features = {};
    interactions.forEach(interaction => {
      features[interaction.feature] = (features[interaction.feature] || 0) + 1;
    });
    return Object.keys(features).sort((a, b) => features[b] - features[a]).slice(0, 5);
  }

  /**
   * Get comprehensive behavior analysis for user
   * @param {string} userId - User ID
   */
  static async getUserBehaviorAnalysis(userId) {
    try {
      const behaviorPattern = await prisma.userBehaviorPattern.findUnique({
        where: { userId },
      });

      if (!behaviorPattern) {
        return {
          success: false,
          message: 'No behavior pattern found for user',
        };
      }

      return {
        success: true,
        behaviorPattern: {
          ...behaviorPattern,
          // Remove sensitive raw data, keep only analysis results
          keystrokePatterns: behaviorPattern.keystrokePatterns ? {
            typingSpeed: behaviorPattern.keystrokePatterns.typingSpeed,
            rhythmConsistency: behaviorPattern.keystrokePatterns.rhythmConsistency,
          } : null,
          mousePatterns: behaviorPattern.mousePatterns ? {
            movementSmoothness: behaviorPattern.mousePatterns.movementSmoothness,
            clickConsistency: behaviorPattern.mousePatterns.clickConsistency,
          } : null,
        },
      };
    } catch (error) {
      console.error('Error getting behavior analysis:', error);
      return {
        success: false,
        message: 'Failed to get behavior analysis',
        error: error.message,
      };
    }
  }
}

module.exports = BehaviorAnalysisService;