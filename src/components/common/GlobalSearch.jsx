import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SearchService } from '../../services/searchService';

const GlobalSearch = ({ 
    projects = [], 
    activities = [], 
    onNavigateToResult, 
    colorMode = false,
    className = ''
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    
    const searchRef = useRef(null);
    const resultsRef = useRef(null);
    const inputRef = useRef(null);

    // Initialize search service with data
    const searchService = useMemo(() => {
        const service = new SearchService();
        service.updateData({ projects, activities });
        return service;
    }, [projects, activities]);

    // Debounced search function
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        const timeoutId = setTimeout(() => {
            const results = searchService.search(searchQuery);
            setSearchResults(results);
            setIsOpen(true);
            setSelectedIndex(-1);
            setIsLoading(false);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, searchService]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen || searchResults.length === 0) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => 
                        prev < searchResults.length - 1 ? prev + 1 : prev
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0) {
                        handleResultClick(searchResults[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    setIsOpen(false);
                    setSelectedIndex(-1);
                    inputRef.current?.blur();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, searchResults, selectedIndex]);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsOpen(false);
                setSelectedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && resultsRef.current) {
            const selectedElement = resultsRef.current.children[selectedIndex];
            if (selectedElement) {
                selectedElement.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth'
                });
            }
        }
    }, [selectedIndex]);

    const handleInputChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleResultClick = (result) => {
        setIsOpen(false);
        setSearchQuery('');
        setSelectedIndex(-1);
        
        if (onNavigateToResult) {
            onNavigateToResult(result);
        }
    };

    const handleClear = () => {
        setSearchQuery('');
        setSearchResults([]);
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.focus();
    };

    const highlightText = (text, query) => {
        if (!query.trim() || !text) return text;
        
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const parts = text.split(regex);
        const matches = text.match(regex) || [];
        
        return parts.map((part, i) => (
            <React.Fragment key={i}>
                {part}
                {matches[i] && (
                    <span className={`font-bold ${colorMode ? 'bg-yellow-400 text-black' : 'bg-yellow-200 text-gray-900'} px-1 rounded`}>
                        {matches[i]}
                    </span>
                )}
            </React.Fragment>
        ));
    };

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
            case 'Contacts':
                return (
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
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

    return (
        <div ref={searchRef} className={`relative ${className}`}>
            {/* Search Input */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className={`w-5 h-5 ${colorMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={() => searchQuery.trim() && setIsOpen(true)}
                    placeholder="Search projects, customers, messages..."
                    className={`w-full pl-10 pr-10 py-2 text-sm border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        colorMode 
                            ? 'bg-[#1e293b] border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                />
                {/* Clear Button */}
                {searchQuery && (
                    <button
                        onClick={handleClear}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Search Results Dropdown */}
            {isOpen && (
                <div className={`absolute top-full left-0 right-0 mt-2 max-h-96 overflow-y-auto rounded-lg shadow-lg border z-50 ${
                    colorMode 
                        ? 'bg-[#1e293b] border-gray-600' 
                        : 'bg-white border-gray-200'
                }`}>
                    {isLoading ? (
                        <div className="p-4 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                            <p className={`mt-2 text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Searching...
                            </p>
                        </div>
                    ) : Object.keys(groupedResults).length === 0 ? (
                        <div className="p-4 text-center">
                            <div className={`text-4xl mb-2 ${colorMode ? 'text-gray-600' : 'text-gray-300'}`}>🔍</div>
                            <p className={`text-sm font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                No results found
                            </p>
                            <p className={`text-xs mt-1 ${colorMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                Try different search terms
                            </p>
                        </div>
                    ) : (
                        <div ref={resultsRef}>
                            {Object.entries(groupedResults).map(([category, results]) => (
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
                                        <button
                                            key={`${category}-${index}`}
                                            onClick={() => handleResultClick(result)}
                                            className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                                                selectedIndex === searchResults.indexOf(result)
                                                    ? colorMode 
                                                        ? 'bg-[#3b82f6] text-white' 
                                                        : 'bg-blue-50 text-blue-900'
                                                    : colorMode 
                                                        ? 'hover:bg-[#232b4d] text-gray-100' 
                                                        : 'hover:bg-gray-50 text-gray-900'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium truncate">
                                                        {highlightText(result.title, searchQuery)}
                                                    </div>
                                                    <div className={`text-xs mt-1 ${
                                                        selectedIndex === searchResults.indexOf(result)
                                                            ? colorMode ? 'text-blue-100' : 'text-blue-600'
                                                            : colorMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>
                                                        {highlightText(result.subtitle, searchQuery)}
                                                    </div>
                                                    {result.description && (
                                                        <div className={`text-xs mt-1 line-clamp-2 ${
                                                            selectedIndex === searchResults.indexOf(result)
                                                                ? colorMode ? 'text-blue-100' : 'text-blue-600'
                                                                : colorMode ? 'text-gray-500' : 'text-gray-400'
                                                        }`}>
                                                            {highlightText(result.description, searchQuery)}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Match badges */}
                                                <div className="flex flex-col gap-1">
                                                    {result.matchedFields.map((field, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={`text-xs px-2 py-1 rounded-full ${
                                                                colorMode 
                                                                    ? 'bg-gray-700 text-gray-300' 
                                                                    : 'bg-gray-200 text-gray-700'
                                                            }`}
                                                        >
                                                            {field}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Keyboard shortcuts hint */}
                    {!isLoading && Object.keys(groupedResults).length > 0 && (
                        <div className={`px-4 py-2 border-t text-xs ${
                            colorMode 
                                ? 'bg-[#232b4d] border-gray-600 text-gray-400' 
                                : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}>
                            Use ↑↓ to navigate, ↵ to select, ESC to close
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;