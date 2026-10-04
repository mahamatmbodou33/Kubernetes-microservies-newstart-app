import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usersApi } from '../api/users';
import { ApiError } from '../api/client';

const SKILL_OPTIONS = ['AWS', 'Terraform', 'Linux', 'Docker', 'JavaScript', 'Python', 'Kubernetes'];
const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE', 'ANY'];

export function ProfilePage(): JSX.Element {
  const { user, setUser } = useAuth();
  const [firstName, setFirstName] = useState(user!.firstName);
  const [lastName, setLastName] = useState(user!.lastName);
  const [email, setEmail] = useState(user!.email);
  const [location, setLocation] = useState(user!.location ?? '');
  const [skills, setSkills] = useState<string[]>(user!.skills);
  const [preferredJobType, setPreferredJobType] = useState(user!.preferredJobType ?? '');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [customSkill, setCustomSkill] = useState('');

  function toggleSkill(skill: string): void {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  }

  function addCustomSkill(): void {
    const value = customSkill.trim();
    if (value && !skills.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setSkills((prev) => [...prev, value]);
    }
    setCustomSkill('');
  }

  async function handleSave(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const updated = await usersApi.update(user!.id, {
        firstName,
        lastName,
        email,
        location: location || null,
        skills,
        preferredJobType: preferredJobType || null,
      });
      setUser(updated);
      setMessage({ kind: 'ok', text: 'Profile saved.' });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof ApiError ? err.message : 'Save failed' });
    } finally {
      setBusy(false);
    }
  }

  const allSkillOptions = Array.from(new Set([...SKILL_OPTIONS, ...skills]));

  return (
    <div className="page narrow">
      <h1>Profile</h1>
      {message && (
        <div className={message.kind === 'ok' ? 'banner banner-ok' : 'banner banner-error'}>
          {message.text}
        </div>
      )}
      <form onSubmit={handleSave} className="form card">
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
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label>
          Preferred job type
          <select value={preferredJobType} onChange={(e) => setPreferredJobType(e.target.value)}>
            <option value="">— none —</option>
            {JOB_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span className="field-label">Skills</span>
          <div className="chips">
            {allSkillOptions.map((skill) => (
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
          <div className="row">
            <input
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              placeholder="Add a custom skill"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomSkill();
                }
              }}
            />
            <button type="button" className="btn btn-ghost" onClick={addCustomSkill}>
              Add
            </button>
          </div>
        </div>
        <button className="btn btn-primary" disabled={busy}>
          Save changes
        </button>
      </form>
    </div>
  );
}
