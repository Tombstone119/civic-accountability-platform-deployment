import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', height: '40px', padding: '0 12px',
    backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: '6px', fontSize: '14px', color: '#0f172a',
    outline: 'none', boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#f8fafc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative blobs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.15 }}>
        <div style={{
          position: 'absolute', top: '-10%', right: '-10%',
          width: '40%', height: '40%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30,58,138,0.3) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-5%', left: '-5%',
          width: '30%', height: '30%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(13,148,136,0.3) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
        {/* Card */}
        <div style={{
          backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
          borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden',
        }}>
          {/* Branding */}
          <div style={{
            padding: '40px 32px 24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          }}>
            <div style={{ marginBottom: '16px' }}>
              <ShieldCheck size={32} style={{ color: '#1e3a8a' }} />
            </div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1e3a8a', margin: '0 0 4px 0' }}>
              Civic Accountability Platform
            </h1>
            <p style={{ fontSize: '14px', color: '#475569', margin: 0 }}>
              Sign in to your account
            </p>
          </div>

          <div style={{ padding: '0 32px 40px' }}>
            <div style={{ height: '1px', backgroundColor: '#e2e8f0', marginBottom: '32px' }} />

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{
                  display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px',
                }}>Email Address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@civic.gov" required style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#1e3a8a'; e.target.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px',
                }}>Password</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••" required style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#1e3a8a'; e.target.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {error && (
                <p style={{ fontSize: '12px', color: '#dc2626', fontWeight: 500, textAlign: 'center', margin: 0 }}>
                  {error}
                </p>
              )}

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', height: '40px',
                  backgroundColor: '#1e3a8a', color: '#ffffff',
                  fontSize: '14px', fontWeight: 500, borderRadius: '6px', border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1,
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#3b5fc0'; }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#1e3a8a'; }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

        {/* Back to Public Portal */}
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            onClick={() => navigate('/portal')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '13px', color: '#0d9488', fontWeight: 500,
              padding: '6px 0',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#0f766e')}
            onMouseLeave={e => (e.currentTarget.style.color = '#0d9488')}
          >
            <ArrowLeft size={14} />
            Back to Public Portal
          </button>
        </div>

        {/* Footer */}
        <footer style={{ marginTop: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>
            © 2025 Civic Accountability Platform · Government of Sri Lanka
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            {['Privacy Policy', 'Accessibility', 'Terms of Service'].map(link => (
              <a key={link} href="#" style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1e3a8a')}
                onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                {link}
              </a>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
