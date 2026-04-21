import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Leer .env.local manualmente
const envPath = '.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  if (!line.trim() || line.startsWith('#')) return; // Ignorar líneas vacías y comentarios
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    const value = valueParts.join('=').trim(); // En caso de múltiples '='
    envVars[key.trim()] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const serviceRoleKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Variables detectadas:');
console.log('   Claves en envVars:', Object.keys(envVars));
console.log('   URL detectada:', !!supabaseUrl);
console.log('   KEY detectada:', !!serviceRoleKey);
console.log('   KEY valor (first 50 chars):', serviceRoleKey ? serviceRoleKey.substring(0, 50) : 'undefined');

if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === '...') {
  console.error('❌ Error: Faltan VITE_SUPABASE_URL o VITE_SUPABASE_SERVICE_ROLE_KEY en .env.local');
  console.error(`URL: ${supabaseUrl ? '✓' : '✗'}`);
  console.error(`KEY: ${serviceRoleKey && serviceRoleKey !== '...' ? '✓' : '✗'}`);
  process.exit(1);
}

// Crear cliente Supabase con Service Role (permisos admin)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanupUsers() {
  try {
    console.log('🧹 Iniciando limpieza de usuarios...');

    // Obtener lista de todos los usuarios (excepto tú mismo si lo deseas)
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error al obtener usuarios:', listError);
      return;
    }

    console.log(`📊 Encontrados ${users.users.length} usuarios`)

    if (users.users.length === 0) {
      console.log('✅ No hay usuarios que eliminar. Base de datos ya está limpia.');
      return;
    }

    // Borrar cada usuario
    for (const user of users.users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error(`❌ Error borrando usuario ${user.email}:`, deleteError);
      } else {
        console.log(`✅ Borrado: ${user.email}`);
      }
    }

    // Verificar que quedó limpio
    const { data: remaining } = await supabase.auth.admin.listUsers();
    console.log(`\n🎉 Limpieza completa. Usuarios restantes: ${remaining?.users.length || 0}`);

  } catch (error) {
    console.error('❌ Error durante limpieza:', error.message);
  }
}

cleanupUsers();
