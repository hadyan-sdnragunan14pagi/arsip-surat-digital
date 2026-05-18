import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { 
  FileText, 
  Inbox, 
  Send, 
  Plus, 
  Search, 
  Filter, 
  Settings, 
  Users,
  ShieldCheck,
  LogOut, 
  LayoutDashboard,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import MailList from './components/MailList';
import CategoryManager from './components/CategoryManager';
import UserManager from './components/UserManager';
import ApprovalCenter from './components/ApprovalCenter';

type View = 'dashboard' | 'incoming' | 'outgoing' | 'skse' | 'categories' | 'users' | 'approvals';

export default function App() {
  const { user, profile, loading, signIn, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center"
        >
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Arsip Digital Surat Sekolah</h1>
          <p className="text-gray-500 mb-8">Sistem pengarsipan digital surat SDN Ragunan 14 Pagi.</p>
          <button 
            onClick={signIn}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Masuk dengan Google
          </button>
        </motion.div>
      </div>
    );
  }

  const NavItem = ({ icon: Icon, label, view, active }: { icon: any, label: string, view: View, active: boolean }) => (
    <button 
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-all relative ${
        active 
          ? 'bg-slate-50 text-slate-800 font-medium border-r-3 border-blue-600' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-blue-600">
              Arsip Digital <span className="text-slate-800">Sekolah</span>
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">SDN Ragunan 14 Pagi</p>
        </div>

        <nav className="flex-1 px-2 py-6 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4">Arsip Utama</div>
          <NavItem icon={LayoutDashboard} label="Dashboard" view="dashboard" active={currentView === 'dashboard'} />
          <NavItem icon={Inbox} label="Surat Masuk" view="incoming" active={currentView === 'incoming'} />
          <NavItem icon={Send} label="Surat Keluar" view="outgoing" active={currentView === 'outgoing'} />
          <NavItem icon={FileText} label="SK dan SE" view="skse" active={currentView === 'skse'} />
          
          <div className="mt-8">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4">Pengaturan</div>
            <NavItem icon={Settings} label="Kategori Surat" view="categories" active={currentView === 'categories'} />
            {profile?.role === 'admin' && (
              <>
                <NavItem icon={Users} label="Manajemen Pengguna" view="users" active={currentView === 'users'} />
                <NavItem icon={ShieldCheck} label="Pusat Persetujuan" view="approvals" active={currentView === 'approvals'} />
              </>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 mb-4">
            <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-slate-200 shadow-sm" />
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-800 truncate">{user.displayName}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-tight">{profile?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <LogOut size={14} />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="relative w-96 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari nomor surat, perihal, pengirim..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-lg transition-all text-sm outline-none"
            />
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex text-right flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Hari Ini</span>
              <span className="text-xs font-medium text-slate-800">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            {currentView === 'dashboard' ? (
               <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <LayoutDashboard size={18} />
               </div>
            ) : (
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="text-slate-400 hover:text-blue-600 transition-colors"
                title="Ke Dashboard"
              >
                <LayoutDashboard size={20} />
              </button>
            )}
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentView === 'dashboard' && <Dashboard searchQuery={searchQuery} />}
              {currentView === 'incoming' && <MailList type="incoming" searchQuery={searchQuery} />}
              {currentView === 'outgoing' && <MailList type="outgoing" searchQuery={searchQuery} />}
              {currentView === 'skse' && <MailList type="skse" searchQuery={searchQuery} />}
              {currentView === 'categories' && <CategoryManager />}
              {currentView === 'users' && <UserManager />}
              {currentView === 'approvals' && <ApprovalCenter />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
