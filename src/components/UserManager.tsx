import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { UserProfile } from '../hooks/useAuth';
import { 
  Users, 
  Shield, 
  User as UserIcon, 
  Trash2, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function UserManager() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<(UserProfile & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as UserProfile
      }));
      setUsers(usersData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleToggleRole = async (userId: string, currentRole: string, email: string) => {
    // Prevent self-demotion or modifying the main admin
    if (email === 'hadyan.abdul7@admin.sd.belajar.id') {
      alert('Admin utama tidak dapat diubah perannya.');
      return;
    }

    try {
      const newRole = currentRole === 'admin' ? 'staff' : 'admin';
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (email === 'hadyan.abdul7@admin.sd.belajar.id') {
      alert('Admin utama tidak dapat dihapus.');
      return;
    }

    if (!window.confirm(`Hapus status akses untuk ${email}? Pengguna tetap bisa login namun profil akan direset.`)) return;

    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'users');
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Terbatas</h2>
        <p className="text-slate-500 max-w-sm">Hanya Administrator yang dapat mengelola hak akses pengguna.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Manajemen Pengguna</h2>
          <p className="text-xs text-slate-400 mt-0.5">Kelola hak akses dan peran staf administrasi</p>
        </div>
        <div className="bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <Users size={16} className="text-blue-600" />
          <span className="text-xs font-bold text-blue-700">{users.length} Terdaftar</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-4">Nama Pengguna / Email</th>
                <th className="px-6 py-4">Peran</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <p className="animate-pulse">Memuat data pengguna...</p>
                  </td>
                </tr>
              ) : users.length > 0 ? users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <UserIcon size={16} />
                      </div>
                      <div>
                        {u.displayName && <p className="font-semibold text-slate-800">{u.displayName}</p>}
                        <p className={`text-xs ${u.displayName ? 'text-slate-400' : 'font-semibold text-slate-800'}`}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      u.role === 'admin' 
                        ? 'bg-purple-50 text-purple-600' 
                        : 'bg-blue-50 text-blue-600'
                    }`}>
                      {u.role === 'admin' ? <ShieldCheck size={12} /> : <UserIcon size={12} />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Aktif
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {u.email !== 'hadyan.abdul7@admin.sd.belajar.id' && (
                        <>
                          <button 
                            onClick={() => handleToggleRole(u.id, u.role, u.email)}
                            className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                            title={u.role === 'admin' ? 'Jadikan Staff' : 'Jadikan Admin'}
                          >
                            Ubah Peran
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                            title="Hapus Profil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {u.email === 'hadyan.abdul7@admin.sd.belajar.id' && (
                        <span className="text-[10px] font-bold text-slate-300 uppercase italic tracking-widest">Utama</span>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-300">
                    <p className="text-xs font-medium italic">Tidak ada pengguna terdaftar</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-medium">Data disinkronkan langsung dengan Firebase Auth & Firestore</p>
        </div>
      </div>
    </div>
  );
}
