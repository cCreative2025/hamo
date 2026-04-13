import React from 'react';
import { Sheet } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from './Button';

interface SheetCardProps {
  sheet: Sheet;
  onSelect: (sheet: Sheet) => void;
  onDelete?: (sheetId: string) => void;
  onUploadVersion?: (sheetId: string) => void;
}

export const SheetCard: React.FC<SheetCardProps> = ({
  sheet,
  onSelect,
  onDelete,
  onUploadVersion,
}) => {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow">
      {/* Sheet Info */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 mb-1">{sheet.title}</h3>
        <p className="text-sm text-neutral-600 mb-2">{sheet.artist}</p>

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 mb-3">
          {sheet.genre && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
              {sheet.genre}
            </span>
          )}
          {sheet.key && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
              {sheet.key}
            </span>
          )}
          {sheet.tempo && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
              {sheet.tempo} BPM
            </span>
          )}
        </div>

        {/* Date */}
        <p className="text-xs text-neutral-500">
          생성일: {formatDate(sheet.created_at)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={() => onSelect(sheet)}
          fullWidth
        >
          선택
        </Button>
        {onUploadVersion && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onUploadVersion(sheet.id)}
          >
            업로드
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => onDelete(sheet.id)}
          >
            삭제
          </Button>
        )}
      </div>
    </div>
  );
};
