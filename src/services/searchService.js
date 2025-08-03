import Fuse from "fuse.js";

// Phone number formatting utility
const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
};

// Fuse.js options for Projects
const projectOptions = {
    includeScore: true,
    includeMatches: true,
    threshold: 0.2,
    keys: [
        { name: "projectNumber", weight: 15 },
        { name: "name", weight: 12 },
        { name: "projectName", weight: 12 },
        { name: "address", weight: 11 },
        { name: "customer.name", weight: 10 },
        { name: "customer.primaryName", weight: 10 },
        { name: "client.name", weight: 10 },
        { name: "customer.phone", weight: 9 },
        { name: "customer.primaryPhone", weight: 9 },
        { name: "client.phone", weight: 9 },
        { name: "customer.email", weight: 9 },
        { name: "customer.primaryEmail", weight: 9 },
        { name: "client.email", weight: 9 },
        { name: "projectManager.name", weight: 8 },
        { name: "projectManager.firstName", weight: 8 },
        { name: "phase", weight: 8 },
        { name: "status", weight: 7 },
        { name: "projectType", weight: 7 },
        { name: "type", weight: 7 },
        { name: "description", weight: 5 },
        { name: "notes", weight: 4 }
    ]
};

// Fuse.js options for Customers
const customerOptions = {
    includeScore: true,
    includeMatches: true,
    threshold: 0.2,
    keys: [
        { name: "name", weight: 10 },
        { name: "primaryName", weight: 10 },
        { name: "email", weight: 8 },
        { name: "primaryEmail", weight: 8 },
        { name: "phone", weight: 8 },
        { name: "primaryPhone", weight: 8 },
        { name: "address", weight: 6 },
        { name: "secondaryName", weight: 7 },
        { name: "secondaryEmail", weight: 7 },
        { name: "secondaryPhone", weight: 7 }
    ]
};

// Fuse.js options for Messages/Activities
const messageOptions = {
    includeScore: true,
    includeMatches: true,
    threshold: 0.2,
    keys: [
        { name: "subject", weight: 8 },
        { name: "content", weight: 6 },
        { name: "description", weight: 6 },
        { name: "projectName", weight: 5 },
        { name: "author", weight: 4 },
        { name: "projectNumber", weight: 5 }
    ]
};

export class SearchService {
    constructor() {
        this.data = {
            projects: [],
            customers: [],
            messages: []
        };
        this.fuseInstances = {
            projects: null,
            customers: null,
            messages: null
        };
    }

    // Update the data and reinitialize Fuse instances
    updateData({ projects = [], activities = [] }) {
        this.data.projects = projects || [];
        this.data.messages = activities || [];
        this.data.customers = this.extractCustomers(this.data.projects);

        // Initialize Fuse instances for each data type
        this.fuseInstances.projects = new Fuse(this.data.projects, projectOptions);
        this.fuseInstances.customers = new Fuse(this.data.customers, customerOptions);
        this.fuseInstances.messages = new Fuse(this.data.messages, messageOptions);
    }

    // Extract unique customers from projects
    extractCustomers(projects) {
        const customerMap = new Map();
        
        projects.forEach(project => {
            const customer = project.client || project.customer;
            if (customer && (customer.name || customer.primaryName)) {
                const name = customer.name || customer.primaryName;
                const key = name.toLowerCase();
                if (!customerMap.has(key)) {
                    customerMap.set(key, {
                        id: customer.id || `customer-${customerMap.size}`,
                        name: name,
                        primaryName: customer.primaryName || customer.name,
                        email: customer.email || customer.primaryEmail,
                        primaryEmail: customer.primaryEmail || customer.email,
                        phone: customer.phone || customer.primaryPhone,
                        primaryPhone: customer.primaryPhone || customer.phone,
                        secondaryName: customer.secondaryName,
                        secondaryEmail: customer.secondaryEmail,
                        secondaryPhone: customer.secondaryPhone,
                        address: customer.address || project.address,
                        projects: []
                    });
                }
                customerMap.get(key).projects.push(project);
            }
        });
        
        return Array.from(customerMap.values());
    }

    // Main search function using Fuse.js
    search(query) {
        if (!query || query.trim().length < 1) return [];
        
        const results = [];
        
        // Search projects
        if (this.fuseInstances.projects) {
            const projectResults = this.fuseInstances.projects.search(query);
            results.push(...this.formatProjectResults(projectResults));
        }
        
        // Search customers
        if (this.fuseInstances.customers) {
            const customerResults = this.fuseInstances.customers.search(query);
            results.push(...this.formatCustomerResults(customerResults));
        }
        
        // Search messages
        if (this.fuseInstances.messages) {
            const messageResults = this.fuseInstances.messages.search(query);
            results.push(...this.formatMessageResults(messageResults));
        }
        
        // Sort by Fuse score (lower is better) and limit total results
        return results.sort((a, b) => (a.fuseScore || 1) - (b.fuseScore || 1)).slice(0, 50);
    }

    formatProjectResults(fuseResults) {
        return fuseResults.map(result => {
            const project = result.item;
            const customer = project.client || project.customer;
            const customerName = customer?.name || customer?.primaryName || 'Unknown Customer';
            
            return {
                id: project.id,
                type: 'project',
                category: 'Projects',
                title: project.projectNumber?.toString() || 'No Project #',
                subtitle: customerName,
                description: project.address || project.projectName || project.name || 'No address',
                fuseScore: result.score,
                matches: result.matches,
                data: project,
                navigationTarget: {
                    page: 'projects',
                    projectId: project.id,
                    project: {
                        ...project,
                        scrollToProjectId: String(project.id)
                    }
                }
            };
        });
    }

    formatCustomerResults(fuseResults) {
        return fuseResults.map(result => {
            const customer = result.item;
            
            return {
                id: customer.id,
                type: 'customer',
                category: 'Customers',
                title: customer.name || customer.primaryName,
                subtitle: formatPhoneNumber(customer.phone || customer.primaryPhone) || customer.email || customer.primaryEmail || 'No contact info',
                description: `${customer.projects.length} project(s)`,
                fuseScore: result.score,
                matches: result.matches,
                data: customer,
                navigationTarget: {
                    page: 'customers',
                    customerId: customer.id
                }
            };
        });
    }

    formatMessageResults(fuseResults) {
        return fuseResults.map(result => {
            const activity = result.item;
            const project = this.data.projects.find(p => 
                p.id === activity.projectId || p._id === activity.projectId
            );
            
            return {
                id: activity.id,
                type: 'message',
                category: 'Messages',
                title: activity.subject || 'Message',
                subtitle: project?.projectNumber || activity.projectName || 'Unknown Project',
                description: activity.content || activity.description || '',
                fuseScore: result.score,
                matches: result.matches,
                data: activity,
                navigationTarget: {
                    page: 'project-messages',
                    projectId: activity.projectId,
                    messageId: activity.id,
                    project: project
                }
            };
        });
    }
}

// Note: The main SearchService class above is used by the GlobalSearch component
// The searchService export below is kept for backward compatibility but not used
export const searchService = {
    search: (query) => {
        console.warn('⚠️  Using legacy searchService - should use SearchService class instead');
        return new Promise((resolve) => {
            resolve([]);
        });
    }
};