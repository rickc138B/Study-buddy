-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────
-- DEPARTMENTS
-- ─────────────────────────────────────────────
CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. "CS"
  name        VARCHAR(100) NOT NULL,           -- e.g. "Computer Science"
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- COURSES
-- ─────────────────────────────────────────────
CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id   UUID         NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  code            VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. "CS301"
  title           VARCHAR(200) NOT NULL,
  level           SMALLINT     NOT NULL CHECK (level IN (100,200,300,400,500)),
  description     TEXT,
  prerequisites   TEXT[],                          -- array of course codes
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_courses_department  ON courses(department_id);
CREATE INDEX idx_courses_level       ON courses(level);

-- ─────────────────────────────────────────────
-- COURSE MATERIALS  (uploaded source files)
-- ─────────────────────────────────────────────
CREATE TYPE material_type AS ENUM ('syllabus', 'slides', 'past_exam', 'notes', 'other');
CREATE TYPE ingest_status  AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE course_materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID            NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  filename      VARCHAR(255)    NOT NULL,
  file_type     material_type   NOT NULL DEFAULT 'other',
  mime_type     VARCHAR(100),
  file_size     INTEGER,                       -- bytes
  storage_path  TEXT            NOT NULL,      -- local path or object storage key
  status        ingest_status   NOT NULL DEFAULT 'pending',
  chunk_count   INTEGER,
  error_message TEXT,
  uploaded_at   TIMESTAMPTZ     NOT NULL DEFAULT now(),
  processed_at  TIMESTAMPTZ
);

CREATE INDEX idx_materials_course   ON course_materials(course_id);
CREATE INDEX idx_materials_status   ON course_materials(status);

-- ─────────────────────────────────────────────
-- COURSE CHUNKS  (embedded knowledge units)
-- ─────────────────────────────────────────────
CREATE TABLE course_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID            NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  material_id   UUID            NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
  content       TEXT            NOT NULL,
  embedding     vector(1536),                  -- text-embedding-3-small dimensions
  chunk_index   INTEGER         NOT NULL,      -- position within the material
  metadata      JSONB           NOT NULL DEFAULT '{}',
  -- metadata shape: { page?: number, source_file: string, topic_hint?: string }
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_chunks_course    ON course_chunks(course_id);
CREATE INDEX idx_chunks_material  ON course_chunks(material_id);

-- IVFFlat index for fast approximate nearest-neighbour search
-- lists = sqrt(total_rows) is a good rule of thumb; start with 100
CREATE INDEX idx_chunks_embedding ON course_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─────────────────────────────────────────────
-- RETRIEVAL HELPER FUNCTION
-- ─────────────────────────────────────────────
-- Returns the top-k chunks for a course scoped similarity search.
-- Call this from NestJS instead of building the query in app code.
CREATE OR REPLACE FUNCTION match_course_chunks(
  p_course_id   UUID,
  p_embedding   vector(1536),
  p_match_count INT     DEFAULT 6,
  p_threshold   FLOAT   DEFAULT 0.70   -- cosine similarity floor (0–1)
)
RETURNS TABLE (
  id          UUID,
  content     TEXT,
  metadata    JSONB,
  similarity  FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    cc.id,
    cc.content,
    cc.metadata,
    1 - (cc.embedding <=> p_embedding) AS similarity
  FROM course_chunks cc
  WHERE
    cc.course_id = p_course_id
    AND cc.embedding IS NOT NULL
    AND 1 - (cc.embedding <=> p_embedding) >= p_threshold
  ORDER BY cc.embedding <=> p_embedding
  LIMIT p_match_count;
$$;
