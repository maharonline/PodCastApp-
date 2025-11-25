import RNFS from 'react-native-fs';
import { Platform, Alert } from 'react-native';

export interface DownloadProgress {
    bytesWritten: number;
    contentLength: number;
    progress: number; // 0-1
}

export const DownloadService = {
    /**
     * Get the download directory path based on platform
     */
    getDownloadDirectory(): string {
        return Platform.OS === 'ios'
            ? RNFS.DocumentDirectoryPath
            : RNFS.DownloadDirectoryPath;
    },

    /**
     * Generate a safe filename from episode title
     */
    getSafeFilename(title: string, audioUrl: string): string {
        // Extract file extension from URL or default to .mp3
        const urlParts = audioUrl.split('.');
        const extension = urlParts.length > 1 ? `.${urlParts[urlParts.length - 1].split('?')[0]}` : '.mp3';

        // Clean title for filename
        const cleanTitle = title
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase()
            .substring(0, 50); // Limit length

        return `${cleanTitle}${extension}`;
    },

    /**
     * Get full file path for a download
     */
    getFilePath(filename: string): string {
        return `${this.getDownloadDirectory()}/${filename}`;
    },

    /**
     * Check if a file is already downloaded
     */
    async isDownloaded(filename: string): Promise<boolean> {
        try {
            const filePath = this.getFilePath(filename);
            return await RNFS.exists(filePath);
        } catch (error) {
            console.error('Error checking if file exists:', error);
            return false;
        }
    },

    /**
     * Download audio file with progress tracking
     */
    async downloadAudio(
        audioUrl: string,
        episodeTitle: string,
        onProgress?: (progress: DownloadProgress) => void
    ): Promise<string> {
        try {
            const filename = this.getSafeFilename(episodeTitle, audioUrl);
            const filePath = this.getFilePath(filename);

            // Check if already downloaded
            const exists = await this.isDownloaded(filename);
            if (exists) {
                console.log('File already downloaded:', filename);
                return filePath;
            }

            console.log('Starting download:', audioUrl, '-> ', filePath);

            // Start download
            const downloadResult = RNFS.downloadFile({
                fromUrl: audioUrl,
                toFile: filePath,
                progress: (res) => {
                    if (onProgress) {
                        onProgress({
                            bytesWritten: res.bytesWritten,
                            contentLength: res.contentLength,
                            progress: res.bytesWritten / res.contentLength,
                        });
                    }
                },
            });

            const result = await downloadResult.promise;

            if (result.statusCode === 200) {
                console.log('Download complete:', filePath);
                return filePath;
            } else {
                throw new Error(`Download failed with status code: ${result.statusCode}`);
            }
        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    },

    /**
     * Delete a downloaded file
     */
    async deleteDownload(filename: string): Promise<void> {
        try {
            const filePath = this.getFilePath(filename);
            const exists = await RNFS.exists(filePath);

            if (exists) {
                await RNFS.unlink(filePath);
                console.log('File deleted:', filePath);
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    },

    /**
     * Get all downloaded files
     */
    async getDownloadedFiles(): Promise<string[]> {
        try {
            const downloadDir = this.getDownloadDirectory();
            const files = await RNFS.readDir(downloadDir);

            // Filter for audio files
            return files
                .filter(file => file.isFile() && (file.name.endsWith('.mp3') || file.name.endsWith('.m4a')))
                .map(file => file.name);
        } catch (error) {
            console.error('Error reading download directory:', error);
            return [];
        }
    },

    /**
     * Get file size in MB
     */
    async getFileSize(filename: string): Promise<number> {
        try {
            const filePath = this.getFilePath(filename);
            const stat = await RNFS.stat(filePath);
            return parseFloat((stat.size / (1024 * 1024)).toFixed(2)); // MB
        } catch (error) {
            console.error('Error getting file size:', error);
            return 0;
        }
    },
};
