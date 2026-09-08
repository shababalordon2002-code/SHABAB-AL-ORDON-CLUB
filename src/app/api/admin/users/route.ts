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

  // 1. Check metadata
  if (user.user_metadata?.role === 'admin' || user.email === 'shababalordon2002@gmail.com') {
    return { authorized: true, user };
  }

  // 2. Check profiles via Service Role Key (bypassing RLS recursion)
  try {
    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin') {
      return { authorized: true, user };
    }
  } catch (e) {
    console.warn('Error checking profile in verifyAdmin:', e);
  }

  return { authorized: false, status: 403, error: 'Acceso denegado. Se requieren permisos de Administrador.' };
}

// GET: List all users (combines Auth users and Profiles)
export async function GET() {
  const authCheck = await verifyAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const adminSupabase = createAdminClient();

    // 1. Fetch all auth users from Supabase Auth Admin API
    const { data: authData, error: authError } = await adminSupabase.auth.admin.listUsers();
    
    // 2. Fetch profiles from database (service role key bypasses RLS)
    const { data: profiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('*');

    if (authError) {
      console.warn('Could not list auth users from admin API:', authError.message);
    }
    if (profilesError) {
      console.warn('Could not list profiles from database:', profilesError.message);
    }

    // If both failed, surface the error to client
    if (authError && profilesError) {
      return NextResponse.json(
        { error: `Error de Supabase Auth (${authError.message}) y Profiles (${profilesError.message})` },
        { status: 500 }
      );
    }

    const authUsers = authData?.users || [];
    const profilesList = profiles || [];

    const profilesMap = new Map(profilesList.map((p) => [p.id, p]));

    // 3. Combine authUsers and profiles so EVERY user is listed!
    const combinedUsers = authUsers.map((authUser) => {
      const profile = profilesMap.get(authUser.id);
      const isOwner = authUser.email === 'shababalordon2002@gmail.com';
      const role = isOwner
        ? 'admin'
        : profile?.role || authUser.user_metadata?.role || 'viewer';
      
      const fullName = profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario';

      return {
        id: authUser.id,
        email: authUser.email || '',
        full_name: fullName,
        role: role,
        created_at: profile?.created_at || authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at || null,
      };
    });

    // Include profiles not in authUsers
    const authUserIds = new Set(authUsers.map((u) => u.id));
    profilesList.forEach((p) => {
      if (!authUserIds.has(p.id)) {
        combinedUsers.push({
          id: p.id,
          email: p.email || '',
          full_name: p.full_name || '',
          role: (p.role as any) || 'user',
          created_at: p.created_at,
          last_sign_in_at: null,
        });
      }
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
    const assignedRole = role || 'viewer';

    // Create auth user
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || email.split('@')[0],
        role: assignedRole,
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
        role: assignedRole,
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
    const { userId, role, full_name, email } = body;

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Fetch existing auth user to get email and current user_metadata
    const { data: authUserData } = await adminSupabase.auth.admin.getUserById(userId);
    const authUser = authUserData?.user;

    const userEmail = email || authUser?.email || '';
    const userFullName = full_name !== undefined ? full_name : (authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || '');

    // 1. Update Auth user_metadata so login session / JWT reflects new role immediately
    if (role || full_name !== undefined) {
      const currentMeta = authUser?.user_metadata || {};
      const newMeta = { ...currentMeta };
      if (role) newMeta.role = role;
      if (full_name !== undefined) newMeta.full_name = full_name;

      const { error: authError } = await adminSupabase.auth.admin.updateUserById(userId, {
        user_metadata: newMeta,
      });

      if (authError) {
        console.warn('Warning updating Auth user_metadata:', authError.message);
      }
    }

    // 2. Update or insert profiles table
    const profilePayload: Record<string, any> = {
      id: userId,
      email: userEmail,
      full_name: userFullName,
      updated_at: new Date().toISOString(),
    };
    if (role) profilePayload.role = role;
    if (full_name !== undefined) profilePayload.full_name = full_name;

    let { data: profileData, error: profileError } = await adminSupabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    // Fallback: If DB table has check constraint rejecting 'viewer', fallback to 'user' in profiles table while user_metadata retains 'viewer'
    if (profileError && role === 'viewer' && profileError.message.includes('check constraint')) {
      console.warn('profiles_role_check constraint error on "viewer". Falling back to "user" role in DB table.');
      profilePayload.role = 'user';
      const fallbackResult = await adminSupabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      profileData = fallbackResult.data;
      profileError = fallbackResult.error;
    }

    if (profileError) {
      console.error('Error updating profile in DB:', profileError.message);
      return NextResponse.json({ error: `Error al actualizar perfil: ${profileError.message}` }, { status: 400 });
    }

    return NextResponse.json({ message: 'Rol actualizado exitosamente', profile: profileData });
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
    await adminSupabase.from('profiles').delete().eq('id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al eliminar usuario' }, { status: 500 });
  }
}
