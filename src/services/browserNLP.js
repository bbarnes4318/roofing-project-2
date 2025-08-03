/**
 * Browser-compatible Natural Language Processing for Search
 * Lightweight implementation that works in React without Node.js dependencies
 */

class BrowserNLP {
    constructor() {
        this.initializeNLP();
    }

    initializeNLP() {
        // Define entity patterns and intents for roofing domain
        this.entities = {
            status: {
                'completed': ['completed', 'finished', 'done', 'complete', 'closed'],
                'in-progress': ['in progress', 'ongoing', 'active', 'current', 'working', 'progress'],
                'not-started': ['not started', 'pending', 'new', 'upcoming'],
                'on-hold': ['on hold', 'paused', 'suspended', 'delayed', 'hold']
            },
            phase: {
                'LEAD': ['lead', 'leads', 'prospect'],
                'APPROVED': ['approved', 'approval', 'contract', 'contracted'],
                'EXECUTION': ['execution', 'construction', 'building', 'work', 'installing'],
                'COMPLETION': ['completion', 'completed', 'finished', 'done']
            },
            timeframe: {
                'today': ['today', 'this day'],
                'this-week': ['this week', 'current week'],
                'last-week': ['last week', 'past week', 'previous week'],
                'this-month': ['this month', 'current month'],
                'last-month': ['last month', 'past month', 'previous month'],
                'last-quarter': ['last quarter', 'past quarter', 'previous quarter', 'past 3 months'],
                'last-year': ['last year', 'past year', 'previous year']
            },
            projectType: {
                'roof': ['roof', 'roofing', 'roofs', 'shingle', 'shingles'],
                'repair': ['repair', 'repairs', 'fix', 'maintenance'],
                'replacement': ['replacement', 'replace', 'new roof'],
                'inspection': ['inspection', 'inspect', 'assessment']
            }
        };

        // Define intent patterns
        this.intentPatterns = [
            { pattern: /(?:show|find|list|get)\s+(?:me\s+)?(.+?)\s+projects?/i, intent: 'search.projects' },
            { pattern: /(?:show|find|list|get)\s+(?:me\s+)?(completed|finished|done)\s+projects?/i, intent: 'search.by.status' },
            { pattern: /(?:show|find|list|get)\s+(?:me\s+)?(in.progress|ongoing|active)\s+projects?/i, intent: 'search.by.status' },
            { pattern: /(?:show|find|list|get)\s+(?:me\s+)?projects?\s+from\s+(.+)/i, intent: 'search.by.timeframe' },
            { pattern: /(?:show|find|list|get)\s+(?:me\s+)?(lead|approved|execution|completion)\s+(?:phase\s+)?projects?/i, intent: 'search.by.phase' },
            { pattern: /(?:find|show)\s+(?:me\s+)?customer\s+(.+)/i, intent: 'search.customer' },
            { pattern: /(?:find|show)\s+(?:me\s+)?project\s+(.+)/i, intent: 'search.project' },
            { pattern: /(completed|finished|done)\s+projects?/i, intent: 'search.by.status' },
            { pattern: /(in.progress|ongoing|active)\s+projects?/i, intent: 'search.by.status' },
            { pattern: /projects?\s+from\s+(.+)/i, intent: 'search.by.timeframe' },
            { pattern: /(lead|approved|execution|completion)\s+projects?/i, intent: 'search.by.phase' },
            { pattern: /(roof|roofing|repair|replacement)\s+projects?/i, intent: 'search.by.type' }
        ];
    }

    async process(language, query) {
        const normalizedQuery = query.toLowerCase().trim();
        
        // Find matching intent
        let matchedIntent = 'None';
        let entities = [];
        let confidence = 0.3;

        for (const intentPattern of this.intentPatterns) {
            const match = normalizedQuery.match(intentPattern.pattern);
            if (match) {
                matchedIntent = intentPattern.intent;
                confidence = 0.8;
                
                // Extract entities based on the matched text
                const extractedText = match[1] || match[0];
                entities = this.extractEntities(extractedText, normalizedQuery);
                break;
            }
        }

        // If no pattern matched, try direct entity detection
        if (matchedIntent === 'None') {
            entities = this.extractEntities(normalizedQuery, normalizedQuery);
            if (entities.length > 0) {
                matchedIntent = this.determineIntentFromEntities(entities);
                confidence = 0.6;
            }
        }

        return {
            intent: matchedIntent,
            score: confidence,
            entities: entities
        };
    }

    extractEntities(text, fullQuery) {
        const entities = [];
        const normalizedText = text.toLowerCase();

        // Check each entity type
        Object.keys(this.entities).forEach(entityType => {
            Object.keys(this.entities[entityType]).forEach(entityValue => {
                const synonyms = this.entities[entityType][entityValue];
                
                for (const synonym of synonyms) {
                    if (normalizedText.includes(synonym.toLowerCase())) {
                        entities.push({
                            entity: entityType,
                            resolution: { value: entityValue },
                            sourceText: synonym,
                            confidence: 0.9
                        });
                        return; // Only add one match per entity type
                    }
                }
            });
        });

        // Check for customer/project names (anything that doesn't match known entities)
        if (!entities.some(e => e.entity === 'customer' || e.entity === 'project')) {
            const words = normalizedText.split(/\s+/);
            const unknownWords = words.filter(word => 
                word.length > 2 && 
                !this.isKnownKeyword(word) &&
                /^[a-zA-Z0-9]+$/.test(word)
            );

            if (unknownWords.length > 0) {
                entities.push({
                    entity: 'searchText',
                    resolution: { value: unknownWords.join(' ') },
                    sourceText: unknownWords.join(' '),
                    confidence: 0.7
                });
            }
        }

        return entities;
    }

    isKnownKeyword(word) {
        const keywords = [
            'show', 'find', 'get', 'list', 'search', 'me', 'all', 'the',
            'projects', 'project', 'customer', 'customers', 'from', 'by',
            'with', 'and', 'or', 'in', 'on', 'at', 'to', 'for'
        ];
        return keywords.includes(word.toLowerCase());
    }

    determineIntentFromEntities(entities) {
        const entityTypes = entities.map(e => e.entity);
        
        if (entityTypes.includes('status')) {
            return 'search.by.status';
        }
        
        if (entityTypes.includes('phase')) {
            return 'search.by.phase';
        }
        
        if (entityTypes.includes('timeframe')) {
            return 'search.by.timeframe';
        }
        
        if (entityTypes.includes('projectType')) {
            return 'search.by.type';
        }
        
        if (entityTypes.includes('searchText')) {
            return 'search.general';
        }

        return 'None';
    }

    // Helper method to check if query looks like natural language
    isNaturalLanguageQuery(query) {
        const nlIndicators = [
            // Intent verbs
            'show', 'find', 'get', 'list', 'search', 'display',
            // Time references
            'last', 'past', 'previous', 'this', 'current', 'today', 'yesterday',
            'week', 'month', 'quarter', 'year',
            // Status words
            'completed', 'finished', 'done', 'progress', 'ongoing', 'pending',
            'active', 'hold', 'paused',
            // Phase words
            'lead', 'approved', 'execution', 'completion',
            // Project types
            'roof', 'roofing', 'repair', 'replacement', 'inspection',
            // Question words
            'what', 'which', 'who', 'when', 'where', 'how',
            // Connective words
            'from', 'with', 'all', 'projects', 'customers'
        ];
        
        const queryLower = query.toLowerCase();
        const words = queryLower.split(/\s+/);
        
        // Check if query contains multiple words (3+) with natural language indicators
        if (words.length >= 3) {
            const hasNLIndicator = nlIndicators.some(indicator => queryLower.includes(indicator));
            return hasNLIndicator;
        }
        
        // Check for specific natural language patterns
        const nlPatterns = [
            /show me.*projects/i,
            /find.*projects/i,
            /projects from/i,
            /completed.*projects/i,
            /.*last (week|month|quarter|year)/i,
            /.*this (week|month)/i
        ];
        
        return nlPatterns.some(pattern => pattern.test(query));
    }
}

export default BrowserNLP;