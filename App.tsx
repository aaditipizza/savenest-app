
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Category, UserState, Goal, Transaction } from './types';
import PiggyBank from './components/PiggyBank';
import { getSmartSuggestions } from './services/gemini';
import { insertSavingsData, supabase } from './services/supabaseService';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'goals' | 'insights' | 'profile'>('home');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [selectedTierIdx, setSelectedTierIdx] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('savenest_user_data'));
  const [nameInput, setNameInput] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const [user, setUser] = useState<UserState>(() => {
    const saved = localStorage.getItem('savenest_user_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
    return {
      name: 'User',
      totalSavings: 0,
      streak: 0,
      theme: 'royal',
      history: [],
      goals: [],
      profilePic: 'https://picsum.photos/seed/vault/400',
      currency: '₹',
      notificationsEnabled: true
    };
  });

  useEffect(() => {
    localStorage.setItem('savenest_user_data', JSON.stringify(user));
  }, [user]);

  // Transaction Form State
  const [amountInput, setAmountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<Category>(Category.COFFEE);
  const [paymentStep, setPaymentStep] = useState<'details' | 'upi'>('details');
  const [showCopied, setShowCopied] = useState(false);

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUser(prev => ({ ...prev, profilePic: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Goal Form State
  const [goalTitleInput, setGoalTitleInput] = useState('');
  const [goalTargetInput, setGoalTargetInput] = useState('');
  const [goalIconInput, setGoalIconInput] = useState('star');

  const availableIcons = ['flight', 'smartphone', 'home', 'directions_car', 'savings', 'laptop', 'celebration', 'shopping_bag'];

  useEffect(() => {
    const fetchTips = async () => {
      const tips = await getSmartSuggestions(user.totalSavings, user.goals.map(g => g.title));
      setSuggestions(tips);
    };
    fetchTips();
  }, [user.totalSavings]);

  useEffect(() => {
    const saveData = async () => {
      const { data: existing } = await supabase
        .from("Savings")
        .select("*");

      if (existing && existing.length === 0) {
        await supabase.from("Savings").insert([
          {
            savings_amount: 0,
            goal_amount: 1000,
          },
        ]);
      }
    };

    saveData();
  }, []);

  const handleAddMoney = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);
    
    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt <= 0) {
      setFormError("Please enter an amount greater than zero.");
      return;
    }

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      amount: amt,
      category: categoryInput,
      note: noteInput.trim() || 'Manual Deposit',
      date: new Date().toISOString()
    };

    setUser(prev => ({
      ...prev,
      totalSavings: prev.totalSavings + amt,
      history: [newTransaction, ...prev.history],
      goals: prev.goals.map((g) => {
        if (g.currentAmount < g.targetAmount) {
          return { ...g, currentAmount: g.currentAmount + amt };
        }
        return g;
      })
    }));

    // Connect to Supabase
    const firstGoal = user.goals[0];
    insertSavingsData({
      savings_amount: amt,
      goal_amount: firstGoal ? firstGoal.targetAmount : 5000
    }).catch(err => {
      console.error("Failed to sync with Supabase:", err);
    });

    // Reset and Close
    setAmountInput('');
    setNoteInput('');
    setShowAddModal(false);
    
    // Feedback
    setShowSuccess(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#C5A028', '#D4AF37', '#F3E5AB']
    });
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleAddGoal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);

    const target = parseFloat(goalTargetInput);
    if (!goalTitleInput.trim()) {
      setFormError("Please enter a title for your goal.");
      return;
    }
    if (isNaN(target) || target <= 0) {
      setFormError("Please enter a valid target amount.");
      return;
    }

    const newGoal: Goal = {
      id: Date.now().toString(),
      title: goalTitleInput.trim(),
      targetAmount: target,
      currentAmount: 0,
      icon: goalIconInput
    };

    setUser(prev => ({
      ...prev,
      goals: [...prev.goals, newGoal]
    }));

    // Reset and Close
    setGoalTitleInput('');
    setGoalTargetInput('');
    setGoalIconInput('star');
    setShowAddGoalModal(false);
    
    // Feedback
    setShowSuccess(true);
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.8 },
      colors: ['#C5A028', '#D4AF37']
    });
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const renderHome = () => (
    <div className="flex flex-col items-center animate-fadeIn">
      <header className="w-full px-8 py-8 flex justify-between items-center z-10">
        <div>
          <p className="text-royal-olive/60 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Savings Tracker</p>
          <h1 className="text-2xl font-serif text-royal-olive">Welcome, <span className="text-metallic-gold italic">{user.name}</span></h1>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1.5 bg-royal-olive px-4 py-2 rounded-full shadow-lg border border-metallic-gold/30">
             <span className="material-icons-round text-metallic-gold text-sm">local_fire_department</span>
             <span className="text-xs font-bold text-white tracking-widest">{user.streak} DAYS</span>
           </div>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 relative py-6 w-full">
        <PiggyBank progress={(user.totalSavings / 5000) * 100} />
        
        <div className="w-full mt-10 text-center">
          <div className="bg-royal-olive py-12 px-6 rounded-[48px] relative overflow-hidden shadow-2xl border border-metallic-gold/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-metallic-gold/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>
            <p className="text-metallic-gold/60 font-bold uppercase tracking-[0.4em] text-[10px] mb-4">Total Savings</p>
            <h2 className="text-5xl font-royal text-pale-gold tracking-tight">{user.currency}{user.totalSavings.toLocaleString()}</h2>
            <div className="flex items-center justify-center gap-2 mt-6">
              <button 
                onClick={() => setShowTierModal(true)}
                className="text-royal-olive font-bold text-[9px] bg-pale-gold px-5 py-2 rounded-full tracking-widest shadow-md uppercase hover:scale-105 active:scale-95 transition-all"
              >
                Premier Saver
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full px-8 py-8">
        <h3 className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-[0.3em] mb-6">Smart Suggestions</h3>
        <div className="space-y-4">
          {suggestions.map((tip, idx) => (
            <div key={idx} className="glass-olive border-l-4 border-royal-olive p-5 rounded-3xl flex items-start gap-4 shadow-sm italic text-[13px] text-royal-olive/80 leading-relaxed">
              <span className="material-icons-round text-metallic-gold text-xl">lightbulb</span>
              {tip}
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderGoals = () => (
    <div className="px-8 py-10 animate-fadeIn">
      <h1 className="text-3xl font-serif text-royal-olive mb-2">Savings Goals</h1>
      <p className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-[0.3em] mb-10">What are you saving for?</p>
      
      <div className="space-y-8">
        {user.goals.map(goal => (
          <div key={goal.id} className="glass-olive rounded-[40px] p-8 relative group shadow-xl border-t border-royal-olive/5">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-[22px] bg-royal-olive flex items-center justify-center shadow-lg border border-metallic-gold/30">
                  <span className="material-symbols-outlined text-metallic-gold text-2xl">{goal.icon}</span>
                </div>
                <div>
                  <h3 className="font-serif text-xl text-royal-olive">{goal.title}</h3>
                  <p className="text-[10px] text-royal-olive/40 font-bold uppercase tracking-[0.2em] mt-1">Goal: {user.currency}{goal.targetAmount.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-royal text-metallic-gold">{Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))}%</span>
              </div>
            </div>
            <div className="relative w-full h-3 bg-royal-olive/10 rounded-full overflow-hidden mb-5">
              <div 
                className="absolute top-0 left-0 h-full olive-gradient rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(61,65,45,0.2)]" 
                style={{ width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between">
              <p className="text-[9px] text-royal-olive/40 uppercase font-bold tracking-[0.15em]">Saved: {user.currency}{goal.currentAmount}</p>
              <p className="text-[9px] text-metallic-gold uppercase font-bold tracking-[0.15em]">
                {goal.currentAmount >= goal.targetAmount ? 'GOAL COMPLETED 🎉' : `${user.currency}${(goal.targetAmount - goal.currentAmount).toLocaleString()} REMAINING`}
              </p>
            </div>
          </div>
        ))}
        <button 
          onClick={() => { setShowAddGoalModal(true); setFormError(null); }}
          className="w-full py-10 rounded-[40px] border-2 border-dashed border-royal-olive/20 text-royal-olive font-bold uppercase tracking-widest text-[10px] flex flex-col items-center gap-3 hover:bg-royal-olive/5 hover:border-royal-olive/40 transition-all active:scale-95"
        >
          <span className="material-icons-round text-3xl">add_circle</span>
          Add New Goal
        </button>
      </div>
    </div>
  );

  const renderInsights = () => (
    <div className="px-8 py-10 animate-fadeIn">
      <h1 className="text-3xl font-serif text-royal-olive mb-2">Savings Insights</h1>
      <p className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-[0.3em] mb-10">See how you are growing</p>

      <div className="grid grid-cols-2 gap-5 mb-10">
        <div className="bg-royal-olive p-8 rounded-[32px] shadow-xl text-center border border-metallic-gold/10">
          <p className="text-[9px] font-bold text-metallic-gold/50 uppercase tracking-widest mb-3">Best Category</p>
          <p className="text-2xl font-serif text-white mb-2">Coffee ☕</p>
          <p className="text-[9px] text-pale-gold font-bold tracking-widest bg-white/10 py-1.5 rounded-full">{user.currency}500 SAVED</p>
        </div>
        <div className="glass-olive p-8 rounded-[32px] shadow-lg text-center border border-royal-olive/5">
          <p className="text-[9px] font-bold text-royal-olive/30 uppercase tracking-widest mb-3">Streak</p>
          <p className="text-2xl font-serif text-royal-olive mb-2">{user.streak} Days</p>
          <p className="text-[9px] text-metallic-gold font-bold tracking-widest">KEEP GOING! 🔥</p>
        </div>
      </div>

      <div className="glass-olive rounded-[40px] p-8 shadow-xl">
        <h3 className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-[0.3em] mb-8">Recent Activity</h3>
        <div className="space-y-6">
          {user.history.map(item => (
            <div key={item.id} className="flex justify-between items-center group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-royal-olive/5 flex items-center justify-center group-hover:bg-royal-olive transition-colors group-hover:text-pale-gold text-royal-olive">
                   <span className="text-xl">{item.category.includes(' ') ? item.category.split(' ')[1] : '✨'}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-royal-olive">{item.category}</p>
                  <p className="text-[10px] text-royal-olive/50 font-medium">{item.note}</p>
                </div>
              </div>
              <p className="text-sm font-royal text-metallic-gold">+{user.currency}{item.amount}</p>
            </div>
          ))}
          {user.history.length === 0 && (
            <p className="text-center text-[11px] text-royal-olive/30 py-8 font-serif italic tracking-wider">No history recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`max-w-[430px] mx-auto min-h-screen relative bg-olive-mist overflow-hidden flex flex-col shadow-2xl theme-${user.theme}`}>
      
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-20%] w-[400px] h-[400px] bg-royal-olive/5 rounded-full blur-[120px] -z-10"></div>
      <div className="absolute bottom-[20%] right-[-20%] w-[350px] h-[350px] bg-metallic-gold/10 rounded-full blur-[100px] -z-10"></div>

      <main className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderHome()}
            </motion.div>
          )}
          {view === 'goals' && (
            <motion.div 
              key="goals"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              {renderGoals()}
            </motion.div>
          )}
          {view === 'insights' && (
            <motion.div 
              key="insights"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderInsights()}
            </motion.div>
          )}
          {view === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-8 py-10 text-center">
                <h1 className="text-3xl font-serif text-royal-olive mb-2">Your Profile</h1>
                <p className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-[0.3em] mb-12">Manage your account</p>
                
                <div className="relative w-40 h-40 mx-auto mb-6 group">
                  <div className="w-full h-full rounded-[50px] border-2 border-metallic-gold p-2 shadow-2xl rotate-3 overflow-hidden bg-white">
                    <img 
                      src={user.profilePic || 'https://picsum.photos/seed/vault/400'} 
                      className="w-full h-full rounded-[40px] object-cover" 
                      alt="Profile" 
                    />
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-royal-olive/40 rounded-[50px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rotate-3">
                    <span className="material-icons-round text-white text-3xl">photo_camera</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleProfilePicChange} 
                      className="hidden" 
                    />
                  </label>
                </div>
                
                <h2 className="text-3xl font-serif text-royal-olive">{user.name}</h2>
                <p className="text-[11px] font-bold text-metallic-gold tracking-[0.3em] uppercase mt-2 mb-12">Top Tier Saver</p>
                
                <div className="space-y-4 w-full max-w-sm mx-auto">
                  <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="w-full py-5 glass-olive rounded-[24px] font-bold text-royal-olive flex items-center justify-between px-8 shadow-sm hover:translate-x-1 transition-transform border border-royal-olive/5"
                  >
                    <span className="text-xs uppercase tracking-widest">Account Settings</span>
                    <span className="material-icons-round text-metallic-gold">settings</span>
                  </button>
                  <button 
                    onClick={() => setShowThemeModal(true)}
                    className="w-full py-5 glass-olive rounded-[24px] font-bold text-royal-olive flex items-center justify-between px-8 shadow-sm hover:translate-x-1 transition-transform border border-royal-olive/5"
                  >
                    <span className="text-xs uppercase tracking-widest">Theme Preferences</span>
                    <span className="material-symbols-outlined text-metallic-gold">palette</span>
                  </button>
                  <div className="h-6"></div>
                  <button className="w-full py-5 border border-royal-olive/10 rounded-[24px] font-bold text-royal-olive/40 text-[10px] uppercase tracking-[0.4em] hover:bg-red-50 transition-colors">
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-royal-olive/20 backdrop-blur-sm pointer-events-none"
          >
            <motion.div 
              initial={{ scale: 0.5, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-white p-10 rounded-[40px] shadow-2xl border-4 border-metallic-gold flex flex-col items-center"
            >
              <span className="material-icons-round text-6xl text-metallic-gold mb-4">check_circle</span>
              <p className="text-royal-olive font-serif text-xl">Wealth Recorded!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB - Add Money */}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
        <button 
          onClick={() => { setShowAddModal(true); setFormError(null); }}
          className="olive-gradient text-pale-gold h-18 w-18 rounded-[28px] shadow-[0_20px_40px_rgba(61,65,45,0.4)] flex items-center justify-center hover:scale-105 transition-all active:scale-95 border-2 border-metallic-gold/30 p-5"
        >
          <span className="material-icons-round text-4xl">add</span>
        </button>
        <p className="text-[9px] font-bold text-royal-olive/60 mt-4 uppercase tracking-[0.4em]">Add Money</p>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-28 bg-royal-olive border-t border-metallic-gold/20 flex items-center justify-around px-8 pb-8 rounded-t-[50px] shadow-[0_-20px_50px_rgba(0,0,0,0.2)] z-40 max-w-[430px] mx-auto">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-2 transition-all ${view === 'home' ? 'text-pale-gold' : 'text-pale-gold/30 hover:text-pale-gold/50'}`}>
          <span className={`material-symbols-outlined text-2xl ${view === 'home' ? 'fill-1' : ''}`}>home</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Home</span>
        </button>
        <button onClick={() => setView('goals')} className={`flex flex-col items-center gap-2 transition-all ${view === 'goals' ? 'text-pale-gold' : 'text-pale-gold/30 hover:text-pale-gold/50'}`}>
          <span className={`material-symbols-outlined text-2xl ${view === 'goals' ? 'fill-1' : ''}`}>diamond</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Goals</span>
        </button>
        <div className="w-20"></div>
        <button onClick={() => setView('insights')} className={`flex flex-col items-center gap-2 transition-all ${view === 'insights' ? 'text-pale-gold' : 'text-pale-gold/30 hover:text-pale-gold/50'}`}>
          <span className={`material-symbols-outlined text-2xl ${view === 'insights' ? 'fill-1' : ''}`}>auto_graph</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Insights</span>
        </button>
        <button onClick={() => setView('profile')} className={`flex flex-col items-center gap-2 transition-all ${view === 'profile' ? 'text-pale-gold' : 'text-pale-gold/30 hover:text-pale-gold/50'}`}>
          <span className={`material-symbols-outlined text-2xl ${view === 'profile' ? 'fill-1' : ''}`}>person</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Profile</span>
        </button>
      </nav>

      {/* Add Money Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-royal-olive/40 backdrop-blur-md animate-fadeIn">
          <div className="bg-olive-mist w-full max-w-[430px] rounded-t-[50px] p-8 md:p-12 animate-slideUp border-t-4 border-metallic-gold max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-2xl font-serif text-royal-olive">{paymentStep === 'details' ? 'Add Money' : 'Complete Payment'}</h2>
                <p className="text-[9px] font-bold text-royal-olive/40 uppercase tracking-widest mt-1">
                  {paymentStep === 'details' ? 'Grow your piggy bank' : 'Transfer via UPI to record'}
                </p>
              </div>
              <button onClick={() => { setShowAddModal(false); setPaymentStep('details'); }} className="bg-royal-olive/5 p-3 rounded-full text-royal-olive/40 hover:text-royal-olive transition-colors">
                <span className="material-icons-round">close</span>
              </button>
            </div>
            
            <AnimatePresence mode="wait">
              {paymentStep === 'details' ? (
                <motion.div 
                  key="details"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  {formError && (
                    <div className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-red-100 animate-pulse">
                      {formError}
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-[0.3em] block mb-3">Amount ({user.currency})</label>
                    <div className="relative">
                       <span className="absolute left-6 top-1/2 -translate-y-1/2 text-metallic-gold font-royal text-xl">{user.currency}</span>
                       <input 
                        type="number"
                        value={amountInput}
                        onChange={(e) => { setAmountInput(e.target.value); setFormError(null); }}
                        placeholder="500"
                        className="w-full bg-white border-2 border-royal-olive/5 rounded-[24px] py-6 pl-12 pr-6 text-3xl font-royal text-royal-olive focus:border-metallic-gold/50 focus:ring-0 outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-[0.3em] block mb-3">Category</label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.values(Category).map(cat => (
                        <button 
                          key={cat}
                          type="button"
                          onClick={() => setCategoryInput(cat)}
                          className={`py-4 px-4 rounded-[18px] text-[10px] font-bold uppercase tracking-widest transition-all border ${categoryInput === cat ? 'bg-royal-olive text-pale-gold border-royal-olive shadow-lg' : 'bg-white text-royal-olive/50 border-royal-olive/5'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-[0.3em] block mb-3">Short Note</label>
                    <input 
                      type="text"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="e.g. Saved from coffee"
                      className="w-full bg-white border-2 border-royal-olive/5 rounded-[24px] py-5 px-8 text-xs text-royal-olive font-medium focus:border-metallic-gold/50 focus:ring-0 outline-none transition-all shadow-inner"
                    />
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      const amt = parseFloat(amountInput);
                      if (isNaN(amt) || amt <= 0) {
                        setFormError("Please enter an amount greater than zero.");
                        return;
                      }
                      setPaymentStep('upi');
                    }}
                    className={`w-full py-6 rounded-[24px] font-bold uppercase tracking-[0.3em] text-xs shadow-[0_20px_40px_rgba(61,65,45,0.3)] mt-6 active:scale-95 transition-all border ${amountInput && Number(amountInput) > 0 ? 'olive-gradient text-pale-gold border-metallic-gold/20' : 'bg-gray-200 text-gray-400 border-transparent cursor-not-allowed'}`}
                    disabled={!amountInput || Number(amountInput) <= 0}
                  >
                    Next: Transfer via UPI
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="upi"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8 text-center"
                >
                  <div className="bg-white p-8 rounded-[40px] shadow-inner border-2 border-royal-olive/5 flex flex-col items-center">
                    <div className="w-48 h-48 bg-royal-olive/5 rounded-3xl mb-6 flex items-center justify-center border-2 border-dashed border-metallic-gold/20 relative group">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=savenest.${user.name.toLowerCase().replace(/\s/g, '')}@okaxis%26pn=SaveNest%26am=${amountInput}%26cu=INR`}
                        alt="UPI QR Code"
                        className="w-40 h-40"
                      />
                      <div className="absolute inset-0 bg-royal-olive/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center p-4">
                        <p className="text-[10px] text-pale-gold font-bold uppercase tracking-widest leading-relaxed">Scan with GPay, PhonePe or any UPI app</p>
                      </div>
                    </div>
                    
                    <div className="w-full space-y-4">
                      <div className="bg-royal-olive/5 p-4 rounded-2xl border border-royal-olive/5 flex items-center justify-between relative">
                        <div className="text-left">
                          <p className="text-[8px] font-bold text-royal-olive/40 uppercase tracking-widest mb-1">Assumed UPI ID</p>
                          <p className="text-sm font-mono text-royal-olive font-bold">savenest.{user.name.toLowerCase().replace(/\s/g, '') || 'user'}@okaxis</p>
                        </div>
                        <button 
                          onClick={() => {
                            const upiId = `savenest.${user.name.toLowerCase().replace(/\s/g, '') || 'user'}@okaxis`;
                            
                            // Modern Clipboard API
                            if (navigator.clipboard && window.isSecureContext) {
                              navigator.clipboard.writeText(upiId)
                                .then(() => {
                                  setShowCopied(true);
                                  setTimeout(() => setShowCopied(false), 2000);
                                })
                                .catch(() => {
                                  // Fallback for older browsers or restricted iframes
                                  const textArea = document.createElement("textarea");
                                  textArea.value = upiId;
                                  document.body.appendChild(textArea);
                                  textArea.select();
                                  try {
                                    document.execCommand('copy');
                                    setShowCopied(true);
                                    setTimeout(() => setShowCopied(false), 2000);
                                  } catch (err) {
                                    console.error('Fallback copy failed', err);
                                  }
                                  document.body.removeChild(textArea);
                                });
                            } else {
                              // Direct fallback if API is not available
                              const textArea = document.createElement("textarea");
                              textArea.value = upiId;
                              document.body.appendChild(textArea);
                              textArea.select();
                              try {
                                document.execCommand('copy');
                                setShowCopied(true);
                                setTimeout(() => setShowCopied(false), 2000);
                              } catch (err) {
                                console.error('Direct fallback copy failed', err);
                              }
                              document.body.removeChild(textArea);
                            }
                          }}
                          className="material-icons-round text-metallic-gold hover:scale-110 transition-transform"
                        >
                          {showCopied ? 'done' : 'content_copy'}
                        </button>
                        
                        <AnimatePresence>
                          {showCopied && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute -top-8 right-0 bg-royal-olive text-pale-gold text-[8px] font-bold px-2 py-1 rounded-md uppercase tracking-widest"
                            >
                              Copied!
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <div className="bg-metallic-gold/10 p-4 rounded-2xl border border-metallic-gold/10 flex items-center justify-between">
                        <div className="text-left">
                          <p className="text-[8px] font-bold text-metallic-gold/60 uppercase tracking-widest mb-1">Amount to Transfer</p>
                          <p className="text-xl font-royal text-royal-olive">{user.currency}{amountInput}</p>
                        </div>
                        <span className="material-icons-round text-metallic-gold">payments</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button 
                      type="button"
                      onClick={() => {
                        handleAddMoney();
                        setPaymentStep('details');
                      }}
                      className="w-full py-6 rounded-[24px] olive-gradient text-pale-gold font-bold uppercase tracking-[0.3em] text-xs shadow-[0_20px_40px_rgba(61,65,45,0.3)] active:scale-95 transition-all border border-metallic-gold/20"
                    >
                      I've Transferred the Money
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPaymentStep('details')}
                      className="w-full py-4 text-[10px] font-bold text-royal-olive/40 uppercase tracking-widest hover:text-royal-olive transition-colors"
                    >
                      Go Back
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-royal-olive/40 backdrop-blur-md animate-fadeIn">
          <div className="bg-olive-mist w-full max-w-[430px] rounded-t-[50px] p-8 md:p-12 animate-slideUp border-t-4 border-metallic-gold max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-2xl font-serif text-royal-olive">New Goal</h2>
                <p className="text-[9px] font-bold text-royal-olive/40 uppercase tracking-widest mt-1">Set a new savings target</p>
              </div>
              <button onClick={() => setShowAddGoalModal(false)} className="bg-royal-olive/5 p-3 rounded-full text-royal-olive/40 hover:text-royal-olive transition-colors">
                <span className="material-icons-round">close</span>
              </button>
            </div>
            
            <div className="space-y-8">
              {formError && (
                <div className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-red-100 animate-pulse">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-[0.3em] block mb-3">Goal Title</label>
                <input 
                  type="text"
                  value={goalTitleInput}
                  onChange={(e) => { setGoalTitleInput(e.target.value); setFormError(null); }}
                  placeholder="e.g. New Phone"
                  className="w-full bg-white border-2 border-royal-olive/5 rounded-[24px] py-6 px-8 text-lg font-serif text-royal-olive focus:border-metallic-gold/50 focus:ring-0 outline-none transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-[0.3em] block mb-3">Target Amount ({user.currency})</label>
                <div className="relative">
                   <span className="absolute left-6 top-1/2 -translate-y-1/2 text-metallic-gold font-royal text-xl">{user.currency}</span>
                   <input 
                    type="number"
                    value={goalTargetInput}
                    onChange={(e) => { setGoalTargetInput(e.target.value); setFormError(null); }}
                    placeholder="10,000"
                    className="w-full bg-white border-2 border-royal-olive/5 rounded-[24px] py-6 pl-12 pr-6 text-3xl font-royal text-royal-olive focus:border-metallic-gold/50 focus:ring-0 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-[0.3em] block mb-3">Select Icon</label>
                <div className="grid grid-cols-4 gap-3">
                  {availableIcons.map(icon => (
                    <button 
                      key={icon}
                      type="button"
                      onClick={() => setGoalIconInput(icon)}
                      className={`w-full py-4 rounded-[18px] border flex items-center justify-center transition-all ${goalIconInput === icon ? 'bg-royal-olive text-pale-gold border-royal-olive shadow-lg scale-105' : 'bg-white text-royal-olive/40 border-royal-olive/5 hover:border-royal-olive/20'}`}
                    >
                      <span className="material-symbols-outlined text-xl">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="button"
                onClick={() => handleAddGoal()}
                className={`w-full py-6 rounded-[24px] font-bold uppercase tracking-[0.3em] text-xs shadow-[0_20px_40px_rgba(61,65,45,0.3)] mt-6 active:scale-95 transition-all border ${goalTitleInput && goalTargetInput && Number(goalTargetInput) > 0 ? 'olive-gradient text-pale-gold border-metallic-gold/20' : 'bg-gray-200 text-gray-400 border-transparent cursor-not-allowed'}`}
                disabled={!goalTitleInput || !goalTargetInput || Number(goalTargetInput) <= 0}
              >
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-royal-olive/40 backdrop-blur-md animate-fadeIn">
          <div className="bg-olive-mist w-full max-w-[430px] rounded-t-[50px] p-8 md:p-12 animate-slideUp border-t-4 border-metallic-gold max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-2xl font-serif text-royal-olive">Settings</h2>
                <p className="text-[9px] font-bold text-royal-olive/40 uppercase tracking-widest mt-1">Manage your treasury</p>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="bg-royal-olive/5 p-3 rounded-full text-royal-olive/40 hover:text-royal-olive transition-colors">
                <span className="material-icons-round">close</span>
              </button>
            </div>
            <div className="space-y-6">
              <div className="p-6 glass-olive rounded-3xl border border-royal-olive/5">
                <p className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-widest mb-4">Account Holder</p>
                <div className="flex items-center justify-between gap-4">
                  <input 
                    type="text"
                    value={user.name}
                    onChange={(e) => setUser(prev => ({ ...prev, name: e.target.value }))}
                    className="text-lg font-serif text-royal-olive bg-transparent border-none outline-none focus:ring-0 p-0 w-full"
                  />
                  <span className="material-icons-round text-metallic-gold text-sm">edit</span>
                </div>
              </div>
              <div className="p-6 glass-olive rounded-3xl border border-royal-olive/5">
                <p className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-widest mb-4">Currency</p>
                <div className="grid grid-cols-4 gap-2">
                  {['₹', '$', '€', '£'].map(curr => (
                    <button 
                      key={curr}
                      onClick={() => setUser(prev => ({ ...prev, currency: curr }))}
                      className={`py-3 rounded-xl font-serif transition-all ${user.currency === curr ? 'bg-royal-olive text-pale-gold shadow-lg' : 'bg-white/50 text-royal-olive/60 hover:bg-white'}`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 glass-olive rounded-3xl border border-royal-olive/5">
                <p className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-widest mb-4">Notifications</p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-serif text-royal-olive">Daily Reminders</p>
                  <button 
                    onClick={() => setUser(prev => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }))}
                    className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${user.notificationsEnabled ? 'bg-royal-olive' : 'bg-royal-olive/20'}`}
                  >
                    <motion.div 
                      animate={{ x: user.notificationsEnabled ? 24 : 4 }}
                      className="absolute top-1 w-4 h-4 bg-pale-gold rounded-full shadow-sm"
                    />
                  </button>
                </div>
              </div>
              
              <div className="pt-4">
                <button 
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all your savings data? This cannot be undone.')) {
                      localStorage.removeItem('savenest_user_data');
                      window.location.reload();
                    }
                  }}
                  className="w-full py-5 rounded-3xl border-2 border-red-100 text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 transition-colors"
                >
                  Reset All Treasury Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Theme Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-royal-olive/40 backdrop-blur-md animate-fadeIn">
          <div className="bg-olive-mist w-full max-w-[430px] rounded-t-[50px] p-8 md:p-12 animate-slideUp border-t-4 border-metallic-gold max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-2xl font-serif text-royal-olive">Themes</h2>
                <p className="text-[9px] font-bold text-royal-olive/40 uppercase tracking-widest mt-1">Personalize your experience</p>
              </div>
              <button onClick={() => setShowThemeModal(false)} className="bg-royal-olive/5 p-3 rounded-full text-royal-olive/40 hover:text-royal-olive transition-colors">
                <span className="material-icons-round">close</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['Sleek', 'Minimal', 'Royal', 'Classic'].map(theme => (
                <button 
                  key={theme}
                  onClick={() => {
                    setUser(prev => ({ ...prev, theme: theme.toLowerCase() as any }));
                    setShowThemeModal(false);
                  }}
                  className={`p-6 rounded-3xl border-2 transition-all text-center ${user.theme === theme.toLowerCase() ? 'border-metallic-gold bg-royal-olive text-pale-gold shadow-lg' : 'border-royal-olive/5 bg-white text-royal-olive'}`}
                >
                  <p className="text-xs font-bold uppercase tracking-widest">{theme}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tier Modal */}
      {showTierModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-royal-olive/40 backdrop-blur-md animate-fadeIn">
          <div className="bg-olive-mist w-full max-w-[430px] rounded-t-[50px] p-8 md:p-12 animate-slideUp border-t-4 border-metallic-gold max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-2xl font-serif text-royal-olive">Savings Tiers</h2>
                <p className="text-[9px] font-bold text-royal-olive/40 uppercase tracking-widest mt-1">Your status in the treasury</p>
              </div>
              <button onClick={() => setShowTierModal(false)} className="bg-royal-olive/5 p-3 rounded-full text-royal-olive/40 hover:text-royal-olive transition-colors">
                <span className="material-icons-round">close</span>
              </button>
            </div>
            
            <div className="space-y-6">
              {[
                { name: 'Apprentice', min: 0, icon: 'eco', color: 'text-green-600', perks: ['Basic savings tracking', 'Standard piggy bank'] },
                { name: 'Premier Saver', min: 1000, icon: 'stars', color: 'text-metallic-gold', perks: ['Custom themes unlocked', 'Priority smart tips', 'Streak bonuses'] },
                { name: 'Master Treasurer', min: 10000, icon: 'workspace_premium', color: 'text-royal-olive', perks: ['Exclusive "Royal" theme', 'Advanced financial insights', 'Early access to new features'] },
                { name: 'Royal Guardian', min: 50000, icon: 'diamond', color: 'text-blue-600', perks: ['Personalized wealth coaching', 'Unlimited goals', 'VIP support'] }
              ].map((tier, i) => (
                <div key={i} className="space-y-3">
                  <button 
                    onClick={() => setSelectedTierIdx(selectedTierIdx === i ? null : i)}
                    className={`w-full p-6 rounded-3xl border flex items-center gap-5 transition-all text-left ${user.totalSavings >= tier.min ? 'bg-white border-metallic-gold/30 shadow-md hover:shadow-lg' : 'bg-white/40 border-royal-olive/5 hover:border-royal-olive/20'}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${user.totalSavings >= tier.min ? 'bg-royal-olive/5' : 'bg-gray-100'}`}>
                      <span className={`material-icons-round ${user.totalSavings >= tier.min ? tier.color : 'text-royal-olive/20'}`}>{tier.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-serif ${user.totalSavings >= tier.min ? 'text-royal-olive' : 'text-royal-olive/40'}`}>{tier.name}</h4>
                      <p className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-widest">Min. {user.currency}{tier.min.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.totalSavings >= tier.min ? (
                        <span className="material-icons-round text-green-500">check_circle</span>
                      ) : (
                        <span className="material-icons-round text-royal-olive/10">lock</span>
                      )}
                      <span className={`material-icons-round text-royal-olive/20 transition-transform ${selectedTierIdx === i ? 'rotate-180' : ''}`}>expand_more</span>
                    </div>
                  </button>
                  
                  {selectedTierIdx === i && (
                    <div className="bg-white/50 rounded-[24px] p-6 border border-royal-olive/5 animate-fadeIn">
                      <p className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-[0.2em] mb-4">Unlocked Perks</p>
                      <ul className="space-y-3">
                        {tier.perks.map((perk, pIdx) => (
                          <li key={pIdx} className="flex items-center gap-3 text-xs text-royal-olive/70">
                            <span className="material-icons-round text-metallic-gold text-sm">done</span>
                            {perk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-royal-olive/60 backdrop-blur-xl p-6">
          <div className="bg-olive-mist w-full max-w-[380px] rounded-[40px] p-10 animate-slideUp border-2 border-metallic-gold/20 shadow-[0_40px_80px_rgba(0,0,0,0.3)] text-center">
            <div className="w-24 h-24 bg-royal-olive rounded-full mx-auto mb-8 flex items-center justify-center shadow-xl">
              <span className="material-icons-round text-pale-gold text-5xl">savings</span>
            </div>
            <h2 className="text-3xl font-serif text-royal-olive mb-4">Welcome to SaveNest</h2>
            <p className="text-xs text-royal-olive/60 leading-relaxed mb-10">
              Your digital treasury awaits. Let's start by personalizing your savings journey.
            </p>
            
            <div className="space-y-6 text-left">
              <div>
                <label className="text-[10px] font-bold text-royal-olive/40 uppercase tracking-[0.3em] block mb-3">What's your name?</label>
                <input 
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-white border-2 border-royal-olive/5 rounded-[24px] py-5 px-8 text-sm text-royal-olive font-medium focus:border-metallic-gold/50 focus:ring-0 outline-none transition-all shadow-inner"
                />
              </div>
              
              <button 
                onClick={() => {
                  if (nameInput.trim()) {
                    setUser(prev => ({ ...prev, name: nameInput.trim() }));
                    setShowOnboarding(false);
                  }
                }}
                disabled={!nameInput.trim()}
                className={`w-full py-6 rounded-[24px] font-bold uppercase tracking-[0.3em] text-[10px] shadow-lg transition-all ${nameInput.trim() ? 'olive-gradient text-pale-gold' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                Begin Journey
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .fill-1 { font-variation-settings: 'FILL' 1; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
