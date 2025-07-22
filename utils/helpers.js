export const getStatusStyles = (status) => {
  switch (status) {
    case 'active':
    case 'in-progress':
      return 'bg-blue-100 text-blue-800';
    case 'planning':
      return 'bg-yellow-100 text-yellow-800';
    case 'pending':
      return 'bg-gray-100 text-gray-800';
    case 'overdue':
      return 'bg-red-100 text-red-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
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
      return 'border-l-4 border-blue-500';
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
