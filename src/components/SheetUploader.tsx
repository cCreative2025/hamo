'use client';

import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { LoadingSpinner } from './LoadingSpinner';
import { formatFileSize } from '@/lib/utils';

interface SheetUploaderProps {
  onUpload: (file: File, sheetData: SheetUploadData) => Promise<void>;
  isLoading?: boolean;
}

export interface SheetUploadData {
  title: string;
  artist?: string;
  genre?: string;
  key?: string;
  tempo?: number;
  time_signature?: string;
}

export const SheetUploader: React.FC<SheetUploaderProps> = ({ onUpload, isLoading }) => {
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<SheetUploadData>({
    title: '',
    artist: '',
    genre: '',
    key: '',
    tempo: undefined,
    time_signature: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      // 파일명을 제목으로 설정
      setFormData((prev) => ({
        ...prev,
        title: e.target.files![0].name.split('.')[0],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('파일을 선택해주세요');
      return;
    }
    if (!formData.title.trim()) {
      alert('악보 제목을 입력해주세요');
      return;
    }

    try {
      await onUpload(file, formData);
      // 폼 초기화
      setFile(null);
      setFormData({ title: '', artist: '', genre: '', key: '', tempo: undefined, time_signature: '' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-neutral-200 p-6">
      <h3 className="text-lg font-semibold text-neutral-900 mb-6">악보 업로드</h3>

      {/* File Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          파일 선택 (PDF, 이미지)
        </label>
        <div
          className="relative border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) {
              handleFileSelect({
                target: { files: e.dataTransfer.files },
              } as any);
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {file ? (
            <div>
              <p className="text-sm font-medium text-neutral-900 mb-1">선택된 파일:</p>
              <p className="text-xs text-neutral-600">{file.name}</p>
              <p className="text-xs text-neutral-500 mt-1">({formatFileSize(file.size)})</p>
            </div>
          ) : (
            <div>
              <svg
                className="mx-auto h-12 w-12 text-neutral-400 mb-2"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-8-12l-4-4m0 0L20 8m4 0v12m0 0H12"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-sm font-medium text-neutral-900 mb-1">
                클릭하여 파일을 선택하세요
              </p>
              <p className="text-xs text-neutral-500">또는 드래그 앤 드롭</p>
            </div>
          )}
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="악보 제목"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            아티스트
          </label>
          <input
            type="text"
            value={formData.artist}
            onChange={(e) => setFormData((prev) => ({ ...prev, artist: e.target.value }))}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="아티스트명"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            장르
          </label>
          <input
            type="text"
            value={formData.genre}
            onChange={(e) => setFormData((prev) => ({ ...prev, genre: e.target.value }))}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="장르"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            키
          </label>
          <input
            type="text"
            value={formData.key}
            onChange={(e) => setFormData((prev) => ({ ...prev, key: e.target.value }))}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="예: C Major"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            템포 (BPM)
          </label>
          <input
            type="number"
            value={formData.tempo || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                tempo: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="예: 120"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            박자
          </label>
          <input
            type="text"
            value={formData.time_signature}
            onChange={(e) => setFormData((prev) => ({ ...prev, time_signature: e.target.value }))}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="예: 4/4"
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        fullWidth
        isLoading={isLoading}
        disabled={!file || !formData.title.trim()}
      >
        업로드
      </Button>
    </form>
  );
};
