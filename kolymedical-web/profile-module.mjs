// profile-module.mjs
import { escapeHtml, validatePasswordStrength } from './security-utils.mjs?v=20261124g';

const PROFILE_KEY = 'koly_user_profile_v1';
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=Koly+User&background=00d2c4&color=0b111e';

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'koly-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 220); }, 3200);
}

function safeAvatarUrl(rawUrl) {
  const val = String(rawUrl || '').trim();
  if (!val) return DEFAULT_AVATAR;
  try {
    const parsed = new URL(val);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch (_) {}
  return DEFAULT_AVATAR;
}

export async function initProfileModule(containerId = 'view-profile', supabaseClient = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') || {};
  } catch (_) {
    saved = {};
  }

  if (supabaseClient?.auth) {
    try {
      const { data } = await supabaseClient.auth.getUser();
      if (data?.user) {
        saved = {
          ...saved,
          email: data.user.email || saved.email || '',
          ...(data.user.user_metadata || {})
        };
      }
    } catch (err) {
      console.warn('[KolyTech] Local fallback for profile:', err);
    }
  }

  const safeAvatar = safeAvatarUrl(saved.avatar_url);

  container.innerHTML = `
    <div style="display:grid; gap:20px; max-width:740px; color:#f8fafc;">
      <h2 style="margin:0; font-size:1.35rem;">Configuración de Cuenta</h2>

      <form id="profile-info-form" style="background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px; display:grid; gap:14px;">
        <div style="display:flex; align-items:center; gap:14px;">
          <img id="profile-avatar-preview" src="${escapeHtml(safeAvatar)}" alt="Avatar"
            style="width:56px; height:56px; border-radius:50%; object-fit:cover; border:2px solid #00d2c4;">
          <div style="font-size:0.85rem; color:#94a3b8;">Perfil profesional sincronizado con KolyTech</div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px;">
          <label style="font-size:0.8rem; color:#94a3b8;">Nombre Completo
            <input name="full_name" maxlength="120" value="${escapeHtml(saved.full_name || '')}" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.8rem; color:#94a3b8;">Correo electrónico de acceso
            <input name="email" type="email" maxlength="254" value="${escapeHtml(saved.email || '')}" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.8rem; color:#94a3b8;">Teléfono móvil
            <input name="phone" maxlength="20" value="${escapeHtml(saved.phone || '')}" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.8rem; color:#94a3b8;">Cargo / Especialidad médica
            <input name="specialty" maxlength="120" value="${escapeHtml(saved.specialty || '')}" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.8rem; color:#94a3b8;">Sede médica asignada
            <input name="branch" maxlength="120" value="${escapeHtml(saved.branch || 'Sede Principal - Lima')}" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
          <label style="font-size:0.8rem; color:#94a3b8;">URL de Avatar
            <input name="avatar_url" type="url" maxlength="500" value="${escapeHtml(saved.avatar_url || '')}" placeholder="https://..." style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
          </label>
        </div>
        <button type="submit" style="justify-self:start; padding:10px 18px; border-radius:8px; border:none; background:#00d2c4; color:#0b111e; font-weight:700; cursor:pointer;">
          Actualizar Información Personal
        </button>
      </form>

      <form id="profile-pass-form" style="background:#11192c; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px; display:grid; gap:12px;">
        <h4 style="margin:0; color:#cbd5e1;">Seguridad de la Cuenta</h4>
        <input name="new_password" type="password" minlength="8" maxlength="128" required placeholder="Nueva contraseña (mín. 8 caracteres, mayúscula, minúscula, número y símbolo)"
          style="padding:10px; border-radius:8px; background:#0b111e; color:#fff; border:1px solid rgba(255,255,255,0.12);">
        <button type="submit" style="justify-self:start; padding:10px 18px; border-radius:8px; border:none; background:#10b981; color:#0b111e; font-weight:700; cursor:pointer;">
          Cambiar Contraseña
        </button>
      </form>
    </div>
  `;

  container.querySelector('#profile-info-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const validatedAvatar = safeAvatarUrl(data.avatar_url);
    if (data.avatar_url && validatedAvatar === DEFAULT_AVATAR && data.avatar_url.trim() !== DEFAULT_AVATAR) {
      return showToast('La URL de avatar debe comenzar con https:// o http://');
    }

    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
    container.querySelector('#profile-avatar-preview').src = validatedAvatar;

    if (supabaseClient?.auth) {
      try {
        const { error } = await supabaseClient.auth.updateUser({
          email: data.email || undefined,
          data
        });
        if (error) return showToast(`Error al actualizar en Supabase: ${error.message}`);
      } catch (err) {
        return showToast(`Error al actualizar perfil: ${err.message}`);
      }
    }
    showToast('Información personal actualizada.');
  });

  container.querySelector('#profile-pass-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = String(new FormData(e.target).get('new_password') || '');
    const check = validatePasswordStrength(password);
    if (!check.valid) {
      return showToast(check.message);
    }

    if (supabaseClient?.auth) {
      try {
        const { error } = await supabaseClient.auth.updateUser({ password });
        if (error) return showToast(`Error: ${error.message}`);
      } catch (err) {
        return showToast(`Error: ${err.message}`);
      }
    }
    e.target.reset();
    showToast('Contraseña actualizada correctamente.');
  });
}
