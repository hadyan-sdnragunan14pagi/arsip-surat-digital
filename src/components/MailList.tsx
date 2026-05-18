import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, where, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Mail, Category, MailType } from '../types';
import { 
  Plus, 
  Edit, 
  Filter,
  ChevronDown,
  ExternalLink,
  Trash2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MailForm from './MailForm';

export default function MailList({ type, searchQuery }: { type: MailType, searchQuery: string }) {
  const { user, profile } = useAuth();
  const [mails, setMails] = useState<Mail[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMail, setSelectedMail] = useState<Mail | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [isFiltering, setIsFiltering] = useState(false);
  const [isYearFiltering, setIsYearFiltering] = useState(false);

  const years = Array.from({ length: new Date().getFullYear() - 2025 + 2 }, (_, i) => (2025 + i).toString()).reverse();

  useEffect(() => {
    const qMails = query(
      collection(db, 'mails'), 
      where('type', '==', type),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(qMails, (snapshot) => {
      setMails(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mail)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'mails'));

    const unsubscribeCats = onSnapshot(query(collection(db, 'categories')), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });

    return () => {
      unsubscribe();
      unsubscribeCats();
    };
  }, [type]);

  const filteredMails = mails.filter(m => {
    const matchesSearch = 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sender?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.recipient?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || m.categoryId === filterCategory;
    const matchesYear = filterYear === 'all' || m.date.startsWith(filterYear);
    
    return matchesSearch && matchesCategory && matchesYear;
  });

  const handleDelete = async (mail: Mail) => {
    const isAdmin = profile?.role === 'admin';
    const confirmMsg = isAdmin 
      ? 'Yakin ingin menghapus arsip ini secara permanen?' 
      : 'Ajukan penghapusan arsip ini ke administrator?';

    if (confirm(confirmMsg)) {
      try {
        if (isAdmin) {
          await deleteDoc(doc(db, 'mails', mail.id));
        } else {
          await updateDoc(doc(db, 'mails', mail.id), {
            deletionRequested: true,
            deletionRequestedBy: user?.uid,
            deletionRequestedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } catch (err) {
        handleFirestoreError(err, isAdmin ? OperationType.DELETE : OperationType.UPDATE, 'mails/' + mail.id);
      }
    }
  };

  const handleEdit = (mail: Mail) => {
    setSelectedMail(mail);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Arsip {type === 'incoming' ? 'Surat Masuk' : type === 'outgoing' ? 'Surat Keluar' : 'SK dan SE'}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Ditemukan {filteredMails.length} data arsip</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Year Filter */}
          <div className="relative">
            <button 
              onClick={() => setIsYearFiltering(!isYearFiltering)}
              className={`flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold tracking-tight hover:bg-slate-50 transition-all ${filterYear !== 'all' ? 'text-blue-600 border-blue-500' : 'text-slate-600'}`}
            >
              <span>{filterYear === 'all' ? 'Semua Tahun' : filterYear}</span>
              <ChevronDown size={12} className="ml-1 opacity-50" />
            </button>
            <AnimatePresence>
              {isYearFiltering && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-32 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-2"
                >
                  <button 
                    onClick={() => { setFilterYear('all'); setIsYearFiltering(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${filterYear === 'all' ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
                  >
                    Semua
                  </button>
                  {years.map(year => (
                    <button 
                      key={year}
                      onClick={() => { setFilterYear(year); setIsYearFiltering(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${filterYear === year ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
                    >
                      {year}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <button 
              onClick={() => setIsFiltering(!isFiltering)}
              className={`flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold tracking-tight hover:bg-slate-50 transition-all ${filterCategory !== 'all' ? 'text-blue-600 border-blue-500' : 'text-slate-600'}`}
            >
              <Filter size={14} />
              <span>{filterCategory === 'all' ? 'Filter Kategori' : categories.find(c => c.id === filterCategory)?.name}</span>
              <ChevronDown size={12} className="ml-1 opacity-50" />
            </button>
            <AnimatePresence>
              {isFiltering && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 py-2"
                >
                  <button 
                    onClick={() => { setFilterCategory('all'); setIsFiltering(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${filterCategory === 'all' ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
                  >
                    Semua Kategori
                  </button>
                  {categories.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => { setFilterCategory(cat.id); setIsFiltering(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${filterCategory === cat.id ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

              <button 
                onClick={() => { setSelectedMail(null); setIsFormOpen(true); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all text-sm font-bold shadow-sm"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Surat Baru</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <th className="px-6 py-4">Tgl Arsip</th>
                    <th className="px-6 py-4">Nomor Surat</th>
                    <th className="px-6 py-4">Perihal</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {filteredMails.length > 0 ? filteredMails.map(mail => (
                    <tr key={mail.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {new Date(mail.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          {mail.referenceNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800 line-clamp-1">{mail.title}</p>
                          {mail.deletionRequested && (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded animate-pulse shrink-0">
                              <Clock size={10} />
                              PENDING HAPUS
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{type === 'incoming' || type === 'skse' ? mail.sender : mail.recipient}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          type === 'incoming' ? 'bg-blue-50 text-blue-600' : 
                          type === 'outgoing' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-purple-50 text-purple-600'
                        }`}>
                          {categories.find(c => c.id === mail.categoryId)?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {mail.fileUrl && (
                            <a 
                              href={mail.fileUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Detail"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                          <button 
                            onClick={() => handleEdit(mail)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(mail)}
                            className={`p-1.5 transition-colors ${mail.deletionRequested ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-red-600'}`}
                            title={mail.deletionRequested ? 'Menunggu Persetujuan' : 'Hapus'}
                            disabled={mail.deletionRequested && profile?.role !== 'admin'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-300">
                        <p className="text-xs font-medium italic">Tidak ada data arsip</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SDN Ragunan 14 Pagi — Selesai</p>
            </div>
          </div>

      {/* Modal Form */}
      <AnimatePresence>
        {isFormOpen && (
          <MailForm 
            type={type} 
            mail={selectedMail} 
            categories={categories} 
            onClose={() => setIsFormOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

