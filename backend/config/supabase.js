import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.join(backendDirectory, '..', '.env'),
});

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)
  : null;

export default supabase;