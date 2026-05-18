import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Mail, Category } from '../types';
import { Inbox, Send, Bookmark, Clock, ArrowUpRight, ArrowDownRight, Activity, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard({ searchQuery }: { searchQuery: string }) {
  const [mails, setMails] = useState<Mail[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qMails = query(collection(db, 'mails'), orderBy('createdAt', 'desc'));
    const unsubscribeMails = onSnapshot(qMails, (snapshot) => {
      setMails(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mail)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'mails'));

    const qCats = query(collection(db, 'categories'));
    const unsubscribeCats = onSnapshot(qCats, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'categories'));

    return () => {
      unsubscribeMails();
      unsubscribeCats();
    };
  }, []);

  const stats = {
    incoming: mails.filter(m => m.type === 'incoming').length,
    outgoing: mails.filter(m => m.type === 'outgoing').length,
    categories: categories.length,
    today: mails.filter(m => {
      const today = new Date();
      const d = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
      return d.toDateString() === today.toDateString();
    }).length
  };

  const chartData = categories.slice(0, 5).map(cat => ({
    name: cat.name,
    count: mails.filter(m => m.categoryId === cat.id).length
  })).sort((a, b) => b.count - a.count);

  const filteredMails = mails.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.sender?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.recipient?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Surat Masuk" 
          value={stats.incoming.toLocaleString()} 
          subText="842" 
          type="incoming"
        />
        <StatCard 
          label="Surat Keluar" 
          value={stats.outgoing.toLocaleString()} 
          subText="442"
          type="outgoing"
        />
        <StatCard 
          label="Total Kategori" 
          value={stats.categories.toString()} 
          subText="Aktif"
          type="categories"
        />
        <StatCard 
          label="Hari Ini" 
          value={stats.today.toString()} 
          subText="Entri baru"
          type="today"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Voume Arsip per Kategori</h3>
            <p className="text-xs text-slate-400 mt-0.5">5 Kategori dengan volume tertinggi</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]} barSize={32}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Aktivitas Terakhir</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredMails.length > 0 ? filteredMails.map(mail => (
              <div key={mail.id} className="flex gap-3 p-3 rounded-lg hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-xs font-bold ${
                  mail.type === 'incoming' ? 'bg-blue-50 text-blue-600' : 
                  mail.type === 'outgoing' ? 'bg-emerald-50 text-emerald-600' :
                  'bg-purple-50 text-purple-600'
                }`}>
                  {mail.type === 'incoming' ? 'IN' : (mail.type === 'outgoing' ? 'OT' : 'SK')}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{mail.title}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{mail.referenceNumber}</p>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12">
                <Inbox size={32} className="mb-2 opacity-20" />
                <p className="text-xs font-medium italic">Belum ada arsip baru</p>
              </div>
            )}
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
            <button className="w-full py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">Lihat Seluruh Aktivitas</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subText, type }: { label: string, value: string, subText: string, type: string }) {
  const colorClass = 
    type === 'incoming' ? 'text-blue-600' : 
    type === 'outgoing' ? 'text-emerald-500' : 
    type === 'categories' ? 'text-amber-500' : 
    'text-purple-500';

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 transition-all">
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${colorClass.replace('text-', 'text-opacity-80 text-')}`}>{label}</p>
      <p className="text-2xl font-bold text-slate-800 tabular-nums tracking-tight">{value}</p>
      <p className="text-[10px] text-slate-400 mt-1 font-medium">{subText}</p>
    </div>
  );
}

function PlusIcon() { return <Plus size={14} />; }
