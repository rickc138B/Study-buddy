export type MaterialType = 'syllabus' | 'slides' | 'past_exam' | 'notes' | 'other';
export type IngestStatus  = 'pending' | 'processing' | 'completed' | 'failed';

export interface CourseMaterial {
  id:            string;
  course_id:     string;
  filename:      string;
  file_type:     MaterialType;
  mime_type:     string | null;
  file_size:     number | null;
  storage_path:  string;
  status:        IngestStatus;
  chunk_count:   number | null;
  error_message: string | null;
  uploaded_at:   Date;
  processed_at:  Date | null;
}

export interface ChunkMetadata {
  page?:        number;
  source_file:  string;
  topic_hint?:  string;
}

export interface CourseChunk {
  id:           string;
  course_id:    string;
  material_id:  string;
  content:      string;
  chunk_index:  number;
  metadata:     ChunkMetadata;
}

export class UploadMaterialDto {
  courseId:   string;
  fileType:   MaterialType;
}

export interface ChunkOptions {
  maxTokens:     number;
  overlapTokens: number;
}

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = {
  maxTokens:     500,
  overlapTokens:  50,
};
