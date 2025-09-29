export const getStatusStyles = (status) => {
  // Return className strings; consumers expect strings so we reference CSS variables
  switch (status) {
    case 'active':
    case 'in-progress':
      return 'bg-[var(--color-primary-light-tint)] text-[var(--color-primary-blueprint-blue)]';
    case 'planning':
      return 'bg-yellow-100 text-yellow-800';
    case 'pending':
      return 'bg-gray-100 text-gray-800';
    case 'overdue':
      return 'bg-red-100 text-red-800';
    case 'completed':
      return 'bg-[var(--color-success-green)] text-white';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getPriorityStyles = (priority) => {
  switch (priority) {
    case 'high':
      return 'border-l-4 border-red-500';
    case 'medium':
      return 'border-l-4 border-yellow-500';
    case 'low':
      return 'border-l-4 border-[var(--color-primary-blueprint-blue)]';
    default:
      return 'border-l-4 border-gray-300';
  }
};

export const formatCurrency = (amount) => {
  return `$${amount.toLocaleString()}`;
};

export const calculateProgress = (completedItems, totalItems) => {
  if (totalItems === 0) return 0;
  return Math.round((completedItems / totalItems) * 100);
};

export const getOverdueTasks = (tasks) => {
  return tasks.filter(task => task.status === 'overdue');
};

export const getActiveTasks = (tasks) => {
  return tasks.filter(task => task.status === 'pending' || task.status === 'in-progress');
};

export const getActiveProjects = (projects) => {
  return projects.filter(project => project.status === 'active');
};

export const getTotalProjectValue = (projects) => {
  return projects.reduce((sum, project) => sum + project.estimateValue, 0);
};
