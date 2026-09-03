class Env {
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: "https://dqmxumfixiudngejxvsz.supabase.co",
  );
  
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbXh1bWZpeGl1ZG5nZWp4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNTM4MTYsImV4cCI6MjEwMzcyOTgxNn0.y96YmCMrcf-gCMyK52qHAXE0lIq122pg47TwDX_nHHQ",
  );
  
  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:3000/api/v1',
  );
}
