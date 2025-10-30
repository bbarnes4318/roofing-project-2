const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase env not set for server. Define SUPABASE_URL and SUPABASE_SERVICE_KEY.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const createUser = async (email, password, userData) => {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: userData,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  return data.user;
};

module.exports = {
  supabase,
  createUser,
};
