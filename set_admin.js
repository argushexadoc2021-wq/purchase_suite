import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setSuperAdmin(email) {
    console.log(`Looking for user with email: ${email}`);

    // 1. Find user by email in auth.users
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error("Error fetching users:", userError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error(`User with email ${email} not found.`);
        return;
    }

    console.log(`Found user ID: ${user.id}`);

    // 2. Update role in public.profiles
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'super_admin' })
        .eq('id', user.id)
        .select();

    if (error) {
        console.error("Error updating profile:", error);
    } else {
        console.log("Successfully updated user to super_admin:", data);
    }
}

setSuperAdmin('jananimohan44@gmail.com');
