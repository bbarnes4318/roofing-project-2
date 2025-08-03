import BrowserNLP from './browserNLP';
import { SearchService } from './searchService';

class NaturalLanguageSearchService {
    constructor() {
        this.nlpManager = new BrowserNLP();
        this.conventionalSearchService = new SearchService();
        this.isInitialized = true; // Browser NLP is immediately ready
    }

    updateData(data) {
        this.conventionalSearchService.updateData(data);
    }

    async search(query) {
        try {
            // Process the query with Browser NLP
            const nlpResult = await this.nlpManager.process('en', query.toLowerCase());
            
            // Extract structured data from NLP result
            const intent = nlpResult.intent;
            const entities = nlpResult.entities || [];
            const confidence = nlpResult.score || 0;

            // If confidence is too low, fall back to conventional search
            if (confidence < 0.3) {
                console.log('🔍 Low NLP confidence, using conventional search');
                return this.conventionalSearchService.search(query);
            }

            console.log('🤖 NLP Intent:', intent, 'Entities:', entities, 'Confidence:', confidence);

            // Build structured query based on intent and entities
            const structuredQuery = this.buildStructuredQuery(intent, entities, query);
            
            // Execute the search
            return this.executeStructuredSearch(structuredQuery, query);
        } catch (error) {
            console.error('🚨 NLP search error, falling back to conventional search:', error);
            return this.conventionalSearchService.search(query);
        }
    }

    buildStructuredQuery(intent, entities, originalQuery) {
        const query = {
            intent: intent,
            filters: {},
            searchText: null,
            originalQuery,
            confidence: entities.length > 0 ? Math.max(...entities.map(e => e.confidence || 0.7)) : 0.5
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
                case 'projectType':
                    query.filters.projectType = entity.resolution.value;
                    break;
                case 'searchText':
                    query.searchText = entity.resolution.value;
                    break;
                default:
                    // For other entities, treat as search text
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