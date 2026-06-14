import { authApi } from '../api/auth';
import { toast } from '../utils/ui';

export function renderAuth(container: HTMLElement) {
  container.innerHTML = `
    <div id="config-screen">
      <div class="config-badge">Supabase Authentication</div>
      <h2>Welcome Back</h2>
      <p>Sign in to manage your hackathons or create a new account.</p>
      <div class="field"><label>Email</label><input id="auth-email" type="email" placeholder="email@example.com"></div>
      <div class="field"><label>Password</label><input id="auth-password" type="password" placeholder="••••••••"></div>
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-primary" id="btn-signin" style="flex:1;">Sign In</button>
        <button class="btn" id="btn-signup" style="flex:1;">Sign Up</button>
      </div>
    </div>
  `;

  const emailInput = document.getElementById('auth-email') as HTMLInputElement;
  const passwordInput = document.getElementById('auth-password') as HTMLInputElement;

  document.getElementById('btn-signin')?.addEventListener('click', async () => {
    try {
      await authApi.signIn(emailInput.value, passwordInput.value);
      toast('Signed in successfully!');
    } catch (e: any) {
      toast('Sign in failed: ' + e.message);
    }
  });

  document.getElementById('btn-signup')?.addEventListener('click', async () => {
    try {
      await authApi.signUp(emailInput.value, passwordInput.value);
      toast('Sign up successful! Please check your email.');
    } catch (e: any) {
      toast('Sign up failed: ' + e.message);
    }
  });
}
