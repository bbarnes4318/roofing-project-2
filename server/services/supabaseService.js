const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL and service key are required.');
  //throw new Error('Supabase URL and service key are required.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Create a new user in Supabase Auth.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @param {object} metadata - Additional user metadata.
 * @returns {Promise<object>} - The created user object from Supabase.
 */
const createSupabaseUser = async (email, password, metadata = {}) => {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm the email
    user_metadata: metadata,
  });

  if (error) {
    console.error('Error creating Supabase user:', error.message);
    throw new Error(`Supabase error: ${error.message}`);
  }

  return data.user;
};

/**
 * Delete a user from Supabase Auth.
 * @param {string} userId - The ID of the user to delete.
 * @returns {Promise<void>}
 */
const deleteSupabaseUser = async (userId) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    console.error('Error deleting Supabase user:', error.message);
    throw new Error(`Supabase error: ${error.message}`);
  }
};

module.exports = {
  createSupabaseUser,
  deleteSupabaseUser,
};
