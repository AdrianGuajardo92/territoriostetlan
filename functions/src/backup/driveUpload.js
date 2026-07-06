import { Readable } from 'node:stream';
import { google } from 'googleapis';

export const DEFAULT_DRIVE_FOLDER_ID = '1uMpc1_nqXHyJLL2cler63hcxhFZJO8Fj';

function getDriveClient(serviceAccountJson) {
  const credentials = JSON.parse(serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
}

async function findFileInFolder(drive, folderId, fileName) {
  const query = [
    `'${folderId}' in parents`,
    `name = '${fileName.replace(/'/g, "\\'")}'`,
    'trashed = false',
  ].join(' and ');

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name, webViewLink)',
    pageSize: 1,
  });

  return response.data.files?.[0] || null;
}

export async function uploadJsonToDrive({
  serviceAccountJson,
  folderId = DEFAULT_DRIVE_FOLDER_ID,
  fileName,
  jsonContent,
}) {
  const drive = getDriveClient(serviceAccountJson);
  const media = {
    mimeType: 'application/json',
    body: Readable.from(Buffer.from(jsonContent, 'utf8')),
  };

  const existing = await findFileInFolder(drive, folderId, fileName);

  if (existing?.id) {
    const updated = await drive.files.update({
      fileId: existing.id,
      media,
      fields: 'id, name, webViewLink',
    });

    return {
      fileId: updated.data.id,
      fileName: updated.data.name,
      webViewLink: updated.data.webViewLink,
      replaced: true,
    };
  }

  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/json',
    },
    media,
    fields: 'id, name, webViewLink',
  });

  return {
    fileId: created.data.id,
    fileName: created.data.name,
    webViewLink: created.data.webViewLink,
    replaced: false,
  };
}
