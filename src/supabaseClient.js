// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nivkbsoprmeaysbodjea.supabase.co' // Get this from Supabase Dashboard -> Settings -> API
const supabaseKey = 'sb_publishable_6bIWguWjU-ZTAZ2pkLvrvg_4Sqg2J5j'    // Get this from Supabase Dashboard -> Settings -> API

export const supabase = createClient(supabaseUrl, supabaseKey)