import type { ColumnMapping, FileFormatSummary } from '@/features/file-formats/types';
import { apiRequest } from '@/lib/apiClient';

export const importProfilesQueryKey = ['import-profiles'] as const;

type ImportProfileApiRecord = {
  id: string;
  profile_name: string;
  source_file: string;
  sheet_name: string;
  header_row_index: number;
  data_start_row_index: number;
  created_at: string;
};

type ImportProfilesResponse = {
  data: ImportProfileApiRecord[];
};

type CreateImportProfileRequest = {
  profileName: string;
  sourceFile: string;
  sheetName: string;
  headerRowIndex: number;
  dataStartRowIndex: number;
  columnMapping: ColumnMapping;
  currency: {
    mode: 'column' | 'fixed';
    fixedValue: string | null;
  };
  sampleRows: string[][];
};

type CreateImportProfileResponse = {
  data: ImportProfileApiRecord;
};

function mapImportProfile(record: ImportProfileApiRecord): FileFormatSummary {
  return {
    id: record.id,
    profileName: record.profile_name,
    sourceFile: record.source_file,
    sheetName: record.sheet_name,
    headerRowIndex: record.header_row_index,
    dataStartRowIndex: record.data_start_row_index,
    createdAt: record.created_at
  };
}

export async function fetchImportProfiles(): Promise<FileFormatSummary[]> {
  const response = await apiRequest<ImportProfilesResponse>('/api/v1/import-profiles');
  return response.data.map(mapImportProfile);
}

export async function createImportProfile(payload: CreateImportProfileRequest): Promise<FileFormatSummary> {
  const response = await apiRequest<CreateImportProfileResponse>('/api/v1/import-profiles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return mapImportProfile(response.data);
}
