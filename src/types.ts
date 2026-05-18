export type MailType = 'incoming' | 'outgoing' | 'skse'; // SK = Surat Keputusan, SE = Surat Edaran

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
  deletionRequested?: boolean;
  deletionRequestedBy?: string;
  deletionRequestedAt?: any;
  createdAt: any;
  updatedAt: any;
}
