/**
 * Enhanced Document Detection Service
 * Phase 3: Multi-document support and improved natural language understanding
 */

const { findAssetByMention } = require('./AssetLookup');

/**
 * Detect multiple documents mentioned in a message
 * Supports patterns like:
 * - "send both X and Y"
 * - "attach X, Y, and Z"
 * - "send X and Y documents"
 * - "including X and the Y document"
 */
async function findMultipleAssetsByMention(prisma, message) {
  try {
    const text = String(message || '');
    const lower = text.toLowerCase();
    
    // Common conjunction patterns
    const conjunctions = ['and', ',', '&', 'plus', 'include', 'including', 'also', 'along with'];
    const assetMentions = [];
    
    // Strategy 1: Split by conjunctions and try to find assets in each segment
    let segments = [text];
    
    // Split by common conjunctions
    for (const conj of conjunctions) {
      const newSegments = [];
      for (const seg of segments) {
        const parts = seg.split(new RegExp(`\\b${conj}\\b`, 'i'));
        newSegments.push(...parts);
      }
      segments = newSegments;
    }
    
    // Also try splitting by commas
    const commaSegments = [];
    for (const seg of segments) {
      commaSegments.push(...seg.split(',').map(s => s.trim()));
    }
    segments = [...new Set([...segments, ...commaSegments])];
    
    // Strategy 2: Find individual document mentions using patterns
    const patterns = [
      /(?:the|a|an)?\s*([\w\s\-\.]+(?:document|file|pdf|docx|checklist|form|report|estimate|contract|warranty|inspection|packet|sheet))/gi,
      /(?:send|attach|include|sharing|share|forward|email)?\s*(?:the|a|an)?\s*"?([\w\s\-\.]+)"?\s*(?:document|file|pdf|docx|checklist|form|report|estimate|contract|warranty|inspection|packet|sheet)?/gi,
      /"([^"]+)"/g, // Quoted strings
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g // Capitalized phrases (like "Upfront Start The Day Checklist")
    ];
    
    const potentialMentions = new Set();
    
    // Extract from patterns
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] || match[0]) {
          const mention = (match[1] || match[0]).trim();
          if (mention.length > 3 && mention.length < 100) {
            potentialMentions.add(mention);
          }
        }
      }
    }
    
    // Add segments that contain document-related keywords
    for (const seg of segments) {
      const segLower = seg.toLowerCase();
      if (segLower.match(/document|file|pdf|docx|checklist|form|report|estimate|contract|warranty|inspection|packet|sheet/i)) {
        potentialMentions.add(seg.trim());
      }
    }
    
    // Strategy 3: Try to find assets for each potential mention
    const foundAssets = [];
    const foundAssetIds = new Set();
    
    // First, try the whole message (might catch single document)
    const wholeMessageAsset = await findAssetByMention(prisma, text);
    if (wholeMessageAsset && !foundAssetIds.has(wholeMessageAsset.id)) {
      foundAssets.push(wholeMessageAsset);
      if (wholeMessageAsset.id) foundAssetIds.add(wholeMessageAsset.id);
    }
    
    // Then try each potential mention
    for (const mention of potentialMentions) {
      if (mention.length < 4) continue; // Skip very short mentions
      
      try {
        const asset = await findAssetByMention(prisma, mention);
        if (asset && !foundAssetIds.has(asset.id || mention)) {
          foundAssets.push(asset);
          if (asset.id) {
            foundAssetIds.add(asset.id);
          } else {
            foundAssetIds.add(mention); // Use mention as fallback ID
          }
        }
      } catch (e) {
        // Skip individual failures
      }
    }
    
    // Deduplicate by ID
    const uniqueAssets = [];
    const seenIds = new Set();
    for (const asset of foundAssets) {
      const id = asset.id || asset.title;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueAssets.push(asset);
      }
    }
    
    return uniqueAssets.length > 0 ? uniqueAssets : null;
  } catch (e) {
    console.warn('Enhanced document detection failed:', e);
    // Fallback to single asset detection
    try {
      const singleAsset = await findAssetByMention(prisma, message);
      return singleAsset ? [singleAsset] : null;
    } catch (_) {
      return null;
    }
  }
}

/**
 * Enhanced intent detection for action types
 * Improves natural language understanding for task creation, reminders, emails
 */
function detectIntent(message) {
  const text = String(message || '').toLowerCase();
  const intents = {
    createTask: false,
    createReminder: false,
    sendEmail: false,
    sendMessage: false,
    attachDocument: false,
    queryData: false,
    updateProject: false,
    updateCustomer: false
  };
  
  // Task creation patterns
  const taskPatterns = [
    /\b(?:create|add|make|new|assign|set up|set)\s+(?:a|an|the)?\s*(?:task|todo|to-do|assignment|item)\b/,
    /\b(?:task|todo|to-do|assignment)\s+(?:for|to|on|about)\b/,
    /\b(?:need|require|wants)\s+(?:a|an|the)?\s*(?:task|todo)\b/,
    /\b(?:remind\s+(?:me|us|someone|team)\s+)?(?:to|about|that)\s+(?:we|i|someone|team)\s+(?:need|should|must|have to)\b/,
    /\bassign\s+(?:task|todo|work|item)\b/,
    /\bdue\s+(?:date|by|on)\b/ // Implies task with due date
  ];
  
  // Reminder/calendar patterns
  const reminderPatterns = [
    /\b(?:create|add|make|new|set|schedule)\s+(?:a|an|the)?\s*(?:reminder|calendar\s+event|event|meeting|appointment|deadline)\b/,
    /\bremind\s+(?:me|us|someone|team)\s+(?:to|about|that|on|at)\b/,
    /\b(?:reminder|event|meeting|appointment)\s+(?:for|to|on|about|at)\b/,
    /\b(?:calendar|schedule|on|at)\s+(?:tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2})/,
    /\b(?:at|@)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/ // Time mentions
  ];
  
  // Email sending patterns
  const emailPatterns = [
    /\b(?:send|email|e-mail|mail)\s+(?:a|an|the)?\s*(?:email|message|note|notification)\b/,
    /\b(?:send|email|e-mail|mail)\s+(?:to|them|him|her|someone|customer|client)\b/,
    /\b(?:email|e-mail|mail)\s+(?:the|a|an|this|that|them|him|her|someone|customer|client)\b/,
    /\b(?:notify|notify|inform)\s+(?:via|by)?\s*(?:email|e-mail)\b/
  ];
  
  // Message sending patterns
  const messagePatterns = [
    /\b(?:send|post|share)\s+(?:a|an|the)?\s*(?:message|note|update|notification)\b/,
    /\b(?:message|tell|inform|update|notify)\s+(?:the|a|an|someone|team|them|customer|client)\b/,
    /\bsend\s+(?:a|an|the)?\s*message\s+(?:that|saying|to|for)\b/
  ];
  
  // Document attachment patterns
  const documentPatterns = [
    /\b(?:send|attach|include|share|forward)\s+(?:the|a|an)?\s*(?:document|file|pdf|docx|checklist|form|report|estimate|contract|warranty)\b/,
    /\b(?:attach|include|with|along with|plus)\s+(?:the|a|an)?\s*(?:document|file|pdf|docx|checklist|form|report)\b/,
    /\bdocument|file|pdf|docx|checklist|form|report|estimate|contract|warranty|inspection|packet\b/ // Any document mention
  ];
  
  // Data query patterns
  const queryPatterns = [
    /\b(?:show|list|display|find|get|fetch|search|look\s+up|what|which|when|where|who|how)\s+(?:me|us|all|the|a|an)?/,
    /\b(?:how\s+many|how\s+much|what\s+(?:is|are|was|were)|which|when|where|who)\b/,
    /\b(?:status|progress|details|info|information|summary|overview)\s+(?:of|for|on|about)\b/
  ];
  
  // Update patterns
  const updatePatterns = [
    /\b(?:update|change|modify|edit|set|alter)\s+(?:the|a|an)?\s*(?:project|customer|task|reminder|info|information|details)\b/
  ];
  
  // Check patterns
  for (const pattern of taskPatterns) {
    if (pattern.test(text)) {
      intents.createTask = true;
      break;
    }
  }
  
  for (const pattern of reminderPatterns) {
    if (pattern.test(text)) {
      intents.createReminder = true;
      break;
    }
  }
  
  for (const pattern of emailPatterns) {
    if (pattern.test(text)) {
      intents.sendEmail = true;
      break;
    }
  }
  
  for (const pattern of messagePatterns) {
    if (pattern.test(text)) {
      intents.sendMessage = true;
      break;
    }
  }
  
  for (const pattern of documentPatterns) {
    if (pattern.test(text)) {
      intents.attachDocument = true;
      break;
    }
  }
  
  for (const pattern of queryPatterns) {
    if (pattern.test(text)) {
      intents.queryData = true;
      break;
    }
  }
  
  for (const pattern of updatePatterns) {
    if (pattern.test(text)) {
      if (text.match(/project/)) intents.updateProject = true;
      if (text.match(/customer/)) intents.updateCustomer = true;
      break;
    }
  }
  
  return intents;
}

module.exports = {
  findMultipleAssetsByMention,
  detectIntent
};

