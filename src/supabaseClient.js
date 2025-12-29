// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL' // Get this from Supabase Dashboard -> Settings -> API
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'    // Get this from Supabase Dashboard -> Settings -> API

export const supabase = createClient(supabaseUrl, supabaseKey)