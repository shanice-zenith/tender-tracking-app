import { googleAuthService } from './googleAuthService';

export const googleDriveService = {
  /**
   * Uploads a file directly to Google Drive using the REST API.
   * Returns the shareable webViewLink (Google Drive URL).
   */
  async uploadFile(file: File): Promise<string> {
    const accessToken = googleAuthService.getAccessToken();
    if (!accessToken) {
      throw new Error('Google Access Token is missing. Please sign in to Google.');
    }

    const metadata = {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', file);

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Drive upload failed:', errorText);
      if (response.status === 401) {
        googleAuthService.signOut();
        throw new Error('Your Google session has expired. Please sign in again.');
      }
      throw new Error(`Failed to upload to Google Drive: ${response.statusText}`);
    }

    const data = await response.json();
    
    // We can also adjust sharing permissions to anyone with link, but typically 
    // the Drive default or user's workspace settings are sufficient.
    return data.webViewLink;
  }
};
