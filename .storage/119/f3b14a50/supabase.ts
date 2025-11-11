import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mmfjhxxbjgxrpgtxflti.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZmpoeHhiamd4cnBndHhmbHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MzgyOTIsImV4cCI6MjA3ODMxNDI5Mn0.gImiWKxX6VyLxvA9Ex0vXtoD6348gIZM5LKiO3OAovI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const BUCKET_NAME = 'app_d1fb97baaa_photos';