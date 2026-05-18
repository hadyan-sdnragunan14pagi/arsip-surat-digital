import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Mail } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  Trash2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ApprovalCenter() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<Mail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const q = query(collection(db, 'mails'), where('deletionRequested', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mail)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'mails/requests');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleApprove = async (mail: Mail) => {
    if (!confirm(`Setujui penghapusan permanen untuk: ${mail.title}?`)) return;
    try {
      await deleteDoc(doc(db, 'mails', mail.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'mails/' + mail.id);
    }
  };

  const handleReject = async (mail: Mail) => {
    if (!confirm(`Tolak permintaan hapus untuk: ${mail.title}?`)) return;
    try {
      await updateDoc(doc(db, 'mails', mail.id), {
        deletionRequested: false,
        deletionRequestedBy: null,
        deletionRequestedAt: null,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'mails/' + mail.id);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Terbatas</h2>
        <p className="text-slate-500 max-w-sm">Hanya Administrator yang dapat mengakses Pusat Persetujuan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Pusat Persetujuan Hapus</h2>
          <p className="text-xs text-slate-400 mt-0.5">Tinjau dan proses permintaan penghapusan arsip dari staf</p>
        </div>
        <div className="bg-amber-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <Clock size={16} className="text-amber-600" />
          <span className="text-xs font-bold text-amber-700">{requests.length} Menunggu</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-4">Informasi Surat</th>
                <th className="px-6 py-4">Tipe</th>
                <th className="px-6 py-4">Diajukan Oleh</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <p className="animate-pulse">Memuat data permintaan...</p>
                  </td>
                </tr>
              ) : requests.length > 0 ? requests.map(mail => (
                <tr key={mail.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-400 shrink-0">
                        <MessageSquare size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{mail.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{mail.referenceNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      mail.type === 'incoming' ? 'bg-blue-50 text-blue-600' : 
                      mail.type === 'outgoing' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-purple-50 text-purple-600'
                    }`}>
                      {mail.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-medium text-slate-600">ID: {mail.deletionRequestedBy?.substring(0, 8)}...</p>
                    <p className="text-[9px] text-slate-400">
                      {mail.deletionRequestedAt?.toDate ? new Date(mail.deletionRequestedAt.toDate()).toLocaleString('id-ID') : 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {mail.fileUrl && (
                        <a 
                          href={mail.fileUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Lihat File"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <button 
                        onClick={() => handleReject(mail)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        title="Tolak"
                      >
                        <XCircle size={18} />
                      </button>
                      <button 
                        onClick={() => handleApprove(mail)}
                        className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors"
                        title="Setujui (Hapus)"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-300">
                    <p className="text-xs font-medium italic">Tidak ada permintaan penghapusan tertunda</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
