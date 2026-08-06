'use client';

import React, { useState, useRef } from 'react';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  label?: string;
}

export default function FileUpload({ onUpload, accept = 'image/*', label = 'Upload Image' }: FileUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      await onUpload(file);
      setSuccess(true);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <label className="block mb-2 text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={isLoading}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          <div className="text-center">
            <svg
              className="w-8 h-8 text-blue-600 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              {isLoading ? 'Uploading...' : 'Click or drag to upload'}
            </span>
          </div>
        </label>
      </div>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      {success && <p className="text-green-600 text-sm mt-2">Upload successful!</p>}
    </div>
  );
}
