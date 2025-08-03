import { NlpManager } from 'node-nlp';
import { SearchService } from './searchService';

class NaturalLanguageSearchService {
    constructor() {
        this.nlpManager = new NlpManager({ languages: ['en'], forceNER: true });
        this.conventionalSearchService = new SearchService();
        this.isInitialized = false;
        
        // Initialize the NLP manager
        this.initializeNLP();
    }

    async initializeNLP() {
        // Add entity definitions for roofing domain
        this.nlpManager.addNamedEntityText('status', 'completed', ['en'], ['completed', 'finished', 'done', 'complete']);
        this.nlpManager.addNamedEntityText('status', 'in-progress', ['en'], ['in progress', 'ongoing', 'active', 'current', 'working']);
        this.nlpManager.addNamedEntityText('status', 'not-started', ['en'], ['not started', 'pending', 'new', 'upcoming']);
        this.nlpManager.addNamedEntityText('status', 'on-hold', ['en'], ['on hold', 'paused', 'suspended', 'delayed']);

        this.nlpManager.addNamedEntityText('phase', 'lead', ['en'], ['lead', 'leads', 'prospect']);
        this.nlpManager.addNamedEntityText('phase', 'approved', ['en'], ['approved', 'approval', 'contract']);
        this.nlpManager.addNamedEntityText('phase', 'execution', ['en'], ['execution', 'construction', 'building', 'work']);
        this.nlpManager.addNamedEntityText('phase', 'completion', ['en'], ['completion', 'completed', 'finished']);

        this.nlpManager.addNamedEntityText('timeframe', 'last-week', ['en'], ['last week', 'past week', 'previous week']);
        this.nlpManager.addNamedEntityText('timeframe', 'last-month', ['en'], ['last month', 'past month', 'previous month']);
        this.nlpManager.addNamedEntityText('timeframe', 'last-quarter', ['en'], ['last quarter', 'past quarter', 'previous quarter', 'past 3 months']);
        this.nlpManager.addNamedEntityText('timeframe', 'last-year', ['en'], ['last year', 'past year', 'previous year']);
        this.nlpManager.addNamedEntityText('timeframe', 'today', ['en'], ['today', 'this day']);
        this.nlpManager.addNamedEntityText('timeframe', 'this-week', ['en'], ['this week', 'current week']);
        this.nlpManager.addNamedEntityText('timeframe', 'this-month', ['en'], ['this month', 'current month']);

        this.nlpManager.addNamedEntityText('project-type', 'roof', ['en'], ['roof', 'roofing', 'roofs', 'shingle', 'shingles']);
        this.nlpManager.addNamedEntityText('project-type', 'repair', ['en'], ['repair', 'repairs', 'fix', 'maintenance']);
        this.nlpManager.addNamedEntityText('project-type', 'replacement', ['en'], ['replacement', 'replace', 'new roof']);
        this.nlpManager.addNamedEntityText('project-type', 'inspection', ['en'], ['inspection', 'inspect', 'assessment']);

        // Add intents for different types of searches
        this.nlpManager.addDocument('en', 'show me %status% projects', 'search.by.status');
        this.nlpManager.addDocument('en', 'find %status% projects', 'search.by.status');
        this.nlpManager.addDocument('en', 'list %status% projects', 'search.by.status');
        this.nlpManager.addDocument('en', '%status% projects', 'search.by.status');

        this.nlpManager.addDocument('en', 'show me projects from %timeframe%', 'search.by.timeframe');
        this.nlpManager.addDocument('en', 'find projects from %timeframe%', 'search.by.timeframe');
        this.nlpManager.addDocument('en', 'projects from %timeframe%', 'search.by.timeframe');

        this.nlpManager.addDocument('en', 'show me %phase% projects', 'search.by.phase');
        this.nlpManager.addDocument('en', 'find %phase% projects', 'search.by.phase');
        this.nlpManager.addDocument('en', '%phase% projects', 'search.by.phase');

        this.nlpManager.addDocument('en', 'show me %project-type% projects', 'search.by.type');
        this.nlpManager.addDocument('en', 'find %project-type% projects', 'search.by.type');
        this.nlpManager.addDocument('en', '%project-type% projects', 'search.by.type');

        this.nlpManager.addDocument('en', 'find customer %any%', 'search.customer');
        this.nlpManager.addDocument('en', 'show customer %any%', 'search.customer');
        this.nlpManager.addDocument('en', 'customer %any%', 'search.customer');

        this.nlpManager.addDocument('en', 'project %any%', 'search.project');
        this.nlpManager.addDocument('en', 'find project %any%', 'search.project');
        this.nlpManager.addDocument('en', 'show project %any%', 'search.project');

        // Add responses (not used but required by NLP manager)
        this.nlpManager.addAnswer('en', 'search.by.status', 'Searching for projects by status');
        this.nlpManager.addAnswer('en', 'search.by.timeframe', 'Searching for projects by timeframe');
        this.nlpManager.addAnswer('en', 'search.by.phase', 'Searching for projects by phase');
        this.nlpManager.addAnswer('en', 'search.by.type', 'Searching for projects by type');
        this.nlpManager.addAnswer('en', 'search.customer', 'Searching for customer');
        this.nlpManager.addAnswer('en', 'search.project', 'Searching for project');

        await this.nlpManager.train();
        this.isInitialized = true;
    }

    updateData(data) {
        this.conventionalSearchService.updateData(data);
    }

    async search(query) {
        // Wait for initialization if not ready
        if (!this.isInitialized) {
            await this.initializeNLP();
        }

        // Process the query with NLP
        const nlpResult = await this.nlpManager.process('en', query.toLowerCase());
        
        // Extract structured data from NLP result
        const intent = nlpResult.intent;
        const entities = nlpResult.entities || [];
        const confidence = nlpResult.score || 0;

        // If confidence is too low, fall back to conventional search
        if (confidence < 0.5) {
            console.log('🔍 Low NLP confidence, using conventional search');
            return this.conventionalSearchService.search(query);
        }

        console.log('🤖 NLP Intent:', intent, 'Entities:', entities, 'Confidence:', confidence);

        // Build structured query based on intent and entities
        const structuredQuery = this.buildStructuredQuery(intent, entities, query);
        
        // Execute the search
        return this.executeStructuredSearch(structuredQuery, query);
    }

    buildStructuredQuery(intent, entities, originalQuery) {
        const query = {
            intent: intent,
            filters: {},
            searchText: null,
            originalQuery
        };

        // Extract entities into filters
        entities.forEach(entity => {
            switch (entity.entity) {
                case 'status':
                    query.filters.status = entity.resolution.value;
                    break;
                case 'phase':
                    query.filters.phase = entity.resolution.value.toUpperCase();
                    break;
                case 'timeframe':
                    query.filters.timeframe = entity.resolution.value;
                    break;
                case 'project-type':
                    query.filters.projectType = entity.resolution.value;
                    break;
                default:
                    // For 'any' entities, treat as search text
                    if (!query.searchText) {
                        query.searchText = entity.sourceText;
                    }
                    break;
            }
        });

        return query;
    }

    async executeStructuredSearch(structuredQuery, originalQuery) {
        const { intent, filters, searchText } = structuredQuery;

        try {
            // Call the backend API for structured search
            const response = await fetch('/api/search/advanced', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    intent,
                    filters,
                    searchText,
                    originalQuery,
                    entities: [], // Will be populated by NLP processing
                    limit: 50
                })
            });

            if (!response.ok) {
                throw new Error(`Search API error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.data.results) {
                // Add NLP metadata to results
                return data.data.results.map(result => ({
                    ...result,
                    nlp: {
                        intent,
                        confidence: structuredQuery.confidence || 0.8,
                        isStructuredSearch: true,
                        apiSource: true
                    }
                }));
            } else {
                throw new Error('Invalid API response');
            }
        } catch (error) {
            console.error('🚨 API search failed, falling back to client-side:', error);
            
            // Fallback to client-side search
            return this.executeClientSideSearch(structuredQuery, originalQuery);
        }
    }

    executeClientSideSearch(structuredQuery, originalQuery) {
        const { intent, filters, searchText } = structuredQuery;
        let results = [];

        // Get all data
        const projects = this.conventionalSearchService.data.projects || [];
        const customers = this.conventionalSearchService.data.customers || [];
        const messages = this.conventionalSearchService.data.messages || [];

        // Apply filters based on intent
        switch (intent) {
            case 'search.by.status':
                results = this.filterProjectsByStatus(projects, filters.status);
                break;
            case 'search.by.phase':
                results = this.filterProjectsByPhase(projects, filters.phase);
                break;
            case 'search.by.timeframe':
                results = this.filterProjectsByTimeframe(projects, filters.timeframe);
                break;
            case 'search.by.type':
                results = this.filterProjectsByType(projects, filters.projectType);
                break;
            case 'search.customer':
                if (searchText) {
                    results = this.searchCustomers(customers, searchText);
                }
                break;
            case 'search.project':
                if (searchText) {
                    results = this.searchProjects(projects, searchText);
                }
                break;
            default:
                // Fall back to conventional search
                results = this.conventionalSearchService.search(originalQuery);
                break;
        }

        // Add NLP metadata to results
        return results.map(result => ({
            ...result,
            nlp: {
                intent,
                confidence: structuredQuery.confidence,
                isStructuredSearch: true,
                clientSideFallback: true
            }
        }));
    }

    filterProjectsByStatus(projects, status) {
        const filtered = projects.filter(project => {
            const projectStatus = (project.status || '').toLowerCase();
            switch (status) {
                case 'completed':
                    return projectStatus.includes('completed') || projectStatus.includes('finished') || projectStatus.includes('done');
                case 'in-progress':
                    return projectStatus.includes('progress') || projectStatus.includes('active') || projectStatus.includes('ongoing');
                case 'not-started':
                    return projectStatus.includes('not started') || projectStatus.includes('pending') || projectStatus.includes('new');
                case 'on-hold':
                    return projectStatus.includes('hold') || projectStatus.includes('paused') || projectStatus.includes('suspended');
                default:
                    return false;
            }
        });

        return this.conventionalSearchService.formatProjectResults(
            filtered.map(project => ({ item: project, score: 0.1 }))
        );
    }

    filterProjectsByPhase(projects, phase) {
        const filtered = projects.filter(project => {
            const projectPhase = (project.phase || '').toUpperCase();
            return projectPhase === phase;
        });

        return this.conventionalSearchService.formatProjectResults(
            filtered.map(project => ({ item: project, score: 0.1 }))
        );
    }

    filterProjectsByTimeframe(projects, timeframe) {
        const now = new Date();
        const filtered = projects.filter(project => {
            const projectDate = new Date(project.createdAt || project.dateCreated || now);
            
            switch (timeframe) {
                case 'today':
                    return projectDate.toDateString() === now.toDateString();
                case 'this-week':
                    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                    return projectDate >= weekStart;
                case 'last-week':
                    const lastWeekStart = new Date(now.setDate(now.getDate() - now.getDay() - 7));
                    const lastWeekEnd = new Date(now.setDate(now.getDate() - now.getDay()));
                    return projectDate >= lastWeekStart && projectDate <= lastWeekEnd;
                case 'this-month':
                    return projectDate.getMonth() === now.getMonth() && projectDate.getFullYear() === now.getFullYear();
                case 'last-month':
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                    return projectDate >= lastMonth && projectDate <= lastMonthEnd;
                case 'last-quarter':
                    const quarterStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                    return projectDate >= quarterStart;
                case 'last-year':
                    const yearStart = new Date(now.getFullYear() - 1, 0, 1);
                    const yearEnd = new Date(now.getFullYear() - 1, 11, 31);
                    return projectDate >= yearStart && projectDate <= yearEnd;
                default:
                    return false;
            }
        });

        return this.conventionalSearchService.formatProjectResults(
            filtered.map(project => ({ item: project, score: 0.1 }))
        );
    }

    filterProjectsByType(projects, projectType) {
        const filtered = projects.filter(project => {
            const type = (project.projectType || project.type || '').toLowerCase();
            return type.includes(projectType);
        });

        return this.conventionalSearchService.formatProjectResults(
            filtered.map(project => ({ item: project, score: 0.1 }))
        );
    }

    searchCustomers(customers, searchText) {
        const filtered = customers.filter(customer => {
            const name = (customer.name || customer.primaryName || '').toLowerCase();
            const email = (customer.email || customer.primaryEmail || '').toLowerCase();
            const phone = (customer.phone || customer.primaryPhone || '').toLowerCase();
            
            return name.includes(searchText.toLowerCase()) || 
                   email.includes(searchText.toLowerCase()) || 
                   phone.includes(searchText.toLowerCase());
        });

        return this.conventionalSearchService.formatCustomerResults(
            filtered.map(customer => ({ item: customer, score: 0.1 }))
        );
    }

    searchProjects(projects, searchText) {
        const filtered = projects.filter(project => {
            const projectNumber = (project.projectNumber || '').toString().toLowerCase();
            const name = (project.name || project.projectName || '').toLowerCase();
            const address = (project.address || '').toLowerCase();
            
            return projectNumber.includes(searchText.toLowerCase()) || 
                   name.includes(searchText.toLowerCase()) || 
                   address.includes(searchText.toLowerCase());
        });

        return this.conventionalSearchService.formatProjectResults(
            filtered.map(project => ({ item: project, score: 0.1 }))
        );
    }
}

export default NaturalLanguageSearchService;