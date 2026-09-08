import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { email, password, full_name, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Correo electrónico y contraseña son requeridos' }, { status: 400 });
    }

    const assignedRole = (role === 'analyst' || role === 'viewer' || role === 'admin') ? role : 'viewer';

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey || serviceRoleKey.includes('tu-service-role-key')) {
      return NextResponse.json(
        { error: 'Service Role Key no configurada en .env.local' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Create user with auto-confirmed email and assigned role
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // AUTO-CONFIRM EMAIL!
      user_metadata: {
        full_name: full_name || email.split('@')[0],
        role: assignedRole,
      },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Ensure profile row exists in public.profiles with assigned role
    if (newUser.user) {
      await adminSupabase.from('profiles').upsert({
        id: newUser.user.id,
        email,
        full_name: full_name || email.split('@')[0],
        role: assignedRole,
      });
    }

    return NextResponse.json({
      message: 'Usuario creado y confirmado exitosamente',
      user: newUser.user,
      role: assignedRole,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al registrar usuario' },
      { status: 500 }
    );
  }
}
