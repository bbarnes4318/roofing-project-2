export const getOverdueTasks = (tasks) => {
  const today = new Date();
  return tasks.filter(task => {
    const dueDate = new Date(task.alertDate || task.dueDate);
    const normalizedStatus = String(task.status || '').toLowerCase();
    const isCompleted = normalizedStatus === 'completed' || normalizedStatus === 'done' || normalizedStatus === 'closed';
    return dueDate < today && !isCompleted;
  });
};

export const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export const calculateProgress = (tasks) => {
  if (!tasks.length) return 0;
  const completed = tasks.filter(task => String(task.status || '').toLowerCase() === 'completed' || String(task.status || '').toLowerCase() === 'done').length;
  return Math.round((completed / tasks.length) * 100);
};

export const getStatusStyles = (status) => {
    switch (status) {
        case 'active': case 'in-progress': return 'bg-blue-100 text-blue-800';
        case 'planning': return 'bg-yellow-100 text-yellow-800';
        case 'pending': return 'bg-gray-100 text-gray-800';
        case 'overdue': return 'bg-red-100 text-red-800';
        case 'completed': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export const getPriorityStyles = (priority) => {
    switch (priority) {
        case 'high': return 'border-l-4 border-red-500';
        case 'medium': return 'border-l-4 border-yellow-500';
        case 'low': return 'border-l-4 border-blue-500';
        default: return 'border-l-4 border-gray-300';
    }
};

/**
 * Formats a phone number to (555) 555-5555 format
 * @param {string} phone - The phone number to format
 * @returns {string} - Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
    if (!phone) return '(555) 555-5555';
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If it's already in the right format, return as is
    if (phone.match(/^\(\d{3}\) \d{3}-\d{4}$/)) {
        return phone;
    }
    
    // Format to (555) 555-5555
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // If it's 11 digits and starts with 1, format as US number
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    // Return default format if can't parse
    return '(555) 555-5555';
}; 