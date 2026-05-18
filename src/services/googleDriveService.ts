import { format } from 'date-fns';

const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

export interface DriveUploadResult {
  id: string;
  webViewLink: string;
  name: string;
}

export async function uploadToDrive(
  file: File,
  accessToken: string,
  categoryName: string,
  mailTitle: string,
  folderId: string
): Promise<DriveUploadResult> {
  const dateStr = format(new Date(), 'yyyyMMdd');
  // Clean up title for filename safety
  const cleanTitle = mailTitle.replace(/[/\\?%*:|"<>]/g, '-').trim();
  const categoryStr = categoryName.replace(/[/\\?%*:|"<>]/g, '-').trim();
  
  const fileName = `${dateStr}_${categoryStr}_${cleanTitle}`;
  const extension = file.name.split('.').pop();
  const finalName = extension ? `${fileName}.${extension}` : fileName;

  const metadata = {
    name: finalName,
    parents: [folderId],
  };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append('file', file);

  const response = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gagal mengunggah ke Google Drive (Status: ${response.status})`);
  }

  const data = await response.json();
  
  return {
    id: data.id,
    webViewLink: `https://drive.google.com/file/d/${data.id}/view?usp=drivesdk`,
    name: finalName
  };
}
