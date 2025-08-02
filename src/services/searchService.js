// Fuzzy matching utility - simple Levenshtein distance-based similarity
const fuzzyMatch = (text, query, threshold = 0.6) => {
    if (!text || !query) return false;
    
    text = text.toString().toLowerCase();
    query = query.toLowerCase();
    
    // Exact match
    if (text.includes(query)) return true;
    
    // Fuzzy matching for typos
    if (query.length < 3) return false; // Skip fuzzy for short queries
    
    return levenshteinSimilarity(text, query) >= threshold;
};

// Calculate similarity between two strings (0-1, where 1 is identical)
const levenshteinSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
};

// Calculate Levenshtein distance between two strings
const levenshteinDistance = (str1, str2) => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,     // deletion
                matrix[j - 1][i] + 1,     // insertion
                matrix[j - 1][i - 1] + indicator // substitution
            );
        }
    }
    
    return matrix[str2.length][str1.length];
};

// Phone number formatting utility
const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
};

export class SearchService {
    constructor() {
        this.data = {
            projects: [],
            activities: [],
            customers: [],
            contacts: []
        };
    }

    // Update the data that can be searched
    updateData({ projects = [], activities = [] }) {
        console.log('🔍 SearchService.updateData called with:', { 
            projectsCount: projects?.length || 0, 
            activitiesCount: activities?.length || 0 
        });
        
        this.data.projects = projects || [];
        this.data.activities = activities || [];
        
        // Extract customers and contacts from projects
        this.data.customers = this.extractCustomers(this.data.projects);
        this.data.contacts = this.extractContacts(this.data.projects);
        
        console.log('🔍 SearchService data updated:', {
            projects: this.data.projects.length,
            activities: this.data.activities.length,
            customers: this.data.customers.length,
            contacts: this.data.contacts.length
        });
    }

    // Extract unique customers from projects
    extractCustomers(projects) {
        const customerMap = new Map();
        
        projects.forEach(project => {
            const customer = project.client || project.customer;
            if (customer && customer.name) {
                const key = customer.name.toLowerCase();
                if (!customerMap.has(key)) {
                    customerMap.set(key, {
                        id: customer.id || `customer-${customerMap.size}`,
                        name: customer.name,
                        email: customer.email,
                        phone: customer.phone,
                        address: customer.address || project.address,
                        projects: []
                    });
                }
                customerMap.get(key).projects.push(project);
            }
        });
        
        return Array.from(customerMap.values());
    }

    // Extract contacts (includes customers, project managers, team members)
    extractContacts(projects) {
        const contactMap = new Map();
        
        projects.forEach(project => {
            // Add customer as contact
            const customer = project.client || project.customer;
            if (customer && customer.name) {
                const key = `customer-${customer.name.toLowerCase()}`;
                if (!contactMap.has(key)) {
                    contactMap.set(key, {
                        id: customer.id || key,
                        name: customer.name,
                        email: customer.email,
                        phone: customer.phone,
                        type: 'Customer',
                        projectId: project.id,
                        projectName: project.name || project.projectName
                    });
                }
            }

            // Add project manager as contact
            const pm = project.projectManager;
            if (pm && (pm.firstName || pm.name)) {
                const name = pm.name || `${pm.firstName} ${pm.lastName}`.trim();
                const key = `pm-${name.toLowerCase()}`;
                if (!contactMap.has(key)) {
                    contactMap.set(key, {
                        id: pm.id || key,
                        name: name,
                        email: pm.email,
                        phone: pm.phone,
                        type: 'Project Manager',
                        projectId: project.id,
                        projectName: project.name || project.projectName
                    });
                }
            }
        });
        
        return Array.from(contactMap.values());
    }

    // Main search function
    search(query) {
        if (!query || query.trim().length < 1) return [];
        
        console.log('🔍 SearchService.search called with query:', query);
        console.log('🔍 Available data:', {
            projects: this.data.projects.length,
            activities: this.data.activities.length,
            customers: this.data.customers.length,
            contacts: this.data.contacts.length
        });
        
        const results = [];
        const queryLower = query.toLowerCase().trim();
        
        // Search projects
        const projectResults = this.searchProjects(queryLower);
        console.log('🔍 Project search results:', projectResults.length);
        results.push(...projectResults);
        
        // Search customers
        const customerResults = this.searchCustomers(queryLower);
        console.log('🔍 Customer search results:', customerResults.length);
        results.push(...customerResults);
        
        // Search messages/activities
        const messageResults = this.searchMessages(queryLower);
        console.log('🔍 Message search results:', messageResults.length);
        results.push(...messageResults);
        
        // Search contacts
        const contactResults = this.searchContacts(queryLower);
        console.log('🔍 Contact search results:', contactResults.length);
        results.push(...contactResults);
        
        // Sort results by relevance (exact matches first, then fuzzy matches)
        return results.sort((a, b) => {
            // Prioritize exact matches - ensure title and subtitle are strings
            const aTitle = (a.title || '').toString().toLowerCase();
            const aSubtitle = (a.subtitle || '').toString().toLowerCase();
            const bTitle = (b.title || '').toString().toLowerCase();
            const bSubtitle = (b.subtitle || '').toString().toLowerCase();
            
            const aExact = aTitle.includes(queryLower) || aSubtitle.includes(queryLower);
            const bExact = bTitle.includes(queryLower) || bSubtitle.includes(queryLower);
            
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            
            // Then by relevance score
            return (b.relevanceScore || 0) - (a.relevanceScore || 0);
        });
        
        console.log('🔍 Final search results:', results.length, results);
        return results;
    }

    searchProjects(query) {
        const results = [];
        
        this.data.projects.forEach(project => {
            const matchedFields = [];
            let relevanceScore = 0;
            
            // Get current workflow step and phase information
            const currentStep = project.workflow?.steps?.find(step => !step.isCompleted);
            const currentPhase = project.phase || (currentStep ? currentStep.phase : 'LEAD');
            const currentSection = currentStep ? currentStep.stepName : null;
            const currentLineItem = currentStep ? currentStep.stepName : null;
            const responsibleRole = currentStep ? currentStep.defaultResponsible : null;
            
            // Define searchable fields with weights (enhanced with workflow fields)
            const searchFields = [
                { key: 'projectNumber', value: project.projectNumber, weight: 10, label: 'Project #' },
                { key: 'name', value: project.name || project.projectName, weight: 9, label: 'Name' },
                { key: 'address', value: project.address, weight: 8, label: 'Address' },
                { key: 'customerName', value: project.client?.name || project.customer?.name, weight: 7, label: 'Primary Contact' },
                { key: 'customerPhone', value: project.client?.phone || project.customer?.phone, weight: 6, label: 'Phone' },
                { key: 'customerEmail', value: project.client?.email || project.customer?.email, weight: 6, label: 'Email' },
                { key: 'projectPhase', value: currentPhase, weight: 7, label: 'Project Phase' },
                { key: 'section', value: currentSection, weight: 6, label: 'Section' },
                { key: 'lineItem', value: currentLineItem, weight: 6, label: 'Line Item' },
                { key: 'userGroup', value: responsibleRole, weight: 5, label: 'User Group' },
                { key: 'projectType', value: project.projectType || project.type, weight: 5, label: 'Individual Trade' },
                { key: 'status', value: project.status, weight: 4, label: 'Status' },
                { key: 'pmName', value: project.projectManager?.name || 
                    `${project.projectManager?.firstName || ''} ${project.projectManager?.lastName || ''}`.trim(), weight: 3, label: 'PM' }
            ];
            
            // Check each field for matches
            searchFields.forEach(field => {
                if (field.value) {
                    const value = field.value.toString();
                    if (value.toLowerCase().includes(query) || fuzzyMatch(value, query)) {
                        matchedFields.push(field.label);
                        relevanceScore += field.weight;
                        
                        // Boost score for exact matches
                        if (value.toLowerCase().includes(query)) {
                            relevanceScore += field.weight * 0.5;
                        }
                    }
                }
            });
            
            if (matchedFields.length > 0) {
                const customer = project.client || project.customer;
                results.push({
                    id: project.id,
                    type: 'project',
                    category: 'Projects',
                    title: project.projectNumber || 'No Project #',
                    subtitle: customer?.name || 'Unknown Customer',
                    description: project.address || 'No address',
                    matchedFields,
                    relevanceScore,
                    data: project,
                    navigationTarget: {
                        page: 'projects', // Navigate to My Projects page as requested
                        projectId: project.id,
                        project: {
                            ...project,
                            scrollToProjectId: String(project.id)
                        }
                    }
                });
            }
        });
        
        return results;
    }

    searchCustomers(query) {
        const results = [];
        
        this.data.customers.forEach(customer => {
            const matchedFields = [];
            let relevanceScore = 0;
            
            const searchFields = [
                { key: 'name', value: customer.name, weight: 10, label: 'Name' },
                { key: 'email', value: customer.email, weight: 8, label: 'Email' },
                { key: 'phone', value: customer.phone, weight: 8, label: 'Phone' },
                { key: 'address', value: customer.address, weight: 6, label: 'Address' }
            ];
            
            searchFields.forEach(field => {
                if (field.value) {
                    const value = field.value.toString();
                    if (value.toLowerCase().includes(query) || fuzzyMatch(value, query)) {
                        matchedFields.push(field.label);
                        relevanceScore += field.weight;
                        
                        if (value.toLowerCase().includes(query)) {
                            relevanceScore += field.weight * 0.5;
                        }
                    }
                }
            });
            
            if (matchedFields.length > 0) {
                results.push({
                    id: customer.id,
                    type: 'customer',
                    category: 'Customers',
                    title: customer.name,
                    subtitle: formatPhoneNumber(customer.phone) || customer.email || 'No contact info',
                    description: `${customer.projects.length} project(s)`,
                    matchedFields,
                    relevanceScore,
                    data: customer,
                    navigationTarget: {
                        page: 'customers',
                        customerId: customer.id
                    }
                });
            }
        });
        
        return results;
    }

    searchMessages(query) {
        const results = [];
        
        this.data.activities.forEach(activity => {
            const matchedFields = [];
            let relevanceScore = 0;
            
            const searchFields = [
                { key: 'subject', value: activity.subject, weight: 8, label: 'Subject' },
                { key: 'content', value: activity.content || activity.description, weight: 6, label: 'Content' },
                { key: 'projectName', value: activity.projectName, weight: 5, label: 'Project' },
                { key: 'author', value: activity.author, weight: 4, label: 'Author' }
            ];
            
            searchFields.forEach(field => {
                if (field.value) {
                    const value = field.value.toString();
                    if (value.toLowerCase().includes(query) || fuzzyMatch(value, query)) {
                        matchedFields.push(field.label);
                        relevanceScore += field.weight;
                        
                        if (value.toLowerCase().includes(query)) {
                            relevanceScore += field.weight * 0.5;
                        }
                    }
                }
            });
            
            if (matchedFields.length > 0) {
                const project = this.data.projects.find(p => 
                    p.id === activity.projectId || p._id === activity.projectId
                );
                
                results.push({
                    id: activity.id,
                    type: 'message',
                    category: 'Messages',
                    title: activity.subject || 'Message',
                    subtitle: project?.projectNumber || activity.projectName || 'Unknown Project',
                    description: activity.content || activity.description || '',
                    matchedFields,
                    relevanceScore,
                    data: activity,
                    navigationTarget: {
                        page: 'project-messages',
                        projectId: activity.projectId,
                        messageId: activity.id,
                        project: project
                    }
                });
            }
        });
        
        return results;
    }

    searchContacts(query) {
        const results = [];
        
        this.data.contacts.forEach(contact => {
            const matchedFields = [];
            let relevanceScore = 0;
            
            const searchFields = [
                { key: 'name', value: contact.name, weight: 10, label: 'Name' },
                { key: 'email', value: contact.email, weight: 8, label: 'Email' },
                { key: 'phone', value: contact.phone, weight: 8, label: 'Phone' },
                { key: 'type', value: contact.type, weight: 5, label: 'Role' },
                { key: 'projectName', value: contact.projectName, weight: 4, label: 'Project' }
            ];
            
            searchFields.forEach(field => {
                if (field.value) {
                    const value = field.value.toString();
                    if (value.toLowerCase().includes(query) || fuzzyMatch(value, query)) {
                        matchedFields.push(field.label);
                        relevanceScore += field.weight;
                        
                        if (value.toLowerCase().includes(query)) {
                            relevanceScore += field.weight * 0.5;
                        }
                    }
                }
            });
            
            if (matchedFields.length > 0) {
                results.push({
                    id: contact.id,
                    type: 'contact',
                    category: 'Contacts',
                    title: contact.name,
                    subtitle: `${contact.type} • ${contact.projectName}`,
                    description: formatPhoneNumber(contact.phone) || contact.email || 'No contact info',
                    matchedFields,
                    relevanceScore,
                    data: contact,
                    navigationTarget: {
                        page: 'project-detail',
                        projectId: contact.projectId,
                        section: 'contacts'
                    }
                });
            }
        });
        
        return results;
    }
}