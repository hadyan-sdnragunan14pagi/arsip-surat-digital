export type MailType = 'incoming' | 'outgoing';

export interface Category {
  id: string;
  name: string;
  code?: string;
  description?: string;
  createdAt: any;
}

export interface Mail {
  id: string;
  title: string;
  description?: string;
  sender?: string;
  recipient?: string;
  referenceNumber: string; // Nomor Surat
  date: string; // Tanggal Surat
  categoryId: string;
  type: MailType;
  fileUrl?: string;
  creatorId: string;
  createdAt: any;
  updatedAt: any;
}
