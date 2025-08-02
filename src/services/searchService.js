// Fuzzy matching utility - simple Levenshtein distance-based similarity
const fuzzyMatch = (text, query, threshold = 0.3) => {
    if (!text || !query) return false;
    
    text = text.toString().toLowerCase();
    query = query.toLowerCase();
    
    // Exact match
    if (text.includes(query)) return true;
    
    // Partial word matches
    const textWords = text.split(/\s+/);
    const queryWords = query.split(/\s+/);
    
    for (const queryWord of queryWords) {
        for (const textWord of textWords) {
            if (textWord.includes(queryWord) || queryWord.includes(textWord)) {
                return true;
            }
        }
    }
    
    // Fuzzy matching for typos - lowered threshold for more results
    if (query.length < 2) return false;
    
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
        this.data.projects = projects || [];
        this.data.activities = activities || [];
        
        // Extract customers and contacts from projects
        this.data.customers = this.extractCustomers(this.data.projects);
        this.data.contacts = this.extractContacts(this.data.projects);
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
        
        const results = [];
        const queryLower = query.toLowerCase().trim();
        
        // Search projects
        results.push(...this.searchProjects(queryLower));
        
        // Search customers
        results.push(...this.searchCustomers(queryLower));
        
        // Search messages/activities
        results.push(...this.searchMessages(queryLower));
        
        // Search contacts
        results.push(...this.searchContacts(queryLower));
        
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
            
            // Define comprehensive searchable fields with weights
            const searchFields = [
                // High priority - exact identifiers
                { key: 'projectNumber', value: project.projectNumber?.toString(), weight: 15, label: 'Project #' },
                { key: 'projectId', value: project.id?.toString(), weight: 15, label: 'Project ID' },
                
                // High priority - names and addresses
                { key: 'projectName', value: project.name || project.projectName, weight: 12, label: 'Project Name' },
                { key: 'address', value: project.address || project.projectName, weight: 11, label: 'Address' },
                { key: 'location', value: project.location, weight: 10, label: 'Location' },
                
                // Customer information - all variations
                { key: 'customerName', value: project.client?.name || project.customer?.name || project.customer?.primaryName, weight: 10, label: 'Customer Name' },
                { key: 'customerFirstName', value: project.customer?.firstName, weight: 8, label: 'Customer First Name' },
                { key: 'customerLastName', value: project.customer?.lastName, weight: 8, label: 'Customer Last Name' },
                { key: 'customerSecondaryName', value: project.customer?.secondaryName, weight: 7, label: 'Secondary Contact' },
                { key: 'customerPhone', value: project.client?.phone || project.customer?.phone || project.customer?.primaryPhone, weight: 9, label: 'Customer Phone' },
                { key: 'customerSecondaryPhone', value: project.customer?.secondaryPhone, weight: 7, label: 'Secondary Phone' },
                { key: 'customerEmail', value: project.client?.email || project.customer?.email || project.customer?.primaryEmail, weight: 9, label: 'Customer Email' },
                { key: 'customerSecondaryEmail', value: project.customer?.secondaryEmail, weight: 7, label: 'Secondary Email' },
                { key: 'customerAddress', value: project.customer?.address, weight: 8, label: 'Customer Address' },
                
                // Project Manager information
                { key: 'pmName', value: project.projectManager?.name || 
                    `${project.projectManager?.firstName || ''} ${project.projectManager?.lastName || ''}`.trim(), weight: 8, label: 'Project Manager' },
                { key: 'pmFirstName', value: project.projectManager?.firstName, weight: 6, label: 'PM First Name' },
                { key: 'pmLastName', value: project.projectManager?.lastName, weight: 6, label: 'PM Last Name' },
                { key: 'pmPhone', value: project.projectManager?.phone || project.pmPhone, weight: 7, label: 'PM Phone' },
                { key: 'pmEmail', value: project.projectManager?.email || project.pmEmail, weight: 7, label: 'PM Email' },
                
                // Workflow and status information
                { key: 'projectPhase', value: currentPhase, weight: 8, label: 'Phase' },
                { key: 'status', value: project.status, weight: 7, label: 'Status' },
                { key: 'priority', value: project.priority, weight: 6, label: 'Priority' },
                { key: 'projectType', value: project.projectType || project.type, weight: 7, label: 'Project Type' },
                
                // Workflow details
                { key: 'section', value: currentSection, weight: 6, label: 'Current Section' },
                { key: 'lineItem', value: currentLineItem, weight: 6, label: 'Current Line Item' },
                { key: 'userGroup', value: responsibleRole, weight: 5, label: 'Responsible Role' },
                
                // Financial information
                { key: 'budget', value: project.budget?.toString(), weight: 5, label: 'Budget' },
                { key: 'estimatedCost', value: project.estimatedCost?.toString(), weight: 4, label: 'Estimated Cost' },
                { key: 'actualCost', value: project.actualCost?.toString(), weight: 4, label: 'Actual Cost' },
                
                // Dates
                { key: 'startDate', value: project.startDate, weight: 4, label: 'Start Date' },
                { key: 'endDate', value: project.endDate, weight: 4, label: 'End Date' },
                
                // Additional fields
                { key: 'description', value: project.description, weight: 5, label: 'Description' },
                { key: 'notes', value: project.notes, weight: 4, label: 'Notes' },
                
                // Team members
                ...((project.teamMembers || []).map(member => ({
                    key: `teamMember_${member.id}`,
                    value: member.user ? `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() : '',
                    weight: 5,
                    label: 'Team Member'
                })))
            ];
            
            // Check each field for matches with enhanced scoring
            searchFields.forEach(field => {
                if (field.value) {
                    const value = field.value.toString().toLowerCase();
                    const queryLower = query.toLowerCase();
                    
                    let matchScore = 0;
                    let matchType = '';
                    
                    // Exact match (highest score)
                    if (value === queryLower) {
                        matchScore = field.weight * 3;
                        matchType = 'exact';
                    }
                    // Starts with query (high score)
                    else if (value.startsWith(queryLower)) {
                        matchScore = field.weight * 2.5;
                        matchType = 'starts';
                    }
                    // Contains query (good score)
                    else if (value.includes(queryLower)) {
                        matchScore = field.weight * 2;
                        matchType = 'contains';
                    }
                    // Word boundary match (good score)
                    else if (new RegExp(`\\b${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(value)) {
                        matchScore = field.weight * 1.8;
                        matchType = 'word';
                    }
                    // Fuzzy match (lower score)
                    else if (fuzzyMatch(value, queryLower)) {
                        matchScore = field.weight * 0.8;
                        matchType = 'fuzzy';
                    }
                    
                    if (matchScore > 0) {
                        matchedFields.push(field.label);
                        relevanceScore += matchScore;
                    }
                }
            });
            
            if (matchedFields.length > 0) {
                const customer = project.client || project.customer;
                const customerName = customer?.name || customer?.primaryName || 'Unknown Customer';
                results.push({
                    id: project.id,
                    type: 'project',
                    category: 'Projects',
                    title: project.projectNumber?.toString() || 'No Project #',
                    subtitle: customerName,
                    description: project.address || project.projectName || 'No address',
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
                    const value = field.value.toString().toLowerCase();
                    const queryLower = query.toLowerCase();
                    
                    let matchScore = 0;
                    let matchType = '';
                    
                    if (value === queryLower) {
                        matchScore = field.weight * 3;
                        matchType = 'exact';
                    } else if (value.startsWith(queryLower)) {
                        matchScore = field.weight * 2.5;
                        matchType = 'starts';
                    } else if (value.includes(queryLower)) {
                        matchScore = field.weight * 2;
                        matchType = 'contains';
                    } else if (new RegExp(`\\b${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(value)) {
                        matchScore = field.weight * 1.8;
                        matchType = 'word';
                    } else if (fuzzyMatch(value, queryLower)) {
                        matchScore = field.weight * 0.8;
                        matchType = 'fuzzy';
                    }
                    
                    if (matchScore > 0) {
                        matchedFields.push(field.label);
                        relevanceScore += matchScore;
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
                    const value = field.value.toString().toLowerCase();
                    const queryLower = query.toLowerCase();
                    
                    let matchScore = 0;
                    let matchType = '';
                    
                    if (value === queryLower) {
                        matchScore = field.weight * 3;
                        matchType = 'exact';
                    } else if (value.startsWith(queryLower)) {
                        matchScore = field.weight * 2.5;
                        matchType = 'starts';
                    } else if (value.includes(queryLower)) {
                        matchScore = field.weight * 2;
                        matchType = 'contains';
                    } else if (new RegExp(`\\b${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(value)) {
                        matchScore = field.weight * 1.8;
                        matchType = 'word';
                    } else if (fuzzyMatch(value, queryLower)) {
                        matchScore = field.weight * 0.8;
                        matchType = 'fuzzy';
                    }
                    
                    if (matchScore > 0) {
                        matchedFields.push(field.label);
                        relevanceScore += matchScore;
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
                    const value = field.value.toString().toLowerCase();
                    const queryLower = query.toLowerCase();
                    
                    let matchScore = 0;
                    let matchType = '';
                    
                    if (value === queryLower) {
                        matchScore = field.weight * 3;
                        matchType = 'exact';
                    } else if (value.startsWith(queryLower)) {
                        matchScore = field.weight * 2.5;
                        matchType = 'starts';
                    } else if (value.includes(queryLower)) {
                        matchScore = field.weight * 2;
                        matchType = 'contains';
                    } else if (new RegExp(`\\b${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(value)) {
                        matchScore = field.weight * 1.8;
                        matchType = 'word';
                    } else if (fuzzyMatch(value, queryLower)) {
                        matchScore = field.weight * 0.8;
                        matchType = 'fuzzy';
                    }
                    
                    if (matchScore > 0) {
                        matchedFields.push(field.label);
                        relevanceScore += matchScore;
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