/**
 * User utility functions for handling user names and display
 */

/**
 * Get the user's full name from user object
 * @param {Object} user - User object with firstName, lastName, or user_metadata
 * @returns {string} Full name or fallback
 */
export const getUserFullName = (user) => {
  if (!user) return 'Unknown User';
  
  // Check for firstName and lastName directly
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  
  // Check for user_metadata (Supabase format)
  if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
    return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
  }
  
  // Check for name field
  if (user.name) {
    return user.name;
  }
  
  // Check for email as fallback
  if (user.email) {
    return user.email;
  }
  
  return 'Unknown User';
};

/**
 * Get the user's first name from user object
 * @param {Object} user - User object
 * @returns {string} First name or fallback
 */
export const getUserFirstName = (user) => {
  if (!user) return 'Unknown';
  
  if (user.firstName) return user.firstName;
  if (user.user_metadata?.first_name) return user.user_metadata.first_name;
  if (user.name) return user.name.split(' ')[0];
  if (user.email) return user.email.split('@')[0];
  
  return 'Unknown';
};

/**
 * Get the user's last name from user object
 * @param {Object} user - User object
 * @returns {string} Last name or fallback
 */
export const getUserLastName = (user) => {
  if (!user) return 'User';
  
  if (user.lastName) return user.lastName;
  if (user.user_metadata?.last_name) return user.user_metadata.last_name;
  if (user.name) {
    const nameParts = user.name.split(' ');
    return nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  }
  
  return 'User';
};

/**
 * Get user initials for avatar display
 * @param {Object} user - User object
 * @returns {string} User initials
 */
export const getUserInitials = (user) => {
  if (!user) return 'U';
  
  const firstName = getUserFirstName(user);
  const lastName = getUserLastName(user);
  
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  
  if (firstName) {
    return firstName.charAt(0).toUpperCase();
  }
  
  if (user.email) {
    return user.email.charAt(0).toUpperCase();
  }
  
  return 'U';
};
