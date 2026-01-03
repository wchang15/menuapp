'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  findUsersByEmail,
  getCurrentUser,
  loginUser,
  registerUser,
  resetPassword,
} from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', name: '', email: '' });
  const [resetForm, setResetForm] = useState({ username: '', password: '', email: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fillDemo = () => {
    setMode('login');
    setForm({ username: 'demo', password: 'demo1234', name: '', email: '' });
    setMessage('테스트용 데모 계정 정보가 입력되었습니다. 바로 로그인해 보세요.');
  };

  useEffect(() => {
    (async () => {
      const current = await getCurrentUser();
      if (current) router.replace('/intro');
    })();
  }, [router]);

  const handleChange = (key, value, target = 'form') => {
    if (target === 'reset') {
      setResetForm((prev) => ({ ...prev, [key]: value }));
    } else {
      setForm((prev) => ({ ...prev, [key]: value }));
    }
  };

  const submitLogin = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await loginUser(form.username, form.password);
      setMessage('환영합니다! 준비된 인트로 영상과 메뉴 배경을 업로드해 주세요.');
      router.replace('/intro');
    } catch (e) {
      setError(e.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const submitSignup = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await registerUser(form);
      setMessage('회원가입 완료! 첫 로그인 후 준비된 인트로 영상과 배경을 업로드하세요.');
      router.replace('/intro');
    } catch (e) {
      setError(e.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const submitRecovery = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (resetForm.email) {
        const found = await findUsersByEmail(resetForm.email);
        if (found.length) {
          setMessage(`등록된 아이디: ${found.map((u) => u.username).join(', ')}`);
        } else {
          setMessage('입력하신 이메일로 찾은 계정이 없습니다.');
        }
      }

      if (resetForm.username && resetForm.password) {
        const updated = await resetPassword(resetForm.username, resetForm.password);
        setMessage(`${updated.username} 비밀번호가 새로 저장되었습니다.`);
      }

      if (!resetForm.email && !(resetForm.username && resetForm.password)) {
        setMessage('이메일이나 아이디/새 비밀번호를 입력해 주세요.');
      }
    } catch (e) {
      setError(e.message || '계정을 찾을 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const renderFields = () => {
    if (mode === 'signup') {
      return (
        <div style={styles.fieldGroup}>
          <label style={styles.label}>아이디</label>
          <input
            style={styles.input}
            value={form.username}
            onChange={(e) => handleChange('username', e.target.value)}
            placeholder="example"
          />
          <label style={styles.label}>비밀번호</label>
          <input
            style={styles.input}
            type="password"
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder="••••••"
          />
          <label style={styles.label}>이름/팀</label>
          <input
            style={styles.input}
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="우리 회사"
          />
          <label style={styles.label}>이메일(선택)</label>
          <input
            style={styles.input}
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="you@company.com"
          />
          <button style={styles.primaryBtn} onClick={submitSignup} disabled={loading}>
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </div>
      );
    }

    if (mode === 'recover') {
      return (
        <div style={styles.fieldGroup}>
          <label style={styles.label}>등록 이메일로 아이디 찾기</label>
          <input
            style={styles.input}
            type="email"
            value={resetForm.email}
            onChange={(e) => handleChange('email', e.target.value, 'reset')}
            placeholder="you@company.com"
          />
          <label style={{ ...styles.label, marginTop: 16 }}>아이디/비밀번호 재설정</label>
          <input
            style={styles.input}
            value={resetForm.username}
            onChange={(e) => handleChange('username', e.target.value, 'reset')}
            placeholder="아이디"
          />
          <input
            style={styles.input}
            type="password"
            value={resetForm.password}
            onChange={(e) => handleChange('password', e.target.value, 'reset')}
            placeholder="새 비밀번호"
          />
          <button style={styles.primaryBtn} onClick={submitRecovery} disabled={loading}>
            {loading ? '처리 중...' : '아이디/비밀번호 찾기'}
          </button>
        </div>
      );
    }

    return (
      <div style={styles.fieldGroup}>
        <label style={styles.label}>아이디</label>
        <input
          style={styles.input}
          value={form.username}
          onChange={(e) => handleChange('username', e.target.value)}
          placeholder="example"
        />
        <label style={styles.label}>비밀번호</label>
        <input
          style={styles.input}
          type="password"
          value={form.password}
          onChange={(e) => handleChange('password', e.target.value)}
          placeholder="••••••"
        />
        <button style={styles.primaryBtn} onClick={submitLogin} disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </div>
    );
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logo}>OUR LOGO</div>
        <div style={styles.title}>환영합니다</div>
        <div style={styles.subtitle}>
          인트로 영상과 메뉴 보드는 로그인한 계정의 설정으로 불러옵니다.
        </div>

        <div style={styles.demoBox}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>테스트용 데모 계정</div>
          <div style={{ fontSize: 13, color: '#b8c7d9' }}>아이디 demo / 비밀번호 demo1234</div>
          <button style={styles.secondaryBtn} onClick={fillDemo}>자동 입력</button>
        </div>

        {renderFields()}

        {error ? <div style={styles.error}>{error}</div> : null}
        {message ? <div style={styles.message}>{message}</div> : null}

        <div style={styles.footerLinks}>
          <button
            style={mode === 'login' ? styles.linkActive : styles.linkBtn}
            onClick={() => setMode('login')}
          >
            로그인
          </button>
          <button
            style={mode === 'signup' ? styles.linkActive : styles.linkBtn}
            onClick={() => setMode('signup')}
          >
            회원가입
          </button>
          <button
            style={mode === 'recover' ? styles.linkActive : styles.linkBtn}
            onClick={() => setMode('recover')}
          >
            아이디/비밀번호 찾기
          </button>
        </div>
        <div style={styles.tip}>
          처음 로그인 시 준비된 인트로 영상과 메뉴 배경 이미지를 업로드하라는 안내가 표시됩니다.
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: '100vw',
    height: '100vh',
    background: 'rgba(6,9,16,0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    color: '#e6edf3',
    overflow: 'hidden',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 28,
    boxShadow: '0 15px 40px rgba(0,0,0,0.35)',
    backdropFilter: 'blur(4px)',
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 20,
    background: 'linear-gradient(135deg, #00c6ff, #0072ff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    letterSpacing: 1.2,
    margin: '0 auto 12px',
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 800,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: '#9fb3c8',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 1.5,
  },
  fieldGroup: {
    display: 'grid',
    gap: 8,
    marginTop: 12,
  },
  label: {
    fontSize: 13,
    color: '#8da0b5',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.3)',
    color: '#e6edf3',
    outline: 'none',
    fontSize: 14,
  },
  primaryBtn: {
    marginTop: 6,
    padding: '12px 14px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #00e0ff, #0072ff)',
    color: '#0b0f1a',
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondaryBtn: {
    marginTop: 8,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e6edf3',
    fontWeight: 800,
    cursor: 'pointer',
    width: '100%',
  },
  linkBtn: {
    background: 'transparent',
    border: 'none',
    color: '#8da0b5',
    cursor: 'pointer',
    fontWeight: 700,
  },
  linkActive: {
    background: 'transparent',
    border: 'none',
    color: '#00e0ff',
    cursor: 'pointer',
    fontWeight: 900,
  },
  footerLinks: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  error: {
    marginTop: 10,
    color: '#ff8a8a',
    fontWeight: 700,
  },
  message: {
    marginTop: 10,
    color: '#6ae3ff',
    fontWeight: 700,
  },
  tip: {
    marginTop: 12,
    fontSize: 12,
    color: '#9fb3c8',
    lineHeight: 1.4,
  },
  demoBox: {
    display: 'grid',
    gap: 6,
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
  },
};
