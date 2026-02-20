# Panduan Setup Supabase untuk Kanban Board

## 1. Buat Project Supabase

### Langkah-langkah:

1. **Buka** [https://supabase.com](https://supabase.com)
2. **Login** atau **Sign Up** jika belum punya akun
3. Klik **"New Project"**
4. Isi form:
   - **Name**: `kanban-board` (atau nama lain)
   - **Database Password**: Buat password kuat (simpan!)
   - **Region**: Pilih terdekat (Singapore untuk Indonesia)
   - **Plan**: Free tier cukup untuk development
5. Klik **"Create new project"**
6. Tunggu ± 2 menit sampai project ready

---

## 2. Ambil Credentials

Setelah project ready:

1. Buka **Settings** (icon gear di sidebar)
2. Klik **API**
3. Copy dan simpan:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6...`

```
┌─────────────────────────────────────────────────────┐
│  Project URL                                        │
│  https://abcdefghijk.supabase.co                    │
│                                                     │
│  anon public                                        │
│  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...           │
└─────────────────────────────────────────────────────┘
```

---

## 3. Buat Database Tables

### 3.1 Buka SQL Editor

1. Klik **SQL Editor** di sidebar kiri
2. Klik **"New query"**

### 3.2 Copy & Paste SQL Berikut

```sql
-- ============================================
-- KANBAN BOARD DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: profiles (User data)
-- ============================================
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: boards (Kanban boards)
-- ============================================
CREATE TABLE boards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL DEFAULT 'My Board',
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: columns (Kolom: To Do, In Progress, etc)
-- ============================================
CREATE TABLE columns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    color TEXT DEFAULT '#667eea',
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: tasks (Task cards)
-- ============================================
CREATE TABLE tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    column_id UUID REFERENCES columns(id) ON DELETE CASCADE NOT NULL,
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date DATE,
    position INTEGER NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: tags (Labels for tasks)
-- ============================================
CREATE TABLE tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#667eea',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: subtasks (Checklist items)
-- ============================================
CREATE TABLE subtasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES (For better performance)
-- ============================================
CREATE INDEX idx_boards_user_id ON boards(user_id);
CREATE INDEX idx_columns_board_id ON columns(board_id);
CREATE INDEX idx_tasks_column_id ON tasks(column_id);
CREATE INDEX idx_tasks_board_id ON tasks(board_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tags_task_id ON tags(task_id);
CREATE INDEX idx_subtasks_task_id ON subtasks(task_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Boards: Users can only manage their own boards
CREATE POLICY "Users can view own boards" ON boards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own boards" ON boards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own boards" ON boards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own boards" ON boards
    FOR DELETE USING (auth.uid() = user_id);

-- Columns: Users manage columns through board ownership
CREATE POLICY "Users can view columns in own boards" ON columns
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM boards WHERE boards.id = columns.board_id AND boards.user_id = auth.uid())
    );

CREATE POLICY "Users can create columns in own boards" ON columns
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM boards WHERE boards.id = columns.board_id AND boards.user_id = auth.uid())
    );

CREATE POLICY "Users can update columns in own boards" ON columns
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM boards WHERE boards.id = columns.board_id AND boards.user_id = auth.uid())
    );

CREATE POLICY "Users can delete columns in own boards" ON columns
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM boards WHERE boards.id = columns.board_id AND boards.user_id = auth.uid())
    );

-- Tasks: Users manage tasks through board ownership
CREATE POLICY "Users can view tasks in own boards" ON tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create tasks in own boards" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update tasks in own boards" ON tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete tasks in own boards" ON tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Tags: Users manage tags through task ownership
CREATE POLICY "Users can view tags on own tasks" ON tags
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM tasks WHERE tasks.id = tags.task_id AND tasks.user_id = auth.uid())
    );

CREATE POLICY "Users can create tags on own tasks" ON tags
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM tasks WHERE tasks.id = tags.task_id AND tasks.user_id = auth.uid())
    );

CREATE POLICY "Users can delete tags on own tasks" ON tags
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM tasks WHERE tasks.id = tags.task_id AND tasks.user_id = auth.uid())
    );

-- Subtasks: Users manage subtasks through task ownership
CREATE POLICY "Users can view subtasks on own tasks" ON subtasks
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid())
    );

CREATE POLICY "Users can create subtasks on own tasks" ON subtasks
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid())
    );

CREATE POLICY "Users can update subtasks on own tasks" ON subtasks
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid())
    );

CREATE POLICY "Users can delete subtasks on own tasks" ON subtasks
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid())
    );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to auto-create default board and columns
CREATE OR REPLACE FUNCTION public.handle_new_user_board()
RETURNS TRIGGER AS $$
DECLARE
    board_id UUID;
BEGIN
    -- Create default board
    INSERT INTO public.boards (user_id, title, is_default)
    VALUES (NEW.id, 'My Kanban Board', TRUE)
    RETURNING id INTO board_id;

    -- Create default columns
    INSERT INTO public.columns (board_id, title, color, position) VALUES
        (board_id, 'To Do', '#e94560', 0),
        (board_id, 'In Progress', '#ffc107', 1),
        (board_id, 'Review', '#00bcd4', 2),
        (board_id, 'Done', '#4caf50', 3),
        (board_id, 'Archive', '#6c757d', 4);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-create board
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
    AFTER INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_board();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON profiles;
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_boards_updated_at ON boards;
CREATE TRIGGER handle_boards_updated_at
    BEFORE UPDATE ON boards
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_tasks_updated_at ON tasks;
CREATE TRIGGER handle_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- ENABLE REALTIME
-- ============================================
-- Run this in SQL Editor to enable realtime for all tables

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE boards;
ALTER PUBLICATION supabase_realtime ADD TABLE columns;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE tags;
ALTER PUBLICATION supabase_realtime ADD TABLE subtasks;
```

### 3.3 Jalankan SQL

1. Paste semua SQL di atas ke SQL Editor
2. Klik **"Run"** atau tekan `Ctrl + Enter`
3. Pastikan tidak ada error

---

## 4. Setup Authentication

### 4.1 Enable Email Auth

1. Klik **Authentication** di sidebar
2. Klik **Providers**
3. Pastikan **Email** sudah **Enabled**
4. (Optional) Matikan **Confirm email** untuk development

### 4.2 Configure URL Settings

1. Klik **Authentication** → **URL Configuration**
2. Set **Site URL**: `http://localhost:5500` (untuk development)
3. Set **Redirect URLs**: tambahkan URL yang diizinkan

---

## 5. Enable Realtime

1. Klik **Database** → **Replication**
2. Pastikan semua tables sudah di-enable untuk realtime:
   - ✅ boards
   - ✅ columns
   - ✅ tasks
   - ✅ tags
   - ✅ subtasks

---

## 6. Database Schema Summary

### Entity Relationship Diagram

```
┌─────────────┐
│   profiles  │
│─────────────│
│ id (PK)     │◄──────────────────────────────────────┐
│ email       │                                       │
│ full_name   │                                       │
│ avatar_url  │                                       │
└─────────────┘                                       │
       │                                              │
       │ 1:N                                          │
       ▼                                              │
┌─────────────┐                                       │
│   boards    │                                       │
│─────────────│                                       │
│ id (PK)     │◄────────────────┐                     │
│ user_id(FK) │                 │                     │
│ title       │                 │                     │
│ description │                 │                     │
└─────────────┘                 │                     │
       │                        │                     │
       │ 1:N                    │                     │
       ▼                        │                     │
┌─────────────┐                 │                     │
│   columns   │                 │                     │
│─────────────│                 │                     │
│ id (PK)     │◄──────┐         │                     │
│ board_id(FK)│       │         │                     │
│ title       │       │         │                     │
│ color       │       │         │                     │
│ position    │       │         │                     │
└─────────────┘       │         │                     │
       │              │         │                     │
       │ 1:N          │         │                     │
       ▼              │         │                     │
┌─────────────┐       │         │                     │
│   tasks     │       │         │                     │
│─────────────│       │         │                     │
│ id (PK)     │◄──────┼─────────┼────────┐            │
│ column_id   │───────┘         │        │            │
│ board_id    │─────────────────┘        │            │
│ user_id     │──────────────────────────┘            │
│ title       │                                       │
│ description │                                       │
│ priority    │                                       │
│ due_date    │                                       │
│ position    │                                       │
│ is_archived │                                       │
└─────────────┘                                       │
       │                                              │
       │─────────────────────┐                        │
       │ 1:N                 │ 1:N                    │
       ▼                     ▼                        │
┌─────────────┐       ┌─────────────┐                 │
│    tags     │       │  subtasks   │                 │
│─────────────│       │─────────────│                 │
│ id (PK)     │       │ id (PK)     │                 │
│ task_id(FK) │       │ task_id(FK) │                 │
│ name        │       │ title       │                 │
│ color       │       │ is_completed│                 │
└─────────────┘       │ position    │                 │
                      └─────────────┘                 │
```

### Table Descriptions

| Table | Deskripsi |
|-------|-----------|
| `profiles` | Data user (auto-create saat signup) |
| `boards` | Board kanban (user bisa punya banyak board) |
| `columns` | Kolom dalam board (To Do, In Progress, dll) |
| `tasks` | Task/kartu dalam kolom |
| `tags` | Label/tag untuk task |
| `subtasks` | Checklist item dalam task |

---

## 7. Next Steps

Setelah setup database selesai, lanjut ke:

1. **Update HTML** - Tambah form login/register
2. **Update JavaScript** - Ganti localStorage dengan Supabase API
3. **Add Realtime** - Subscribe ke perubahan data

---

## Troubleshooting

### Error: "permission denied for table"
- Pastikan RLS policies sudah dijalankan
- Cek user sudah login sebelum query

### Error: "relation already exists"
- Table sudah ada, skip atau DROP dulu

### Realtime tidak bekerja
- Pastikan tables sudah di-add ke publication
- Check di Database → Replication

### Auth tidak redirect
- Cek Site URL di Authentication settings
- Pastikan redirect URL diizinkan
