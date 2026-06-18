import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Phone, Mail, User } from 'lucide-react';

const InputField = ({ icon: Icon, type = 'text', placeholder, value, onChange, extra }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />}
      <input
        type={isPassword ? (show ? 'text' : 'password') : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        className="w-full bg-background border border-border text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary placeholder-gray-600"
        style={{ paddingLeft: Icon ? '2.5rem' : '1rem' }}
        {...extra}
      />
      {isPassword && (
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center mb-8">
          <img src="/logo.svg" alt="NourishMind" style={{ height: '40px' }} />
        </Link>
        <div className="bg-card border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm mb-6">Sign in to your account</p>
          {error && <p className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg mb-4">{error}</p>}
          <form onSubmit={handle} className="flex flex-col gap-3">
            <InputField icon={Mail} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <InputField icon={null} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit" disabled={loading}
              className="w-full bg-primary text-white font-bold py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 mt-1">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-gray-500 text-sm mt-4 text-center">
            New here? <Link to="/signup" className="text-primary hover:underline">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export const SignupPage = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handle = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setError(''); setLoading(true);
    try {
      await signup(form.name, form.email, form.password, form.phone);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Could not create account.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center mb-8">
          <img src="/logo.svg" alt="NourishMind" style={{ height: '40px' }} />
        </Link>
        <div className="bg-card border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Create Account</h1>
          <p className="text-gray-400 text-sm mb-6">Join NourishMind today</p>
          {error && <p className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg mb-4">{error}</p>}
          <form onSubmit={handle} className="flex flex-col gap-3">
            <InputField icon={User} placeholder="Full Name" value={form.name} onChange={set('name')} />
            <InputField icon={Mail} type="email" placeholder="Email" value={form.email} onChange={set('email')} />
            <InputField icon={Phone} type="tel" placeholder="Phone (e.g. +201012345678)" value={form.phone} onChange={set('phone')} />
            <InputField icon={null} type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={set('password')} />
            <InputField icon={null} type="password" placeholder="Confirm Password" value={form.confirm} onChange={set('confirm')} />
            <button type="submit" disabled={loading}
              className="w-full bg-primary text-white font-bold py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 mt-1">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
          <p className="text-gray-500 text-sm mt-4 text-center">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
