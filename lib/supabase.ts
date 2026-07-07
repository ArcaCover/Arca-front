import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente de Supabase con inicialización perezosa: no se conecta al arrancar
// la app, solo cuando algo lo usa. Si faltan las variables de entorno
// (todavía no hay proyecto de Supabase creado), falla con un mensaje claro.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) {
    return client;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL y/o " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY. Copia .env.example a .env.local y " +
        "rellena los valores de tu proyecto de Supabase.",
    );
  }

  client = createClient(url, anonKey);
  return client;
}
