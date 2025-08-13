import React, { useState, useEffect, useRef, useMemo } from "react";
import { SearchService } from "../../services/searchService";
import NaturalLanguageSearchService from "../../services/nlSearchService";
import "./GlobalSearch.css";

// Helper component for highlighting matched text using Fuse.js matches
const Highlight = ({ text, matches = [], query = "" }) => {
  if (!matches || matches.length === 0 || !text) {
    return <span>{text}</span>;
  }

  // Find matches for this specific text
  const textMatches = matches.filter(match => 
    match.value === text || 
    (typeof match.value === 'string' && match.value.includes(text))
  );
  
  if (textMatches.length === 0) {
    // Fallback to simple string matching if no Fuse matches
    if (!query.trim()) return <span>{text}</span>;
    
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const parts = text.split(regex);
    const matches = text.match(regex) || [];
    
    return (
      <span>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {matches[i] && (
              <strong className="search-highlight">
                {matches[i]}
              </strong>
            )}
          </React.Fragment>
        ))}
      </span>
    );
  }

  const result = [];
  let lastIndex = 0;

  // Use the first match's indices
  const indices = textMatches[0].indices || [];
  
  indices.forEach(([start, end], i) => {
    // Add the text before the highlight
    if (start > lastIndex) {
      result.push(<span key={`unmatched-${i}-pre`}>{text.substring(lastIndex, start)}</span>);
    }
    // Add the highlighted text
    result.push(
      <strong key={`matched-${i}`} className="search-highlight">
        {text.substring(start, end + 1)}
      </strong>
    );
    lastIndex = end + 1;
  });

  // Add the remaining text after the last highlight
  if (lastIndex < text.length) {
    result.push(<span key="unmatched-post">{text.substring(lastIndex)}</span>);
  }

  return <span>{result}</span>;
};

// Helper function to detect natural language queries
const isNaturalLanguageQuery = (query) => {
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
    // Connective words that indicate natural language
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
};

// Main search component
export default function GlobalSearch({ 
  projects = [], 
  activities = [], 
  handleCreateAlert, 
  handleAddActivity, 
  onNavigateToResult,
  colorMode = false,
  className = ''
}) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [bubbles, setBubbles] = useState([]);
  const [showRipple, setShowRipple] = useState(false);
  const searchContainerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Initialize both conventional and NL search services
  const searchService = useMemo(() => {
    const service = new SearchService();
    service.updateData({ projects, activities });
    return service;
  }, [projects, activities]);

  const nlSearchService = useMemo(() => {
    const service = new NaturalLanguageSearchService();
    service.updateData({ projects, activities });
    return service;
  }, [projects, activities]);


  useEffect(() => {
    const performSearch = async () => {
      if (query.length < 1) {
        setSearchResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      
      try {
        // Determine if this looks like a natural language query
        const isNaturalLanguage = nlSearchService.nlpManager.isNaturalLanguageQuery(query);
        
        let results;
        if (isNaturalLanguage) {
          console.log('🤖 Using NL search for:', query);
          results = await nlSearchService.search(query);
        } else {
          console.log('🔍 Using conventional search for:', query);
          results = searchService.search(query);
        }
        
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        // Fallback to conventional search on error
        const fallbackResults = searchService.search(query);
        setSearchResults(fallbackResults);
      }
      
      setLoading(false);
    };

    const debounceTimeout = setTimeout(performSearch, 150);
    return () => clearTimeout(debounceTimeout);
  }, [query, searchService, nlSearchService]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Phase button styling - matches dashboard design
  const getPhaseButtonProps = (phase) => {
    const normalizedPhase = phase?.toUpperCase() || 'LEAD';
    
    switch (normalizedPhase) {
      case 'LEAD':
      case 'LEAD PHASE':
        return {
          initials: 'LD',
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
          fullName: 'Lead'
        };
      case 'PROSPECT':
      case 'PROSPECT PHASE':
        return {
          initials: 'PR',
          bgColor: 'bg-teal-500',
          textColor: 'text-white',
          fullName: 'Prospect'
        };
      case 'APPROVED':
      case 'APPROVED PHASE':
        return {
          initials: 'AP',
          bgColor: 'bg-purple-500',
          textColor: 'text-white',
          fullName: 'Approved'
        };
      case 'EXECUTION':
      case 'EXECUTION PHASE':
        return {
          initials: 'EX',
          bgColor: 'bg-orange-500',
          textColor: 'text-white',
          fullName: 'Execution'
        };
      case '2ND SUPPLEMENT':
      case '2ND SUPPLEMENT PHASE':
      case 'SUPPLEMENT':
        return {
          initials: '2S',
          bgColor: 'bg-pink-500',
          textColor: 'text-white',
          fullName: '2nd Supplement'
        };
      case 'COMPLETION':
      case 'COMPLETION PHASE':
        return {
          initials: 'CM',
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          fullName: 'Completion'
        };
      default:
        return {
          initials: 'LD',
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
          fullName: 'Lead'
        };
    }
  };

  // Phase Button Component
  const PhaseButton = ({ phase, size = 'md' }) => {
    const phaseProps = getPhaseButtonProps(phase);
    const sizeClasses = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
    
    return (
      <div
        className={`${phaseProps.bgColor} ${phaseProps.textColor} ${sizeClasses} rounded-full flex items-center justify-center font-bold shadow-sm border border-white/20`}
        title={phaseProps.fullName}
      >
        {phaseProps.initials}
      </div>
    );
  };

  const getMatchesForField = (result, fieldName) => {
    if (!result.matches) return [];
    return result.matches.filter(match => 
      match.key === fieldName || 
      match.key.endsWith(fieldName) ||
      match.key.includes(fieldName)
    );
  };

  // Create bubbles effect on input focus/click
  const createBubblesEffect = () => {
    const newBubbles = [];
    for (let i = 0; i < 6; i++) {
      const bubble = {
        id: Date.now() + i,
        size: Math.random() * 10 + 5,
        left: Math.random() * 40 - 20,
        delay: Math.random() * 0.5
      };
      newBubbles.push(bubble);
    }
    setBubbles(newBubbles);
    setShowRipple(true);
    
    // Clear effects after animation
    setTimeout(() => {
      setBubbles([]);
      setShowRipple(false);
    }, 1500);
  };


  const handleInputFocus = () => {
    setIsFocused(true);
    createBubblesEffect();
  };

  const handleResultClick = (result) => {
    setIsFocused(false);
    setQuery('');
    
    if (onNavigateToResult) {
      onNavigateToResult(result);
    }
  };

  // Group results by category
  const groupedResults = useMemo(() => {
    const grouped = searchResults.reduce((acc, result) => {
      const category = result.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(result);
      return acc;
    }, {});

    // Limit results per category
    Object.keys(grouped).forEach(category => {
      grouped[category] = grouped[category].slice(0, 10);
    });

    return grouped;
  }, [searchResults]);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Projects':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'Customers':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'Messages':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  return (
    <div className={`global-search-container ${isFocused ? 'search-active' : ''} ${className}`} ref={searchContainerRef}>
      {/* Search Icon */}
      <div className="search-icon-wrapper">
        <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      
      <input
        ref={inputRef}
        type="text"
        className={`global-search-input ${colorMode ? 'dark-mode' : ''}`}
        placeholder="Search projects, customers, or alerts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleInputFocus}
      />
      
      {/* Bubbles Effect */}
      {bubbles.length > 0 && (
        <div className="bubbles-container">
          {bubbles.map((bubble) => (
            <div
              key={bubble.id}
              className="bubble"
              style={{
                width: `${bubble.size}px`,
                height: `${bubble.size}px`,
                left: `${bubble.left}px`,
                animationDelay: `${bubble.delay}s`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Ripple Effect */}
      {showRipple && <div className="ripple-effect" />}
      
      {/* Clear button when there's text */}
      {query && (
        <button 
          className="search-clear-btn"
          onClick={() => setQuery('')}
          type="button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      {isFocused && query.length > 0 && (
        <div 
          ref={dropdownRef}
          className={`search-results-dropdown-simple ${colorMode ? 'bg-[#1e293b] border-gray-600' : ''}`}
        >
          {loading && <div className="search-result-item-message">Loading...</div>}
          {!loading && Object.keys(groupedResults).length === 0 && (
            <div className="search-result-item-message">No results found for "{query}"</div>
          )}
          {!loading && Object.entries(groupedResults).map(([category, results]) => (
            <div key={category}>
              {/* Category Header */}
              <div className={`px-4 py-2 border-b sticky top-0 z-10 ${
                colorMode 
                  ? 'bg-[#232b4d] border-gray-600 text-gray-300' 
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                <div className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {category} ({results.length})
                  </span>
                </div>
              </div>
              
              {/* Results */}
              {results.map((result, index) => (
                <div 
                  key={`${category}-${index}`} 
                  className={`search-result-item-simplified border-b border-gray-100 p-4 ${colorMode ? 'border-gray-600 hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}
                >
                  {category === 'Projects' && (
                    <div className="space-y-3">
                      {/* Customer Contact Info */}
                      <div className="customer-contact-section">
                        <div className={`text-sm font-medium ${colorMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          <Highlight 
                            text={result.data.customer?.primaryName || result.data.clientName || result.subtitle || 'Unknown Customer'} 
                            matches={getMatchesForField(result, 'client')} 
                            query={query}
                          />
                        </div>
                        <div className={`text-xs flex gap-4 mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {result.data.customer?.primaryPhone && (
                            <span>📞 {result.data.customer.primaryPhone}</span>
                          )}
                          {result.data.customer?.primaryEmail && (
                            <span>✉️ {result.data.customer.primaryEmail}</span>
                          )}
                        </div>
                      </div>

                      {/* Project Info */}
                      <div className="project-info-section">
                        <div className="flex items-center gap-3 mb-2">
                          <PhaseButton phase={result.data.phase} size="sm" />
                          
                          {/* Clickable Project Number */}
                          <button
                            className={`text-sm font-semibold hover:underline ${colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onNavigateToResult) {
                                onNavigateToResult({ ...result, page: 'Profile' });
                              }
                            }}
                            title="View Project Profile"
                          >
                            #{String(result.data.projectNumber || result.data.id || '00000').padStart(5, '0')}
                          </button>
                          
                          <div className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <Highlight 
                              text={result.title || result.data.projectName || 'Unnamed Project'} 
                              matches={getMatchesForField(result, 'name')} 
                              query={query}
                            />
                          </div>
                        </div>

                        {/* Project Details */}
                        <div className={`text-xs space-y-1 ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <div><strong>Phase:</strong> {result.data.phase || 'Unknown'}</div>
                          <div><strong>Section:</strong> {result.data.currentWorkflowItem?.section || 'Not Available'}</div>
                          <div>
                            <strong>Line Item:</strong> 
                            {result.data.currentWorkflowItem?.lineItem ? (
                              <button
                                className={`ml-1 hover:underline ${colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (onNavigateToResult && result.data.currentWorkflowItem) {
                                    // Navigate to workflow with specific line item highlighting
                                    try {
                                      // Get current project position from the API
                                      const response = await fetch(`/api/workflow-data/project-position/${result.data.id}`, {
                                        headers: {
                                          'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                                        }
                                      });
                                      
                                      if (response.ok) {
                                        const responseData = await response.json();
                                        if (responseData.success && responseData.data) {
                                          const position = responseData.data;
                                          const targetLineItemId = position.currentLineItem;
                                          const targetSectionId = position.currentSection;
                                          
                                          onNavigateToResult({ 
                                            ...result, 
                                            page: 'Project Workflow',
                                            targetLineItemId,
                                            targetSectionId
                                          });
                                        } else {
                                          // Fallback navigation
                                          onNavigateToResult({ ...result, page: 'Project Workflow' });
                                        }
                                      } else {
                                        // Fallback navigation
                                        onNavigateToResult({ ...result, page: 'Project Workflow' });
                                      }
                                    } catch (error) {
                                      console.warn('Could not get workflow position:', error);
                                      // Fallback navigation
                                      onNavigateToResult({ ...result, page: 'Project Workflow' });
                                    }
                                  }
                                }}
                                title="Navigate to Line Item in Workflow"
                              >
                                {result.data.currentWorkflowItem.lineItem}
                              </button>
                            ) : (
                              <span className="ml-1">Not Available</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  
                  {category === 'Customers' && (
                    <div className="enhanced-customer-actions">
                      <div className="action-group customer-primary">
                        <button
                          className="action-btn primary profile-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigateToResult) {
                              // Navigate to customer's project profile
                              onNavigateToResult({ ...result, page: 'Project Profile', projectId: result.data.projectId });
                            }
                          }}
                          title="View Customer's Project Profile"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Project
                        </button>
                      </div>
                      
                      <div className="action-group customer-contact">
                        {result.data.email && (
                          <a
                            href={`mailto:${result.data.email}`}
                            className="action-btn secondary email-btn"
                            onClick={(e) => e.stopPropagation()}
                            title={`Send email to ${result.data.email}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Email
                          </a>
                        )}
                        {result.data.phone && (
                          <a
                            href={`sms:${result.data.phone.replace(/[^\d+]/g, '')}`}
                            className="action-btn secondary sms-btn"
                            onClick={(e) => e.stopPropagation()}
                            title={`Send SMS to ${result.data.phone}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            SMS
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {(category === 'Phone Numbers' || (result.data.phone && category !== 'Customers')) && (
                    <div className="enhanced-phone-actions">
                      <div className="action-group phone-actions">
                        <a
                          href={`tel:${(result.data.phone || result.title || '').replace(/[^\d+]/g, '')}`}
                          className="action-btn primary call-btn"
                          onClick={(e) => e.stopPropagation()}
                          title={`Call ${result.data.phone || result.title}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          Call
                        </a>
                        <a
                          href={`sms:${(result.data.phone || result.title || '').replace(/[^\d+]/g, '')}`}
                          className="action-btn secondary text-btn"
                          onClick={(e) => e.stopPropagation()}
                          title={`Text ${result.data.phone || result.title}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Text
                        </a>
                        {result.data.projectId && (
                          <button
                            className="action-btn secondary profile-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onNavigateToResult) {
                                onNavigateToResult({ ...result, page: 'Project Profile', projectId: result.data.projectId });
                              }
                            }}
                            title="View Project Profile"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Project
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {(category === 'Emails' || (result.data.email && category !== 'Customers')) && (
                    <div className="enhanced-email-actions">
                      <div className="action-group email-actions">
                        <a
                          href={`mailto:${result.data.email || result.title || ''}`}
                          className="action-btn primary email-btn"
                          onClick={(e) => e.stopPropagation()}
                          title={`Send email to ${result.data.email || result.title}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Email
                        </a>
                        {result.data.projectId && (
                          <button
                            className="action-btn secondary profile-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onNavigateToResult) {
                                onNavigateToResult({ ...result, page: 'Project Profile', projectId: result.data.projectId });
                              }
                            }}
                            title="View Project Profile"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Project
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {(category === 'Addresses' || (result.data.address && category !== 'Projects' && category !== 'Customers')) && (
                    <div className="enhanced-address-actions">
                      <div className="action-group address-actions">
                        {result.data.projectId && (
                          <button
                            className="action-btn primary profile-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onNavigateToResult) {
                                onNavigateToResult({ ...result, page: 'Project Profile', projectId: result.data.projectId });
                              }
                            }}
                            title="View Project Profile"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Project Profile
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Default fallback for other categories */}
                  {!['Projects', 'Customers', 'Phone Numbers', 'Emails', 'Addresses'].includes(category) && (
                    <div className="enhanced-default-actions">
                      <button
                        className="action-btn primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResultClick(result);
                        }}
                        title="View Details"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}