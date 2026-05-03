// import React, { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';

// const ROLE_OPTIONS = [
//   {
//     value: 'Player',
//     label: 'Individual Player',
//     description: 'Join games, book solo, build your stats',
//     icon: '⚽',
//     gradient: 'from-white/15 to-white/5',
//     border: 'border-white/25',
//     ring: 'ring-white/30',
//   },
//   {
//     value: 'Captain',
//     label: 'Team Captain',
//     description: 'Manage squads, book for teams, rent gear',
//     icon: '🛡️',
//     gradient: 'from-white/15 to-white/5',
//     border: 'border-white/25',
//     ring: 'ring-white/30',
//   },
//   {
//     value: 'Owner',
//     label: 'Venue Owner',
//     description: 'List turfs, set pricing, manage bookings',
//     icon: '🏢',
//     gradient: 'from-white/15 to-white/5',
//     border: 'border-white/25',
//     ring: 'ring-white/30',
//   },
// ];

// const Signup = () => {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     name: '',
//     email: '',
//     phone: '',
//     password: '',
//     confirmPassword: '',
//     role: 'Player',
//   });
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [step, setStep] = useState(1); // 1 = role selection, 2 = form

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//     setError('');
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (formData.password !== formData.confirmPassword) {
//       setError('Passwords do not match');
//       return;
//     }
//     if (formData.password.length < 6) {
//       setError('Password must be at least 6 characters');
//       return;
//     }

//     setIsLoading(true);
//     setError('');

//     try {
//       const response = await fetch('http://localhost:8080/api/register', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           name: formData.name,
//           email: formData.email,
//           phone: formData.phone,
//           role: formData.role,
//           password: formData.password,
//         }),
//       });

//       const data = await response.json();

//       if (response.ok) {
//         navigate('/login');
//       } else {
//         setError(data.error || 'Registration failed. Please try again.');
//       }
//     } catch (err) {
//       console.error('Connection failed:', err);
//       setError('Unable to connect to server. Is the backend running?');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Password strength calculation
//   const getPasswordStrength = () => {
//     const pw = formData.password;
//     if (!pw) return { width: '0%', color: 'bg-slate-700', label: '' };
//     let score = 0;
//     if (pw.length >= 6) score++;
//     if (pw.length >= 10) score++;
//     if (/[A-Z]/.test(pw)) score++;
//     if (/[0-9]/.test(pw)) score++;
//     if (/[^A-Za-z0-9]/.test(pw)) score++;

//     const levels = [
//       { width: '20%', color: 'bg-zinc-600', label: 'Weak' },
//       { width: '40%', color: 'bg-zinc-500', label: 'Fair' },
//       { width: '60%', color: 'bg-zinc-400', label: 'Good' },
//       { width: '80%', color: 'bg-zinc-300', label: 'Strong' },
//       { width: '100%', color: 'bg-white', label: 'Excellent' },
//     ];
//     return levels[Math.min(score, 4)];
//   };

//   const strength = getPasswordStrength();
//   const selectedRole = ROLE_OPTIONS.find(r => r.value === formData.role);

//   return (
//     <div className="min-h-screen flex">
//       {/* ── Left Side: Hero / Branding ── */}
//       <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
//         <div className="absolute inset-0 bg-gradient-to-br from-arena-950 via-arena-900 to-zinc-950 z-10" />
//         <div className="absolute inset-0 z-[11] sports-field-overlay" aria-hidden />
//         <div className="absolute left-0 right-0 top-[44%] h-0.5 z-[12] sports-midline" aria-hidden />

//         {/* Decorative blurs */}
//         <div className="absolute inset-0 z-20 opacity-10">
//           <div className="absolute top-32 left-16 w-80 h-80 bg-white/20 rounded-full filter blur-[120px]" />
//           <div className="absolute bottom-16 right-16 w-72 h-72 bg-white/15 rounded-full filter blur-[120px]" />
//           <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-zinc-500/25 rounded-full filter blur-[100px]" />
//         </div>

//         <div className="relative z-30 flex flex-col justify-center px-16 w-full">
//           {/* Logo */}
//           <div className="flex items-center gap-3 mb-12">
//             <span className="relative">
//               <span className="absolute -inset-1 rounded-md bg-gradient-to-r from-white/35 to-zinc-400/35 opacity-45 blur-md" aria-hidden />
//               <span className="relative flex w-12 h-12 items-center justify-center rounded-md border-2 border-white/70 bg-[#0a0a0a] font-display text-2xl text-white">
//                 A
//               </span>
//             </span>
//             <span className="font-display text-3xl text-white tracking-[0.14em]">
//               ARENA<span className="text-zinc-300">HUB</span>
//             </span>
//           </div>

//           <p className="sports-kicker mb-2 text-white/80">Draft your squad</p>

//           <h1 className="text-6xl md:text-7xl font-display text-white leading-[0.95] mb-6 uppercase">
//             Your arena
//             <br />
//             <span className="bg-gradient-to-r from-zinc-200 via-white to-zinc-300 bg-clip-text text-transparent">
//               awaits
//             </span>
//           </h1>

//           <p className="text-lg text-slate-400 max-w-md leading-relaxed mb-12">
//             Join thousands of players, captains, and venue owners 
//             on the platform that's redefining sports booking.
//           </p>

//           {/* Feature list */}
//           <div className="space-y-4">
//             {[
//               { icon: '⚡', text: 'Instant booking with real-time availability' },
//               { icon: '💳', text: 'Digital wallet — cashless, seamless payments' },
//               { icon: '🏆', text: 'Join public games or host your own' },
//             ].map((feature) => (
//               <div key={feature.text} className="flex items-center gap-3">
//                 <span className="text-lg">{feature.icon}</span>
//                 <span className="text-slate-400 text-sm">{feature.text}</span>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* ── Right Side: Signup Form ── */}
//       <div className="flex-1 flex items-center justify-center px-6 py-12 bg-arena-950 relative overflow-y-auto">
//         <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full filter blur-[120px]" />

//         <div className="w-full max-w-md relative z-10">
//           {/* Mobile logo */}
//           <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
//             <span className="flex w-10 h-10 items-center justify-center rounded-md border-2 border-white/70 bg-[#0a0a0a] font-display text-xl text-white">
//               A
//             </span>
//             <span className="font-display text-2xl text-white tracking-[0.12em]">
//               ARENA<span className="text-zinc-300">HUB</span>
//             </span>
//           </div>

//           {/* Header */}
//           <div className="mb-8">
//             <p className="sports-kicker mb-2">Rookie combine</p>
//             <h2 className="font-display text-4xl text-white mb-2 uppercase tracking-wide">
//               {step === 1 ? 'Pick your position' : 'Suit up'}
//             </h2>
//             <p className="text-slate-400 text-sm">
//               {step === 1 ? 'Player, captain, or owner — choose how you run the floor.' : `Signing up as ${selectedRole?.label}`}
//             </p>
//           </div>

//           {/* Error */}
//           {error && (
//             <div className="mb-6 p-4 rounded-xl bg-white/10 border border-white/20 text-zinc-200 text-sm flex items-center gap-3 animate-fade-in-up">
//               <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//               {error}
//             </div>
//           )}

//           {/* ── STEP 1: Role Selection ── */}
//           {step === 1 && (
//             <div className="space-y-3 animate-fade-in-up">
//               {ROLE_OPTIONS.map((role) => (
//                 <button
//                   key={role.value}
//                   type="button"
//                   onClick={() => { setFormData({ ...formData, role: role.value }); setStep(2); }}
//                   className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left group hover:scale-[1.02]
//                     ${formData.role === role.value
//                       ? `bg-gradient-to-r ${role.gradient} ${role.border} ring-2 ${role.ring}`
//                       : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
//                     }`}
//                   id={`signup-role-${role.value.toLowerCase()}`}
//                 >
//                   <span className="text-3xl">{role.icon}</span>
//                   <div>
//                     <p className="text-white font-semibold text-sm">{role.label}</p>
//                     <p className="text-slate-400 text-xs mt-0.5">{role.description}</p>
//                   </div>
//                   <svg className="w-5 h-5 text-slate-600 ml-auto group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                   </svg>
//                 </button>
//               ))}

//               {/* Already have account */}
//               <div className="mt-8 pt-6 border-t border-white/10 text-center">
//                 <p className="text-sm text-slate-500">
//                   Already have an account?{' '}
//                   <Link to="/login" className="text-zinc-300 hover:text-white font-semibold transition-colors">
//                     Sign In
//                   </Link>
//                 </p>
//               </div>
//             </div>
//           )}

//           {/* ── STEP 2: Registration Form ── */}
//           {step === 2 && (
//             <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up">
//               {/* Back Button + Role Badge */}
//               <div className="flex items-center gap-3 mb-2">
//                 <button
//                   type="button"
//                   onClick={() => setStep(1)}
//                   className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
//                 >
//                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
//                   </svg>
//                 </button>
//                 <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-gradient-to-r ${selectedRole?.gradient} ${selectedRole?.border}`}>
//                   <span>{selectedRole?.icon}</span>
//                   {selectedRole?.label}
//                 </span>
//               </div>

//               {/* Full Name */}
//               <div>
//                 <label htmlFor="signup-name" className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
//                 <input
//                   id="signup-name"
//                   type="text"
//                   name="name"
//                   placeholder="John Doe"
//                   required
//                   value={formData.name}
//                   onChange={handleChange}
//                   className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all text-sm"
//                 />
//               </div>

//               {/* Email */}
//               <div>
//                 <label htmlFor="signup-email" className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
//                 <input
//                   id="signup-email"
//                   type="email"
//                   name="email"
//                   placeholder="you@example.com"
//                   required
//                   value={formData.email}
//                   onChange={handleChange}
//                   className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all text-sm"
//                 />
//               </div>

//               {/* Phone */}
//               <div>
//                 <label htmlFor="signup-phone" className="block text-sm font-medium text-slate-300 mb-1.5">Phone Number</label>
//                 <input
//                   id="signup-phone"
//                   type="tel"
//                   name="phone"
//                   placeholder="+92 300 1234567"
//                   required
//                   value={formData.phone}
//                   onChange={handleChange}
//                   className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all text-sm"
//                 />
//               </div>

//               {/* Password */}
//               <div>
//                 <label htmlFor="signup-password" className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
//                 <input
//                   id="signup-password"
//                   type="password"
//                   name="password"
//                   placeholder="Min. 6 characters"
//                   required
//                   value={formData.password}
//                   onChange={handleChange}
//                   className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all text-sm"
//                 />
//                 {/* Strength Bar */}
//                 {formData.password && (
//                   <div className="mt-2 flex items-center gap-2">
//                     <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
//                       <div
//                         className={`h-full rounded-full transition-all duration-500 ${strength.color}`}
//                         style={{ width: strength.width }}
//                       />
//                     </div>
//                     <span className="text-xs text-slate-500 w-16 text-right">{strength.label}</span>
//                   </div>
//                 )}
//               </div>

//               {/* Confirm Password */}
//               <div>
//                 <label htmlFor="signup-confirm" className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
//                 <input
//                   id="signup-confirm"
//                   type="password"
//                   name="confirmPassword"
//                   placeholder="Re-enter password"
//                   required
//                   value={formData.confirmPassword}
//                   onChange={handleChange}
//                   className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all text-sm ${
//                     formData.confirmPassword && formData.confirmPassword !== formData.password
//                       ? 'border-white/40'
//                       : formData.confirmPassword && formData.confirmPassword === formData.password
//                         ? 'border-white/60'
//                         : 'border-white/10'
//                   }`}
//                 />
//                 {formData.confirmPassword && formData.confirmPassword !== formData.password && (
//                   <p className="text-xs text-zinc-400 mt-1">Passwords don't match</p>
//                 )}
//               </div>

//               {/* Submit */}
//               <button
//                 type="submit"
//                 disabled={isLoading || (formData.confirmPassword && formData.confirmPassword !== formData.password)}
//                 id="signup-submit-button"
//                 className="w-full py-3.5 rounded-md bg-white text-black font-bold text-sm uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-[0_0_28px_-6px_rgba(255,255,255,0.2)] border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
//               >
//                 {isLoading ? (
//                   <>
//                     <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
//                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
//                     </svg>
//                     Creating Account...
//                   </>
//                 ) : (
//                   'Create Account'
//                 )}
//               </button>

//               {/* Sign in link */}
//               <p className="text-center text-sm text-slate-500 mt-4">
//                 Already have an account?{' '}
//                 <Link to="/login" className="text-zinc-300 hover:text-white font-semibold transition-colors">
//                   Sign In
//                 </Link>
//               </p>
//             </form>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Signup;


import { AuthPage } from './Login.jsx';

export default function Signup() {
  return <AuthPage defaultMode="signup" />;
}