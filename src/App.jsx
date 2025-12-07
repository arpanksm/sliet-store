import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  setDoc, 
  getDoc,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  User, 
  Phone, 
  Bell, 
  LogOut, 
  Tag, 
  DollarSign, 
  Eye, 
  EyeOff, 
  Image as ImageIcon,
  Loader,
  Mail,
  Lock,
  Menu,
  X,
  Camera,
  Heart,
  Trash2,
  CheckCircle,
  AlertCircle,
  Filter,
  Shield,
  Sparkles,
  Maximize2,
  ZoomIn,
  Ban,
  Check,
  XCircle
} from 'lucide-react';

// --- Firebase Configuration ---
// REPLACE THIS WITH YOUR REAL FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyBbWM8_NlDyBdFEaGPKpo_W3wsAILHwz5c",
  authDomain: "sliet-store.firebaseapp.com",
  projectId: "sliet-store",
  storageBucket: "sliet-store.firebasestorage.app",
  messagingSenderId: "15225748992",
  appId: "1:15225748992:web:d5967e6134580c2084a2e5"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// FIX: Sanitize appId to ensure no slashes exist in the document ID
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const appId = rawAppId.replace(/\//g, '_');

// --- Constants ---
const CATEGORIES = ['All', 'Cycles', 'Books', 'Electronics', 'Furniture', 'Lab Coats', 'Fashion', 'Others'];
// Replace this with your actual uploaded image URL or Base64
const LOGO_URL = "https://i.ibb.co/DHfcDg1B/slietstorelogo.png?text=SLIET+Store"; 

// --- Utilities ---
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
    };
  });
};

// --- AI Helper ---
const generateGeminiContent = async (prompt) => {
  const apiKey = "AIzaSyAw64QwMg3OLLGb-Se4SWtBSF5zuEYptuo"; // Leave empty, injected by environment
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

// --- Components ---

// 1. Navigation Bar (Updated with Badges)
const Navbar = ({ appUser, setView, onLogout, offerCount, wishlistCount }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isAdmin = appUser?.email === '2331003@sliet.ac.in';

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="flex items-center">
                <img 
                    src={LOGO_URL} 
                    alt="SLIET Store" 
                    className="h-10 object-contain"
                    onError={(e) => {
                        e.target.onerror = null; 
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />
                <div className="hidden flex-col ml-2">
                    <span className="text-xl font-bold tracking-tight text-[#003366] leading-none">
                        SLIET <span className="text-blue-600">Store</span>
                    </span>
                    <span className="text-[10px] font-semibold text-gray-500 tracking-wider">CAMPUS MARKETPLACE</span>
                </div>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            {appUser ? (
              <>
                {isAdmin && (
                  <button 
                    onClick={() => setView('admin')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-black transition border border-gray-700 shadow-sm"
                  >
                    <Shield size={14} /> Admin
                  </button>
                )}
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                  <User size={16} />
                  <span>{appUser.username}</span>
                </div>
                
                {/* Notification Bell with Badge */}
                <button 
                  onClick={() => setView('dashboard')}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition relative"
                  title="Notifications"
                >
                  <Bell size={20} />
                  {offerCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                      {offerCount > 9 ? '9+' : offerCount}
                    </span>
                  )}
                </button>

                {/* Wishlist Heart with Badge */}
                <button 
                  onClick={() => setView('wishlist')}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition relative"
                  title="My Wishlist"
                >
                  <Heart size={20} />
                  {wishlistCount > 0 && (
                    <span className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                      {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                  )}
                </button>

                <button 
                  onClick={onLogout}
                  className="px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  Logout
                </button>
                <button 
                  onClick={() => setView('sell')}
                  className="flex items-center gap-2 bg-[#003366] hover:bg-blue-900 text-white px-5 py-2.5 rounded-lg font-bold transition shadow-md shadow-blue-900/20"
                >
                  <Plus size={18} /> Sell
                </button>
              </>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={() => setView('login')}
                  className="text-gray-700 font-semibold hover:text-[#003366] px-3 py-2"
                >
                  Login
                </button>
                <button 
                  onClick={() => setView('signup')}
                  className="bg-[#003366] hover:bg-blue-900 text-white px-5 py-2.5 rounded-lg font-bold transition shadow-lg shadow-blue-900/30"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-700 p-2">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu Logic */}
      {isMenuOpen && (
         <div className="md:hidden bg-white border-t p-4 flex flex-col gap-3 shadow-lg">
             {appUser ? (
               <>
                 <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-[#003366] font-bold">
                      {appUser.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{appUser.name}</div>
                      <div className="text-xs text-gray-500">{appUser.email}</div>
                    </div>
                 </div>
                 {isAdmin && (
                    <button onClick={() => { setView('admin'); setIsMenuOpen(false); }} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg font-bold text-gray-800">
                        <span className="flex gap-2"><Shield size={20}/> Admin Portal</span>
                    </button>
                 )}
                 <button onClick={() => { setView('dashboard'); setIsMenuOpen(false); }} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg">
                    <span className="flex gap-2"><Bell size={20}/> Notifications</span>
                    {offerCount > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{offerCount}</span>}
                 </button>
                 <button onClick={() => { setView('wishlist'); setIsMenuOpen(false); }} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg">
                    <span className="flex gap-2"><Heart size={20}/> My Wishlist</span>
                    {wishlistCount > 0 && <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs">{wishlistCount}</span>}
                 </button>
                 <button onClick={() => { setView('sell'); setIsMenuOpen(false); }} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg text-[#003366] font-bold">
                    <span className="flex gap-2"><Plus size={20}/> Sell Item</span>
                 </button>
                 <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg text-red-600">
                    <span className="flex gap-2"><LogOut size={20}/> Logout</span>
                 </button>
               </>
             ) : (
               <>
                 <button onClick={() => { setView('login'); setIsMenuOpen(false); }} className="w-full py-3 font-semibold text-gray-700 border border-gray-300 rounded-lg">Login</button>
                 <button onClick={() => { setView('signup'); setIsMenuOpen(false); }} className="w-full py-3 font-bold text-white bg-[#003366] rounded-lg">Sign Up</button>
               </>
             )}
         </div>
      )}
    </nav>
  );
};

// 2. Auth Page (Login / Signup)
const AuthPage = ({ mode, setAppUser, setView }) => {
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsLogin(mode === 'login');
    setError('');
    setFormData({ name: '', username: '', email: '', phone: '', password: '' });
  }, [mode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // --- LOGIN FLOW (Real Firebase Auth) ---
        // 1. Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        // 2. Check Email Verification
        if (!user.emailVerified) {
          await signOut(auth); // Log them out immediately
          throw new Error("Your email is not verified yet. Please check your inbox.");
        }

        // 3. Get User Profile from Firestore
        const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          throw new Error("User profile not found.");
        }

        const userData = userDocSnap.data();
        
        if (userData.status === 'banned') {
          await signOut(auth);
          throw new Error("This account has been banned by the administrator.");
        }

        setAppUser(userData);
        setView('home');

      } else {
        // --- SIGNUP FLOW ---
        
        // 1. Validations
        if (!formData.email.endsWith('@sliet.ac.in')) {
          throw new Error("Only @sliet.ac.in email addresses are allowed.");
        }
        if (formData.password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        if (formData.phone.length < 10) {
          throw new Error("Please enter a valid phone number.");
        }

        // 2. Check Uniqueness in Firestore (Username & Phone)
        // Note: Firebase Auth handles Email uniqueness automatically
        const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
        const usernameCheck = query(usersRef, where('username', '==', formData.username));
        const phoneCheck = query(usersRef, where('phone', '==', formData.phone));

        const [usernameSnap, phoneSnap] = await Promise.all([
            getDocs(usernameCheck),
            getDocs(phoneCheck)
        ]);
        
        if (!usernameSnap.empty) throw new Error("Username already taken.");
        if (!phoneSnap.empty) throw new Error("Phone number already registered.");

        // 3. Create User in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        // 4. Send Verification Email
        await sendEmailVerification(user);

        // 5. Save Profile to Firestore (WITHOUT PASSWORD)
        const userData = {
          uid: user.uid,
          name: formData.name,
          username: formData.username,
          email: formData.email.toLowerCase(),
          phone: formData.phone,
          status: 'active', 
          joinedAt: serverTimestamp()
        };

        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), userData);

        // 6. Force Logout & Show Message
        await signOut(auth);
        
        alert(`Verification link sent to ${formData.email}. Please verify your email before logging in. If not found please check your spam section.`);
        setIsLogin(true); // Switch to login view
      }
    } catch (err) {
      console.error(err);
      let msg = err.message || "An error occurred.";
      if (msg.includes("auth/email-already-in-use")) msg = "Email is already registered.";
      if (msg.includes("auth/invalid-credential")) msg = "Invalid email or password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col md:flex-row max-w-4xl">
        <div className="hidden md:flex flex-col justify-center items-center bg-[#003366] w-1/2 p-12 text-white text-center">
          <ShoppingBag className="w-20 h-20 mb-6 text-blue-200" />
          <h2 className="text-3xl font-bold mb-4">SLIET Store</h2>
          <p className="text-blue-100 text-lg">
            The exclusive marketplace for the SLIET community. Buy, sell, and connect with peers securely.
          </p>
        </div>

        <div className="w-full md:w-1/2 p-8 md:p-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-sm text-gray-500 mt-2">
              {isLogin ? 'Enter your credentials to access your account' : 'Join the community to start selling'}
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input name="name" type="text" required className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] outline-none" placeholder="John Doe" value={formData.name} onChange={handleChange} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input name="username" type="text" required className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] outline-none" placeholder="johndoe123" value={formData.username} onChange={handleChange} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input name="phone" type="tel" required className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] outline-none" placeholder="9876543210" value={formData.phone} onChange={handleChange} />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input name="email" type="email" required className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] outline-none" placeholder={isLogin ? "your.email@sliet.ac.in" : "entry_number@sliet.ac.in"} value={formData.email} onChange={handleChange} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input name="password" type="password" required className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] outline-none" placeholder="••••••••" value={formData.password} onChange={handleChange} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-[#003366] hover:bg-blue-900 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/30 mt-6 flex justify-center items-center gap-2">
              {loading && <Loader className="animate-spin w-5 h-5" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button onClick={() => setIsLogin(!isLogin)} className="ml-2 text-[#003366] font-bold hover:underline">
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
const SellForm = ({ appUser, setView }) => {
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: 'Others',
    description: '',
    showPhone: false,
    image: null
  });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState({ desc: false, price: false });
  const fileInputRef = useRef(null);

  const handleImageChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const compressed = await compressImage(file);
      setFormData(prev => ({ ...prev, image: compressed }));
    }
  };

  const handleAiDescription = async () => {
    if (!formData.title) return alert("Please enter a title first!");
    setAiLoading(prev => ({ ...prev, desc: true }));
    const prompt = `Write a short, engaging classified ad description (under 40 words) for a used "${formData.title}" in the category "${formData.category}". It is being sold by a student at SLIET college. Focus on condition and utility. Do not include price.`;
    const result = await generateGeminiContent(prompt);
    if (result) {
      setFormData(prev => ({ ...prev, description: result.trim() }));
    } else {
      alert("AI could not generate a description right now.");
    }
    setAiLoading(prev => ({ ...prev, desc: false }));
  };

  const handleAiPrice = async () => {
    if (!formData.title) return alert("Please enter a title first!");
    setAiLoading(prev => ({ ...prev, price: true }));
    const prompt = `Suggest a fair price range in Indian Rupees (₹) for a used "${formData.title}" (${formData.category}) sold by a student on a campus. Return ONLY the number range (e.g. 500-1000). No words.`;
    const result = await generateGeminiContent(prompt);
    if (result) {
      alert(`✨ AI Suggested Price Range: ₹${result.trim()}`);
    } else {
      alert("AI could not estimate price right now.");
    }
    setAiLoading(prev => ({ ...prev, price: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), {
        title: formData.title,
        price: Number(formData.price),
        category: formData.category,
        description: formData.description,
        imageBase64: formData.image, 
        showPhone: formData.showPhone,
        sellerId: appUser.uid,
        sellerName: appUser.name,
        sellerUsername: appUser.username,
        sellerPhone: appUser.phone,
        createdAt: serverTimestamp(),
        status: 'active' 
      });
      setView('home');
    } catch (error) {
      console.error("Error listing item:", error);
      alert("Failed to list item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Sell an Item</h2>
          <button onClick={() => setView('home')} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Product Image</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer transition-colors ${formData.image ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
            >
              {formData.image ? (
                <img src={formData.image} alt="Preview" className="h-full w-full object-contain rounded-lg" />
              ) : (
                <>
                  <div className="bg-blue-100 p-4 rounded-full mb-3 text-blue-600">
                    <Camera size={32} />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Click to upload photo</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG (Max 5MB)</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Product Title</label>
              <input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Scientific Calculator" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                 <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                 <button 
                   type="button" 
                   onClick={handleAiPrice} 
                   disabled={aiLoading.price}
                   className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 hover:bg-purple-200 transition"
                 >
                   <Sparkles size={10} /> {aiLoading.price ? 'Analyzing...' : 'Suggest Price'}
                 </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">₹</span>
                <input type="number" required className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="500" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
             <label className="block text-sm font-medium text-gray-700">Category</label>
             <select 
               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
               value={formData.category}
               onChange={e => setFormData({...formData, category: e.target.value})}
             >
               {CATEGORIES.filter(c => c !== 'All').map(cat => (
                 <option key={cat} value={cat}>{cat}</option>
               ))}
             </select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
               <label className="block text-sm font-medium text-gray-700">Description</label>
               <button 
                 type="button" 
                 onClick={handleAiDescription} 
                 disabled={aiLoading.desc}
                 className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full font-bold flex items-center gap-1 hover:bg-purple-700 transition shadow-sm"
               >
                 {aiLoading.desc ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />} 
                 {aiLoading.desc ? 'Generating...' : 'Auto-Generate'}
               </button>
            </div>
            <textarea required rows="4" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Describe the condition, features, usage duration, etc." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-start gap-3">
              <input id="showPhone" type="checkbox" checked={formData.showPhone} onChange={e => setFormData({...formData, showPhone: e.target.checked})} className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <div className="text-sm">
                <label htmlFor="showPhone" className="font-medium text-gray-900">Allow buyers to see my phone number</label>
                <p className="text-gray-500 mt-1">If unchecked, your number will only be revealed if you accept to contact a buyer who made an offer.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button type="button" onClick={() => setView('home')} className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 flex justify-center items-center gap-2">
              {loading && <Loader className="animate-spin w-5 h-5" />}
              Post Ad
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const OfferModal = ({ appUser, product, onClose }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // VALIDATION: Offer must be at least 60% of listed price
    if (Number(amount) < product.price * 0.6) {
      alert(`Offer rejected. You cannot offer less than 60% of the listed price (₹${Math.floor(product.price * 0.6)})`);
      return;
    }
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'offers'), {
        productId: product.id,
        productTitle: product.title,
        sellerId: product.sellerId,
        buyerId: appUser.uid,
        buyerName: appUser.name,
        buyerPhone: appUser.phone, 
        offerAmount: Number(amount),
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      alert('Offer sent! The seller has been notified.');
      onClose();
    } catch (error) {
      console.error("Error sending offer:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Make an Offer</h3>
        <p className="text-sm text-gray-500 mb-4">
          Seller: {product.sellerName} <br/>
          Asking Price: <span className="font-semibold text-gray-800">₹{product.price}</span>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Price (₹)</label>
            <input type="number" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter amount" value={amount} onChange={e => setAmount(e.target.value)} />
            <p className="text-xs text-red-500 mt-1">Minimum offer accepted: ₹{Math.floor(product.price * 0.6)}</p>
          </div>
          <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-4">Your number <b>({appUser.phone})</b> will be shared with the seller.</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md disabled:opacity-50">Submit Offer</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProductDetailModal = ({ product, appUser, onClose, onMakeOffer }) => {
  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-64 md:h-80 bg-gray-100 flex items-center justify-center overflow-hidden group">
          {product.imageBase64 ? (
            <div className="w-full h-full overflow-hidden relative cursor-zoom-in">
               <img 
                 src={product.imageBase64} 
                 alt={product.title} 
                 className="w-full h-full object-contain transition-transform duration-300 hover:scale-150 origin-center" 
               />
               <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                 <ZoomIn size={12} /> Hover to Zoom
               </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-gray-300">
               <ImageIcon size={64} strokeWidth={1} />
               <span className="text-sm mt-2">No Image Available</span>
            </div>
          )}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex justify-between items-start mb-4">
             <div>
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold uppercase rounded mb-2">
                  {product.category || 'Item'}
                </span>
                <h2 className="text-3xl font-bold text-gray-900">{product.title}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <span>Posted {product.createdAt?.seconds ? new Date(product.createdAt.seconds * 1000).toLocaleDateString() : 'recently'}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><User size={12} /> {product.sellerName}</span>
                </div>
             </div>
             <div className="text-right">
                <div className="text-3xl font-extrabold text-[#003366]">₹{product.price}</div>
             </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{product.description}</p>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-auto">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                  {product.sellerName?.[0] || 'U'}
               </div>
               <div>
                 <div className="font-bold text-gray-900">Seller: {product.sellerUsername}</div>
                 {product.showPhone ? (
                   <div className="text-green-600 text-sm font-bold flex items-center gap-1">
                     <Phone size={14} /> {product.sellerPhone}
                   </div>
                 ) : (
                   <div className="text-gray-400 text-xs flex items-center gap-1">
                     <EyeOff size={12} /> Contact hidden
                   </div>
                 )}
               </div>
             </div>

             {appUser?.uid !== product.sellerId && product.status !== 'sold' && (
                <button 
                  onClick={() => onMakeOffer(product)}
                  className="bg-[#003366] hover:bg-blue-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition flex items-center gap-2"
                >
                   <DollarSign size={20} /> Make Offer
                </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
const AdminPanel = ({ setView }) => {
  const [activeTab, setActiveTab] = useState('users'); // users, listings
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Users
    const qUsers = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('joinedAt', 'desc'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Listings
    const qListings = query(collection(db, 'artifacts', appId, 'public', 'data', 'products'), orderBy('createdAt', 'desc'));
    const unsubListings = onSnapshot(qListings, (snapshot) => {
      setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubListings();
    };
  }, []);

  const handleBanUser = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
    const confirmMsg = newStatus === 'banned' ? "Are you sure you want to BAN this user?" : "Unban this user?";
    if (!window.confirm(confirmMsg)) return;

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId), {
      status: newStatus
    });
  };

  const handleDeleteListing = async (productId) => {
    if (!window.confirm("Admin: Permanently delete this listing?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', productId));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b bg-gray-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
             <Shield className="text-yellow-400" />
             <h2 className="text-2xl font-bold">Admin Portal</h2>
          </div>
          <button onClick={() => setView('home')} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm">
            Exit Panel
          </button>
        </div>
        
        {/* Admin Tabs */}
        <div className="flex border-b">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-bold text-sm transition ${activeTab === 'users' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500'}`}
          >
            Users ({users.length})
          </button>
          <button 
            onClick={() => setActiveTab('listings')}
            className={`px-6 py-3 font-bold text-sm transition ${activeTab === 'listings' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500'}`}
          >
            All Listings ({listings.length})
          </button>
        </div>

        <div className="p-6 overflow-x-auto">
          {activeTab === 'users' ? (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-bold uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.uid} className={`hover:bg-gray-50 transition ${user.status === 'banned' ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {user.name}
                      <div className="text-xs text-gray-400">@{user.username}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                         <span>{user.email}</span>
                         <span className="text-xs text-gray-400">{user.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.status === 'banned' ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold uppercase">Banned</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold uppercase">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.email !== 'admin@sliet.ac.in' && (
                        <button 
                          onClick={() => handleBanUser(user.id, user.status)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-xs transition ${user.status === 'banned' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
                        >
                          {user.status === 'banned' ? <><Check size={12}/> Unban</> : <><Ban size={12}/> Ban</>}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-bold uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Item</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Seller</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {listings.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {item.title}
                      <div className="text-xs text-gray-400">{item.category}</div>
                    </td>
                    <td className="px-6 py-4">₹{item.price}</td>
                    <td className="px-6 py-4">
                      {item.sellerName}
                      <div className="text-xs text-gray-400">{item.sellerPhone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleDeleteListing(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remove Listing"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// 5. Dashboard (Updated with Status Logic)
const Dashboard = ({ appUser, setView }) => {
  const [activeTab, setActiveTab] = useState('received');
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'offers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allOffers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (activeTab === 'received') {
        setOffers(allOffers.filter(o => o.sellerId === appUser.uid));
      } else {
        setOffers(allOffers.filter(o => o.buyerId === appUser.uid));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [appUser, activeTab]);

  const handleUpdateStatus = async (offerId, newStatus) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'offers', offerId), {
      status: newStatus
    });
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'accepted': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold uppercase flex items-center gap-1"><CheckCircle size={12}/> Offer Accepted! Call Seller</span>;
      case 'rejected': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold uppercase flex items-center gap-1"><XCircle size={12}/> Offer Declined</span>;
      case 'item_sold': return <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs font-bold uppercase flex items-center gap-1"><Ban size={12}/> Item Sold</span>;
      default: return <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-xs font-bold uppercase flex items-center gap-1"><Loader size={12} className="animate-spin"/> Pending Seller Response</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-800">Notifications Center</h2>
          <button onClick={() => setView('home')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900"><LogOut size={18} className="rotate-180" /> Back to Home</button>
        </div>
        <div className="flex border-b">
          <button onClick={() => setActiveTab('received')} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition ${activeTab === 'received' ? 'border-b-2 border-blue-600 text-[#003366] bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>Received Offers</button>
          <button onClick={() => setActiveTab('sent')} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition ${activeTab === 'sent' ? 'border-b-2 border-blue-600 text-[#003366] bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>My Bids</button>
        </div>
        <div className="flex-1 p-6 bg-gray-50/50 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-10"><Loader className="animate-spin text-blue-600" /></div>
          ) : offers.length === 0 ? (
            <div className="text-center py-20 opacity-50"><Tag size={48} className="mx-auto mb-4" /><p>No offers found.</p></div>
          ) : (
            <div className="space-y-4">
              {offers.map(offer => (
                <div key={offer.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{offer.productTitle}</h3>
                    <div className="text-sm text-gray-500 flex items-center gap-2 mt-1"><DollarSign size={14} /> Offered Amount: <span className="text-green-600 font-bold text-base">₹{offer.offerAmount}</span></div>
                    <div className="text-xs text-gray-400 mt-2">{offer.createdAt?.seconds ? new Date(offer.createdAt.seconds * 1000).toLocaleString() : 'Just now'}</div>
                  </div>
                  <div className="w-full md:w-auto bg-gray-50 p-4 rounded-lg border border-gray-100 min-w-[250px]">
                     {activeTab === 'received' ? (
                       // SELLER VIEW
                       <>
                         <div className="text-xs font-bold text-gray-400 uppercase mb-2">Buyer Contact</div>
                         <div className="flex items-center gap-2 font-semibold text-gray-800 mb-1"><User size={16} className="text-blue-500" /> {offer.buyerName}</div>
                         <div className="flex items-center gap-2 text-blue-600 mb-3"><Phone size={16} /> <a href={`tel:${offer.buyerPhone}`} className="hover:underline">{offer.buyerPhone}</a></div>
                         
                         {offer.status === 'pending' ? (
                           <div className="flex gap-2">
                              <button onClick={() => handleUpdateStatus(offer.id, 'accepted')} className="flex-1 bg-green-600 text-white text-xs font-bold py-2 rounded hover:bg-green-700 transition">Accept</button>
                              <button onClick={() => handleUpdateStatus(offer.id, 'rejected')} className="flex-1 bg-red-100 text-red-600 text-xs font-bold py-2 rounded hover:bg-red-200 transition">Decline</button>
                           </div>
                         ) : (
                           <div className="text-center pt-2 border-t border-gray-200">
                              {getStatusBadge(offer.status)}
                           </div>
                         )}
                       </>
                     ) : (
                       // BUYER VIEW
                       <div className="flex items-center justify-center h-full">
                         {getStatusBadge(offer.status)}
                       </div>
                     )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
const ProductCard = ({ product, appUser, onOpenDetail, onOpenOffer, setView, toggleFavorite, isFavorite, onDelete, onToggleSold }) => {
  const isOwner = appUser?.uid === product.sellerId;
  const isSold = product.status === 'sold';

  return (
    <div 
      onClick={() => onOpenDetail(product)}
      className={`bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col cursor-pointer ${isSold ? 'opacity-75 grayscale-[0.5]' : ''}`}
    >
      <div className="h-48 bg-gray-100 overflow-hidden relative">
        {product.imageBase64 ? (
          <img src={product.imageBase64} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
            <ImageIcon size={48} strokeWidth={1.5} />
            <span className="text-xs font-medium uppercase tracking-wider mt-2">No Image</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-2">
            {isSold && (
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">SOLD</span>
            )}
            <span className="bg-gray-900/50 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded uppercase">
                {product.category || 'Other'}
            </span>
        </div>
        
        {/* Wishlist Button */}
        {appUser && !isOwner && (
            <button 
                onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-red-500 transition shadow-sm z-10"
            >
                <Heart size={18} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? "text-red-500" : ""} />
            </button>
        )}
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-gray-900 line-clamp-1 text-lg">{product.title}</h3>
        </div>
        <p className="text-gray-500 text-sm line-clamp-2 mb-4 h-10">{product.description}</p>
        
        <div className="flex items-end justify-between mt-auto">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Price</p>
            <div className="font-extrabold text-xl text-[#003366]">₹{product.price}</div>
          </div>
          
          {isOwner ? (
             <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                 <button 
                    onClick={() => onToggleSold(product)}
                    className={`p-2 rounded-lg transition ${isSold ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600'}`}
                    title={isSold ? "Mark as Available" : "Mark as Sold"}
                 >
                    <CheckCircle size={18} />
                 </button>
                 <button 
                    onClick={() => { if(confirm('Delete this item?')) onDelete(product.id); }}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                    title="Delete Item"
                 >
                    <Trash2 size={18} />
                 </button>
             </div>
          ) : (
            !isSold && (
             <button 
               onClick={() => {
                 e.stopPropagation();
                 if (!appUser) setView('login');
                 else onOpenOffer(product);
               }}
               className="bg-[#003366] hover:bg-blue-900 text-white px-3 py-2 rounded-lg shadow-md transition text-sm font-bold flex items-center gap-1"
               title="Make Offer"
             >
               Make Offer
             </button>
            )
          )}
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <User size={12} /> {product.sellerUsername || product.sellerName}
          </div>
          {product.showPhone ? (
            <div className="flex items-center gap-1 text-green-600 font-medium">
              <Phone size={12} /> {product.sellerPhone}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-gray-400" title="Hidden">
              <EyeOff size={12} /> Number Hidden
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// 8. Main App Component
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null); 
  const [appUser, setAppUser] = useState(null);
  const [view, setView] = useState('home'); 
  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState([]); // Array of product IDs
  
  // Badge State
  const [offerCount, setOfferCount] = useState(0);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [selectedProductForOffer, setSelectedProductForOffer] = useState(null);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState(null);
  
  // 1. Initialize Firebase Auth
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => setFirebaseUser(u));
  }, []);

  // 1.5 Real-time User Status Check (For Bans)
  useEffect(() => {
    if (!appUser || !appUser.uid) return;
    
    // Listen to the specific user document for changes (like being banned)
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'users', appUser.uid), (docSnap) => {
        if (docSnap.exists()) {
            const freshData = docSnap.data();
            if (freshData.status === 'banned') {
                alert("Your account has been banned by the administrator.");
                setAppUser(null);
                setView('home');
            }
        }
    });
    return () => unsub();
  }, [appUser?.uid]);

  // 2. Load Products
  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'products'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [firebaseUser]);

  // 3. Load Favorites (If user logged in)
  useEffect(() => {
    if (!appUser) {
        setFavorites([]);
        return;
    }
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'favorites'), where('userId', '==', appUser.uid));
    return onSnapshot(q, (snapshot) => {
        setFavorites(snapshot.docs.map(doc => doc.data().productId));
    });
  }, [appUser]);

  // Actions
  const handleToggleFavorite = async (productId) => {
      if (!appUser) {
          alert("Please login to save items.");
          return;
      }
      const favRef = collection(db, 'artifacts', appId, 'public', 'data', 'favorites');
      const q = query(favRef, where('userId', '==', appUser.uid), where('productId', '==', productId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
          // Add
          await addDoc(favRef, { userId: appUser.uid, productId: productId });
      } else {
          // Remove
          snapshot.forEach(async (d) => await deleteDoc(d.ref));
      }
  };

  const handleDeleteProduct = async (productId) => {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', productId));
  };

  const handleToggleSold = async (product) => {
      const newStatus = product.status === 'sold' ? 'active' : 'sold';
      
      // Update Product Status
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id), {
          status: newStatus
      });

      // If marked as SOLD, automatically close/reject all pending offers for this item
      if (newStatus === 'sold') {
          const qPendingOffers = query(
             collection(db, 'artifacts', appId, 'public', 'data', 'offers'),
             where('productId', '==', product.id),
             where('status', '==', 'pending')
          );
          const snapPending = await getDocs(qPendingOffers);
          
          if (!snapPending.empty) {
             const batch = writeBatch(db);
             snapPending.forEach((d) => {
                 batch.update(d.ref, { status: 'item_sold' });
             });
             await batch.commit();
          }
      }
  };

  // Filter Logic
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              p.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesWishlist = view === 'wishlist' ? favorites.includes(p.id) : true;
        
        return matchesSearch && matchesCategory && matchesWishlist;
    });
  }, [products, searchTerm, selectedCategory, favorites, view]);

  const handleLogout = () => {
    setAppUser(null);
    setView('home');
    setSelectedCategory('All');
  };

  // Render Content
  const renderContent = () => {
    switch (view) {
      case 'login': return <AuthPage mode="login" setAppUser={setAppUser} setView={setView} />;
      case 'signup': return <AuthPage mode="signup" setAppUser={setAppUser} setView={setView} />;
      case 'sell': return <SellForm appUser={appUser} setView={setView} />;
      case 'dashboard': return <Dashboard appUser={appUser} setView={setView} />;
      case 'admin': return <AdminPanel setView={setView} />;
      case 'home':
      case 'wishlist':
      default:
        return (
          <>
            {/* Header Area */}
            <div className="bg-[#003366] pb-20 pt-8 px-4">
              <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-3xl font-bold text-white mb-6">
                    {view === 'wishlist' ? 'My Wishlist' : 'Find anything around campus'}
                </h1>
                
                {/* Search Bar */}
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-3.5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search for bicycles, books, coolers..." 
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl shadow-lg focus:ring-4 focus:ring-blue-500/30 outline-none text-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Categories Row */}
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar justify-start md:justify-center">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${selectedCategory === cat ? 'bg-white text-[#003366] shadow-md' : 'bg-blue-900/50 text-blue-100 hover:bg-blue-900'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className="max-w-6xl mx-auto px-4 -mt-12 pb-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProducts.map(product => (
                  <ProductCard 
                     key={product.id}
                     product={product}
                     appUser={appUser}
                     onOpenDetail={setSelectedProductForDetail}
                     onOpenOffer={setSelectedProductForOffer}
                     setView={setView}
                     toggleFavorite={handleToggleFavorite}
                     isFavorite={favorites.includes(product.id)}
                     onDelete={handleDeleteProduct}
                     onToggleSold={handleToggleSold}
                  />
                ))}

                {filteredProducts.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl shadow-sm border border-gray-100 mt-4">
                    {view === 'wishlist' ? (
                        <>
                         <Heart size={64} strokeWidth={1} className="mb-4 text-red-100 fill-red-50" />
                         <p className="text-lg font-medium text-gray-500">Your wishlist is empty</p>
                         <button onClick={() => setView('home')} className="mt-4 text-[#003366] hover:underline">Browse Items</button>
                        </>
                    ) : (
                        <>
                         <Search size={64} strokeWidth={1} className="mb-4" />
                         <p className="text-lg">No items found matching "{searchTerm}"</p>
                         {selectedCategory !== 'All' && <p className="text-sm mt-2">Try changing the category filter</p>}
                        </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Navbar 
        appUser={appUser} 
        setView={setView} 
        onLogout={handleLogout} 
        offerCount={offerCount}
        wishlistCount={favorites.length}
      />
      <main>
        {renderContent()}
      </main>
      
      {/* Product Detail Modal */}
      {selectedProductForDetail && (
        <ProductDetailModal 
          product={selectedProductForDetail}
          appUser={appUser}
          onClose={() => setSelectedProductForDetail(null)}
          onMakeOffer={(prod) => {
              if (!appUser) setView('login');
              else {
                  setSelectedProductForDetail(null);
                  setSelectedProductForOffer(prod);
              }
          }}
        />
      )}

      {/* Offer Modal */}
      {selectedProductForOffer && (
        <OfferModal 
          appUser={appUser} 
          product={selectedProductForOffer} 
          onClose={() => setSelectedProductForOffer(null)} 
        />
      )}
    </div>
  );
}