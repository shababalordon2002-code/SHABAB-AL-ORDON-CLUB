import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Helper to verify if caller is an Admin
async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, status: 401, error: 'No autenticado' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { authorized: false, status: 403, error: 'Acceso denegado. Se requieren permisos de Administrador.' };
  }

  return { authorized: true, user };
}

// GET: List all users with profiles
export async function GET() {
  const authCheck = await verifyAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const adminSupabase = createAdminClient();
    
    // Fetch profiles
    const { data: profiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Fetch auth users to get last_sign_in_at
    const { data: { users: authUsers }, error: authError } = await adminSupabase.auth.admin.listUsers();

    if (authError) {
      console.warn('Could not list auth users:', authError.message);
    }

    const authMap = new Map(authUsers?.map((u) => [u.id, u]) || []);

    const combinedUsers = (profiles || []).map((p) => {
      const authUser = authMap.get(p.id);
      return {
        ...p,
        last_sign_in_at: authUser?.last_sign_in_at || null,
      };
    });

    return NextResponse.json({ users: combinedUsers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}

// POST: Create a new user
export async function POST(request: Request) {
  const authCheck = await verifyAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json();
    const { email, password, full_name, role } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'El email y la contraseña son obligatorios' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Create auth user
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || email.split('@')[0],
        role: role || 'user',
      },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Upsert into profiles table to ensure profile exists with exact role
    if (newUser.user) {
      await adminSupabase.from('profiles').upsert({
        id: newUser.user.id,
        email,
        full_name: full_name || email.split('@')[0],
        role: role || 'user',
      });
    }

    return NextResponse.json({ message: 'Usuario creado exitosamente', user: newUser.user }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al crear usuario' }, { status: 500 });
  }
}

// PATCH: Update user role or profile
export async function PATCH(request: Request) {
  const authCheck = await verifyAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json();
    const { userId, role, full_name } = body;

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    const updates: Record<string, any> = {};
    if (role) updates.role = role;
    if (full_name !== undefined) updates.full_name = full_name;

    const { data, error } = await adminSupabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Perfil actualizado', profile: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al actualizar perfil' }, { status: 500 });
  }
}

// DELETE: Delete a user
export async function DELETE(request: Request) {
  const authCheck = await verifyAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (authCheck.user && userId === authCheck.user.id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta de Administrador' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase.auth.admin.deleteUser(userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al eliminar usuario' }, { status: 500 });
  }
}
