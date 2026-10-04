import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';

const SKILL_OPTIONS = ['AWS', 'Terraform', 'Linux', 'Docker', 'JavaScript', 'Python', 'Kubernetes'];

export function LoginPage(): JSX.Element {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleSkill(skill: string): void {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  }

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login({ firstName, lastName, email, location: location || null, skills });
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create profile');
    } finally {
      setBusy(false);
    }
  }

  async function handleDemo(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      await demoLogin();
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Demo login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card card">
        <h1>NewStart</h1>
        <p className="muted">Organize your relocation and discover opportunities.</p>

        <button className="btn btn-primary btn-block" onClick={handleDemo} disabled={busy}>
          Continue with Demo Login
        </button>
        <div className="divider">or create your profile</div>

        {error && <div className="banner banner-error">{error}</div>}

        <form onSubmit={handleCreate} className="form">
          <div className="row">
            <label>
              First name
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </label>
            <label>
              Last name
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </label>
          </div>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. New Jersey"
            />
          </label>
          <div className="field">
            <span className="field-label">Skills</span>
            <div className="chips">
              {SKILL_OPTIONS.map((skill) => (
                <button
                  type="button"
                  key={skill}
                  className={skills.includes(skill) ? 'chip chip-on' : 'chip'}
                  onClick={() => toggleSkill(skill)}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            Create profile & continue
          </button>
        </form>
        <p className="dev-note">Development-only authentication — no password required.</p>
      </div>
    </div>
  );
}
