import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Category } from '../types';
import { Plus, Tag, Edit, Trash2, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';

export default function CategoryManager() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'categories'));

    return unsubscribe;
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Hapus kategori "${name}"? Pastikan tidak ada surat yang masih menggunakan kategori ini.`)) {
      try {
        await deleteDoc(doc(db, 'categories', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'categories/' + id);
      }
    }
  };

  console.log('User Profile:', profile); // Debugging line

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Terbatas</h2>
        <p className="text-gray-500 max-w-sm">Maaf, hanya Administrator yang dapat mengelola kategori surat.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Manajemen Kategori</h2>
          <p className="text-xs text-slate-400 mt-0.5">Definisikan klasifikasi arsip surat Anda</p>
        </div>
        <button 
          onClick={() => { setSelectedCat(null); setIsFormOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all text-sm font-bold shadow-sm"
        >
          <Plus size={16} />
          <span>Tambah Kategori</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map(cat => (
          <motion.div 
            layout
            key={cat.id}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 transition-all flex flex-col group relative"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 bg-slate-50 text-slate-400 rounded flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <Tag size={16} />
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setSelectedCat(cat); setIsFormOpen(true); }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Edit size={14} />
                </button>
                <button 
                  onClick={() => handleDelete(cat.id, cat.name)}
                  className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-sm text-slate-800 mb-1">{cat.name}</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded tracking-widest uppercase">
                {cat.code || 'NO-CODE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed flex-1">{cat.description || 'Tidak ada deskripsi kategori'}</p>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <CategoryForm 
            category={selectedCat} 
            onClose={() => setIsFormOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryForm({ category, onClose }: { category: Category | null, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: category?.name || '',
    code: category?.code || '',
    description: category?.description || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (category) {
        await updateDoc(doc(db, 'categories', category.id), {
          ...formData,
          createdAt: category.createdAt // Keep metadata
        });
      } else {
        await addDoc(collection(db, 'categories'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      onClose();
    } catch (err) {
      handleFirestoreError(err, category ? OperationType.UPDATE : OperationType.CREATE, 'categories');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden border border-slate-200"
      >
        <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{category ? 'Ubah' : 'Buat'} Kategori</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 bg-white">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Kategori *</label>
              <input 
                required
                autoFocus
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm"
                placeholder="Contoh: Kurikulum"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kode *</label>
              <input 
                required
                type="text" 
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-mono uppercase"
                placeholder="TU"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deskripsi Singkat</label>
            <textarea 
              rows={3}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm resize-none"
              placeholder="Penjelasan kategori klasifikasi..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-50">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all font-semibold"
            >
              Batal
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-widest py-2.5 rounded shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Proses...' : 'Simpan Kategori'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
