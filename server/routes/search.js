const express = require('express');
const { prisma } = require('../config/prisma');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');

// Advanced Natural Language Search Endpoint
router.post('/advanced', asyncHandler(async (req, res) => {
    const { 
        intent, 
        entities, 
        originalQuery, 
        filters = {}, 
        searchText = null,
        limit = 50 
    } = req.body;

    console.log('🤖 Advanced Search Request:', { 
        intent, 
        entities, 
        filters, 
        searchText, 
        originalQuery 
    });

    try {
        let results = [];

        // Handle different search intents
        switch (intent) {
            case 'search.by.status':
                results = await searchProjectsByStatus(filters.status, limit);
                break;
            
            case 'search.by.phase':
                results = await searchProjectsByPhase(filters.phase, limit);
                break;
            
            case 'search.by.timeframe':
                results = await searchProjectsByTimeframe(filters.timeframe, limit);
                break;
            
            case 'search.by.type':
                results = await searchProjectsByType(filters.projectType, limit);
                break;
            
            case 'search.customer':
                results = await searchCustomers(searchText, limit);
                break;
            
            case 'search.project':
                results = await searchProjects(searchText, limit);
                break;
            
            default:
                // Fallback to general search
                results = await performGeneralSearch(originalQuery, limit);
                break;
        }

        // Format results consistently
        const formattedResults = formatSearchResults(results, intent);

        res.json({
            success: true,
            data: {
                results: formattedResults,
                count: formattedResults.length,
                intent,
                searchMeta: {
                    originalQuery,
                    processedIntent: intent,
                    entities,
                    filters,
                    searchText
                }
            },
            message: `Found ${formattedResults.length} results`
        });

    } catch (error) {
        console.error('Advanced search error:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Search failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}));

// Search projects by status
async function searchProjectsByStatus(status, limit) {
    const statusMap = {
        'completed': ['COMPLETED', 'FINISHED', 'DONE'],
        'in-progress': ['IN_PROGRESS', 'ACTIVE', 'ONGOING'],
        'not-started': ['NOT_STARTED', 'PENDING', 'NEW'],
        'on-hold': ['ON_HOLD', 'PAUSED', 'SUSPENDED']
    };

    const statusValues = statusMap[status] || [status.toUpperCase()];

    return await prisma.project.findMany({
        where: {
            status: {
                in: statusValues
            }
        },
        include: {
            customer: true,
            projectManager: true,
            currentLineItem: true,
            currentSection: true,
            currentPhase: true
        },
        take: limit,
        orderBy: {
            updatedAt: 'desc'
        }
    });
}

// Search projects by phase
async function searchProjectsByPhase(phase, limit) {
    return await prisma.project.findMany({
        where: {
            currentPhase: {
                name: {
                    equals: phase,
                    mode: 'insensitive'
                }
            }
        },
        include: {
            customer: true,
            projectManager: true,
            currentLineItem: true,
            currentSection: true,
            currentPhase: true
        },
        take: limit,
        orderBy: {
            updatedAt: 'desc'
        }
    });
}

// Search projects by timeframe
async function searchProjectsByTimeframe(timeframe, limit) {
    const now = new Date();
    let dateFilter = {};

    switch (timeframe) {
        case 'today':
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            const endOfDay = new Date(now.setHours(23, 59, 59, 999));
            dateFilter = {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            };
            break;

        case 'this-week':
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            dateFilter = {
                createdAt: {
                    gte: startOfWeek
                }
            };
            break;

        case 'last-week':
            const lastWeekEnd = new Date(now.setDate(now.getDate() - now.getDay()));
            const lastWeekStart = new Date(lastWeekEnd);
            lastWeekStart.setDate(lastWeekEnd.getDate() - 7);
            dateFilter = {
                createdAt: {
                    gte: lastWeekStart,
                    lte: lastWeekEnd
                }
            };
            break;

        case 'this-month':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            dateFilter = {
                createdAt: {
                    gte: startOfMonth
                }
            };
            break;

        case 'last-month':
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            dateFilter = {
                createdAt: {
                    gte: lastMonthStart,
                    lte: lastMonthEnd
                }
            };
            break;

        case 'last-quarter':
            const quarterStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            dateFilter = {
                createdAt: {
                    gte: quarterStart
                }
            };
            break;

        case 'last-year':
            const yearStart = new Date(now.getFullYear() - 1, 0, 1);
            const yearEnd = new Date(now.getFullYear() - 1, 11, 31);
            dateFilter = {
                createdAt: {
                    gte: yearStart,
                    lte: yearEnd
                }
            };
            break;
    }

    return await prisma.project.findMany({
        where: dateFilter,
        include: {
            customer: true,
            projectManager: true,
            currentLineItem: true,
            currentSection: true,
            currentPhase: true
        },
        take: limit,
        orderBy: {
            createdAt: 'desc'
        }
    });
}

// Search projects by type
async function searchProjectsByType(projectType, limit) {
    return await prisma.project.findMany({
        where: {
            OR: [
                {
                    projectType: {
                        contains: projectType,
                        mode: 'insensitive'
                    }
                },
                {
                    name: {
                        contains: projectType,
                        mode: 'insensitive'
                    }
                },
                {
                    description: {
                        contains: projectType,
                        mode: 'insensitive'
                    }
                }
            ]
        },
        include: {
            customer: true,
            projectManager: true,
            currentLineItem: true,
            currentSection: true,
            currentPhase: true
        },
        take: limit,
        orderBy: {
            updatedAt: 'desc'
        }
    });
}

// Search customers
async function searchCustomers(searchText, limit) {
    return await prisma.customer.findMany({
        where: {
            OR: [
                {
                    primaryName: {
                        contains: searchText,
                        mode: 'insensitive'
                    }
                },
                {
                    secondaryName: {
                        contains: searchText,
                        mode: 'insensitive'
                    }
                },
                {
                    primaryEmail: {
                        contains: searchText,
                        mode: 'insensitive'
                    }
                },
                {
                    primaryPhone: {
                        contains: searchText,
                        mode: 'insensitive'
                    }
                },
                {
                    address: {
                        contains: searchText,
                        mode: 'insensitive'
                    }
                }
            ]
        },
        include: {
            projects: {
                include: {
                    currentPhase: true
                }
            }
        },
        take: limit,
        orderBy: {
            primaryName: 'asc'
        }
    });
}

// Search projects
async function searchProjects(searchText, limit) {
    return await prisma.project.findMany({
        where: {
            OR: [
                {
                    projectNumber: {
                        contains: searchText,
                        mode: 'insensitive'
                    }
                },
                {
                    name: {
                        contains: searchText,
                        mode: 'insensitive'
                    }
                },
                {
                    address: {
                        contains: searchText,
                        mode: 'insensitive'
                    }
                },
                {
                    description: {
                        contains: searchText,
                        mode: 'insensitive'
                    }
                },
                {
                    customer: {
                        OR: [
                            {
                                primaryName: {
                                    contains: searchText,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                secondaryName: {
                                    contains: searchText,
                                    mode: 'insensitive'
                                }
                            }
                        ]
                    }
                }
            ]
        },
        include: {
            customer: true,
            projectManager: true,
            currentLineItem: true,
            currentSection: true,
            currentPhase: true
        },
        take: limit,
        orderBy: {
            updatedAt: 'desc'
        }
    });
}

// General search fallback
async function performGeneralSearch(query, limit) {
    const projects = await prisma.project.findMany({
        where: {
            OR: [
                {
                    projectNumber: {
                        contains: query,
                        mode: 'insensitive'
                    }
                },
                {
                    name: {
                        contains: query,
                        mode: 'insensitive'
                    }
                },
                {
                    address: {
                        contains: query,
                        mode: 'insensitive'
                    }
                },
                {
                    customer: {
                        OR: [
                            {
                                primaryName: {
                                    contains: query,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                primaryEmail: {
                                    contains: query,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                primaryPhone: {
                                    contains: query,
                                    mode: 'insensitive'
                                }
                            }
                        ]
                    }
                }
            ]
        },
        include: {
            customer: true,
            projectManager: true,
            currentLineItem: true,
            currentSection: true,
            currentPhase: true
        },
        take: limit,
        orderBy: {
            updatedAt: 'desc'
        }
    });

    return projects;
}

// Format search results consistently
function formatSearchResults(results, intent) {
    if (!Array.isArray(results)) {
        return [];
    }

    // Determine result type based on first item
    if (results.length === 0) return [];
    
    const firstItem = results[0];
    
    // If it's a customer object
    if (firstItem.primaryName && firstItem.projects) {
        return results.map(customer => ({
            id: customer.id,
            type: 'customer',
            category: 'Customers',
            title: customer.primaryName || 'Unknown Customer',
            subtitle: formatPhoneNumber(customer.primaryPhone) || customer.primaryEmail || 'No contact info',
            description: `${customer.projects?.length || 0} project(s)`,
            data: customer,
            searchScore: 1.0,
            navigationTarget: {
                page: 'customers',
                customerId: customer.id
            }
        }));
    }
    
    // Otherwise, assume it's projects
    return results.map(project => ({
        id: project.id,
        type: 'project',
        category: 'Projects',
        title: project.projectNumber?.toString() || 'No Project #',
        subtitle: project.customer?.primaryName || 'Unknown Customer',
        description: project.address || project.name || 'No address',
        data: project,
        searchScore: 1.0,
        navigationTarget: {
            page: 'projects',
            projectId: project.id,
            project: {
                ...project,
                scrollToProjectId: String(project.id)
            }
        }
    }));
}

// Helper function to format phone numbers
function formatPhoneNumber(phone) {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
}

// Simple search endpoint for fallback
router.get('/simple', asyncHandler(async (req, res) => {
    const { q: query, limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
        return res.json({
            success: true,
            data: {
                results: [],
                count: 0
            },
            message: 'Query too short'
        });
    }

    try {
        const results = await performGeneralSearch(query, parseInt(limit));
        const formattedResults = formatSearchResults(results, 'general');

        res.json({
            success: true,
            data: {
                results: formattedResults,
                count: formattedResults.length
            },
            message: `Found ${formattedResults.length} results`
        });

    } catch (error) {
        console.error('Simple search error:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Search failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}));

module.exports = router;