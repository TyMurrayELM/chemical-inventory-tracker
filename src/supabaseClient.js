import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dzbcezrmiiaqdwxlaleb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6YmNlenJtaWlhcWR3eGxhbGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2OTQ2MjEsImV4cCI6MjA1NDI3MDYyMX0.7395EW1HYAgqakyoyRxiCZBRFy3fHXeHUaHqleDFr1U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)