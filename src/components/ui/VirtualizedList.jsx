import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * VirtualizedList Component
 * 
 * A high-performance virtual scrolling component that only renders visible items
 * to handle large lists efficiently.
 * 
 * @param {Array} items - Array of items to render
 * @param {number} itemHeight - Height of each item in pixels (default: 60)
 * @param {number} containerHeight - Height of the scrollable container (default: 400)
 * @param {number} overscan - Number of extra items to render outside viewport (default: 5)
 * @param {Function} renderItem - Function to render each item: (item, index) => JSX
 * @param {string} className - CSS classes for the container
 */
const VirtualizedList = ({
  items = [],
  itemHeight = 60,
  containerHeight = 400,
  overscan = 5,
  renderItem,
  className = "",
  getItemHeight = null, // Optional function for dynamic heights
  onScroll = null
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (items.length === 0) return { start: 0, end: 0 };

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Calculate total height for scrollbar
  const totalHeight = useMemo(() => {
    if (getItemHeight) {
      // Dynamic heights - calculate total
      return items.reduce((total, item, index) => total + getItemHeight(item, index), 0);
    }
    return items.length * itemHeight;
  }, [items.length, itemHeight, getItemHeight]);

  // Handle scroll events
  const handleScroll = (e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    
    if (onScroll) {
      onScroll(e);
    }
  };

  // Get items to render
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      originalIndex: visibleRange.start + index,
      key: item.id || item.key || visibleRange.start + index
    }));
  }, [items, visibleRange]);

  // Calculate offset for visible items
  const offsetY = useMemo(() => {
    if (getItemHeight) {
      // Dynamic heights - calculate offset
      return items.slice(0, visibleRange.start).reduce((total, item, index) => {
        return total + getItemHeight(item, index);
      }, 0);
    }
    return visibleRange.start * itemHeight;
  }, [visibleRange.start, itemHeight, getItemHeight, items]);

  return (
    <div 
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      ref={scrollElementRef}
    >
      {/* Total height container for scrollbar */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div 
          style={{ 
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map(({ item, originalIndex, key }) => (
            <div
              key={key}
              style={{ 
                height: getItemHeight ? getItemHeight(item, originalIndex) : itemHeight 
              }}
            >
              {renderItem(item, originalIndex)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for virtual scrolling with custom logic
 */
export const useVirtualScroll = ({ 
  items = [], 
  itemHeight = 60, 
  containerHeight = 400, 
  overscan = 5 
}) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    if (items.length === 0) return { start: 0, end: 0 };

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);

  return {
    scrollTop,
    setScrollTop,
    visibleRange,
    totalHeight,
    offsetY,
    visibleItems,
    scrollProps: {
      onScroll: (e) => setScrollTop(e.target.scrollTop)
    }
  };
};

export default VirtualizedList;