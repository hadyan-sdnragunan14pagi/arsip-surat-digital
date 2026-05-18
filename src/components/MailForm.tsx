import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getCountFromServer } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Mail, Category, MailType } from '../types';
import { 
  X, 
  Loader2, 
  Upload, 
  Link as LinkIcon, 
  AlertCircle, 
  CheckCircle2, 
  Cloud as CloudUpload,
  ChevronDown
} from 'lucide-react';
import { motion } from 'motion/react';
import { uploadToDrive } from '../services/googleDriveService';

interface MailFormProps {
  type: MailType;
  mail: Mail | null;
  categories: Category[];
  onClose: () => void;
}

export default function MailForm({ type, mail, categories, onClose }: MailFormProps) {
  const { user, getAccessToken, signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const filteredCategories = type === 'skse' 
    ? categories.filter(c => c.name.toLowerCase().includes('keputusan') || c.name.toLowerCase().includes('edaran'))
    : categories;

  const [formData, setFormData] = useState({
    title: mail?.title || '',
    referenceNumber: mail?.referenceNumber || '',
    sender: mail?.sender || '',
    recipient: mail?.recipient || '',
    categoryId: mail?.categoryId || (filteredCategories[0]?.id || ''),
    date: mail?.date || new Date().toISOString().split('T')[0],
    description: mail?.description || '',
    fileUrl: mail?.fileUrl || ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  useEffect(() => {
    if ((type === 'outgoing' || type === 'skse') && !mail && formData.categoryId) {
      const generateSequence = async () => {
        setIsGenerating(true);
        try {
          const year = new Date(formData.date).getFullYear() || new Date().getFullYear();
          // Filter by type and date starting with the current year (YYYY)
          const q = query(
            collection(db, 'mails'), 
            where('type', '==', type),
            where('date', '>=', `${year}-01-01`),
            where('date', '<=', `${year}-12-31`)
          );
          
          const snapshot = await getCountFromServer(q);
          const count = snapshot.data().count;
          
          if (type === 'outgoing') {
            const nextNum = (count + 1).toString().padStart(3, '0');
            const category = categories.find(c => c.id === formData.categoryId);
            const code = category?.code || 'SK';
            
            setFormData(prev => ({
              ...prev,
              referenceNumber: `${nextNum}/${code}`
            }));
          } else if (type === 'skse') {
            setFormData(prev => ({
              ...prev,
              referenceNumber: `${count + 1} Tahun ${year}`
            }));
          }
        } catch (err) {
          console.error("Error generating number", err);
        } finally {
          setIsGenerating(false);
        }
      };
      generateSequence();
    }
  }, [formData.categoryId, formData.date, type, mail, categories]);

  const handleDriveConnect = async () => {
    setLoading(true);
    try {
      await signIn();
      setTokenMissing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      let finalFileUrl = formData.fileUrl;

      if (file) {
        const token = await getAccessToken();
        if (!token) {
          setTokenMissing(true);
          setLoading(false);
          return;
        }

        setUploading(true);
        const folderId = (import.meta as any).env.VITE_DRIVE_FOLDER_ID;
        const categoryName = categories.find(c => c.id === formData.categoryId)?.name || 'Surat';
        
        try {
          const result = await uploadToDrive(
            file,
            token,
            categoryName,
            formData.title,
            folderId
          );
          finalFileUrl = result.webViewLink;
        } catch (uploadErr: any) {
          throw new Error(`Gagal upload ke Drive: ${uploadErr.message}`);
        } finally {
          setUploading(false);
        }
      }

      const payload: any = {
        ...formData,
        fileUrl: finalFileUrl,
        type,
        creatorId: user.uid,
        updatedAt: serverTimestamp(),
      };

      if (mail) {
        payload.createdAt = mail.createdAt;
        payload.creatorId = mail.creatorId;
        await updateDoc(doc(db, 'mails', mail.id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, 'mails'), payload);
      }
      onClose();
    } catch (err) {
      handleFirestoreError(err, mail ? OperationType.UPDATE : OperationType.CREATE, 'mails');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="bg-white rounded-xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
      >
        <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{mail ? 'Ubah' : 'Buat'} Arsip Baru</h3>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">Penyimpanan Otomatis ke Google Drive</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Perihal Surat *</label>
              <input 
                required
                type="text" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm"
                placeholder="Contoh: Undangan Rapat Pleno"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nomor Surat *</label>
              <div className="relative">
                <input 
                  required
                  type="text" 
                  value={formData.referenceNumber}
                  onChange={e => setFormData({...formData, referenceNumber: e.target.value})}
                  className={`w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-mono ${isGenerating ? 'animate-pulse' : ''}`}
                  placeholder={type === 'skse' ? '1 Tahun 2026' : '001/TU/2026'}
                />
                {isGenerating && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={12} className="animate-spin text-blue-500" />
                  </div>
                )}
              </div>
              {(type === 'outgoing' || type === 'skse') && !mail && (
                <p className="text-[9px] text-blue-600 font-bold mt-1 uppercase tracking-tighter italic">Generated Otomatis</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal *</label>
              <input 
                required
                type="date" 
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{type === 'incoming' ? 'Asal / Pengirim' : (type === 'skse' ? 'Instansi / Penerbit' : 'Tujuan / Penerima')} *</label>
              <input 
                required
                type="text" 
                value={type === 'incoming' ? formData.sender : (type === 'skse' ? formData.sender : formData.recipient)}
                onChange={e => setFormData({...formData, [type === 'incoming' || type === 'skse' ? 'sender' : 'recipient']: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Klasifikasi *</label>
              <div className="relative">
                <select 
                  required
                  value={formData.categoryId}
                  onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm appearance-none pr-10"
                >
                  {filteredCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                  {type === 'skse' && filteredCategories.length === 0 && (
                    <option disabled value="">Tambahkan Kategori SK/SE di Pengaturan</option>
                  )}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ringkasan Dokumen</label>
              <textarea 
                rows={3}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm resize-none"
                placeholder="Tuliskan ringkasan singkat isi surat..."
              />
            </div>

            <div className="md:col-span-2 border-2 border-dashed border-slate-100 rounded-xl p-6 bg-slate-50/30">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <Upload size={14} /> Upload Digital File
                </label>
                {file && (
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={12} /> File Siap
                  </span>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="file" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <div className="w-full py-6 bg-white border border-slate-200 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-blue-300 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                      <CloudUpload size={20} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-slate-600">{file ? file.name : 'Pilih berkas untuk diupload otomatis'}</p>
                      <p className="text-[10px] text-slate-400 mt-1">PDF, DOC, atau Gambar (Maks 10MB)</p>
                    </div>
                  </div>
                </div>

                <div className="relative flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Atau Gunakan Tautan</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="url" 
                    value={formData.fileUrl}
                    onChange={e => setFormData({...formData, fileUrl: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="https://cloud.storage/dokumen.pdf"
                    disabled={!!file}
                  />
                </div>
              </div>

              {tokenMissing && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg flex flex-col gap-2">
                  <div className="flex items-start gap-2 text-amber-800">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">Izin Akses Google Drive Diperlukan</p>
                  </div>
                  <button 
                    type="button"
                    onClick={handleDriveConnect}
                    className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest rounded transition-colors"
                  >
                    Izinkan Akses Drive
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex gap-3 pt-4 border-t border-slate-50">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all font-semibold"
            >
              Batal
            </button>
            <button 
              type="submit"
              disabled={loading || uploading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-widest py-2.5 rounded shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {(loading || uploading) && <Loader2 size={14} className="animate-spin" />}
              {uploading ? 'Mengunggah ke Drive...' : (mail ? 'Simpan Perubahan' : 'Arsipkan Data')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
