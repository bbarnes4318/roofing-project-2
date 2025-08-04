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
  const searchContainerRef = useRef(null);

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

  // Maps phase names to CSS classes for styling
  const phaseColorMap = {
    "LEAD": "phase-not-started",
    "PROSPECT": "phase-not-started", 
    "APPROVED": "phase-in-progress",
    "EXECUTION": "phase-in-progress",
    "COMPLETION": "phase-completed",
    "Not Started": "phase-not-started",
    "In Progress": "phase-in-progress",
    "Completed": "phase-completed",
    "On Hold": "phase-on-hold",
  };

  const getMatchesForField = (result, fieldName) => {
    if (!result.matches) return [];
    return result.matches.filter(match => 
      match.key === fieldName || 
      match.key.endsWith(fieldName) ||
      match.key.includes(fieldName)
    );
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
    <div className={`global-search-container ${className}`} ref={searchContainerRef}>
      {/* Search Icon */}
      <div className="search-icon-wrapper">
        <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      
      <input
        type="text"
        className={`global-search-input ${colorMode ? 'dark-mode' : ''}`}
        placeholder="Search projects, customers, or alerts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
      />
      
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
        <div className={`search-results-dropdown ${colorMode ? 'bg-[#1e293b] border-gray-600' : ''}`}>
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
                  className="search-result-item cursor-pointer"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="project-info">
                    <span className={`phase-indicator ${phaseColorMap[result.data.phase] || 'phase-not-started'}`}></span>
                    <div className="project-details">
                      <span className="project-name">
                        <Highlight 
                          text={result.title} 
                          matches={getMatchesForField(result, 'name')} 
                          query={query}
                        />
                      </span>
                      <span className="project-client">
                        <Highlight 
                          text={result.subtitle} 
                          matches={getMatchesForField(result, 'client')} 
                          query={query}
                        />
                      </span>
                      <span className="text-xs text-gray-500 truncate">
                        <Highlight 
                          text={result.description} 
                          matches={getMatchesForField(result, 'address')} 
                          query={query}
                        />
                      </span>
                    </div>
                  </div>
                  {category === 'Projects' && (
                    <div className="project-actions">
                      <button
                        className="action-btn alert-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (handleCreateAlert) {
                            handleCreateAlert(result.data);
                          }
                        }}
                      >
                        Create Alert
                      </button>
                      <button
                        className="action-btn activity-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (handleAddActivity) {
                            handleAddActivity(result.data);
                          }
                        }}
                      >
                        Add Activity
                      </button>
                    </div>
                  )}
                  {category !== 'Projects' && (
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResultClick(result);
                      }}
                    >
                      View Details
                    </button>
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