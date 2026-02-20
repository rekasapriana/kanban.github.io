# Kanban Board Pro

Aplikasi Kanban Board modern dengan fitur lengkap menggunakan HTML, CSS, JavaScript, dan SortableJS.

## Struktur File

```
kanban/
├── index.html      # Struktur HTML
├── style.css       # Styling dengan CSS Variables
├── script.js       # Logic JavaScript
└── FEATURES.md     # Dokumentasi fitur
```

## Daftar Fitur

### 1. Core Features

| Fitur | Deskripsi |
|-------|-----------|
| **Drag & Drop** | Pindahkan task antar kolom dengan drag |
| **4+1 Kolom** | To Do, In Progress, Review, Done, Archive |
| **Task Counter** | Jumlah task per kolom (real-time) |
| **Local Storage** | Data tersimpan otomatis di browser |

### 2. Due Date & Warning

| Fitur | Deskripsi |
|-------|-----------|
| **Date Picker** | Pilih tanggal deadline |
| **Smart Display** | Today, Tomorrow, X days left, Overdue |
| **Overdue Warning** | Border merah berkedip untuk task melewati deadline |
| **Today Highlight** | Tanggal hari ini berwarna kuning |

### 3. Subtasks/Checklist

| Fitur | Deskripsi |
|-------|-----------|
| **Add Subtasks** | Tambah item checklist ke task |
| **Checkbox** | Centang subtask yang selesai |
| **Progress Bar** | Visual progress subtask |
| **Counter** | X/Y subtasks completed |

### 4. Export/Import JSON

| Fitur | Deskripsi |
|-------|-----------|
| **Export** | Download backup data ke file JSON |
| **Import** | Upload file JSON untuk restore data |
| **Auto-naming** | Format: `kanban-backup-YYYY-MM-DD.json` |

### 5. Statistics Dashboard

| Fitur | Deskripsi |
|-------|-----------|
| **Task Count** | Jumlah task per kolom |
| **Overall Progress** | Persentase task di Done |
| **Priority Chart** | Bar chart task per prioritas |
| **Toggle Panel** | Buka/tutup panel statistik |

### 6. Tags/Labels System

| Fitur | Deskripsi |
|-------|-----------|
| **Custom Tags** | Buat label sesuai kebutuhan |
| **Multi-tags** | Satu task bisa punya banyak tag |
| **Search by Tag** | Cari task berdasarkan tag |
| **Visual Labels** | Tag berwarna di task card |

### 7. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | New Task - buat task baru |
| `S` | Toggle Statistics panel |
| `T` | Toggle Theme (dark/light) |
| `?` | Show Keyboard Shortcuts |
| `Del` / `Backspace` | Delete selected task |
| `Esc` | Close modal/panel |

### 8. Dark/Light Mode

| Fitur | Deskripsi |
|-------|-----------|
| **Theme Toggle** | Tombol moon/sun di header |
| **CSS Variables** | Warna otomatis berubah |
| **Persist Theme** | Theme tersimpan di localStorage |
| **Smooth Transition** | Animasi pergantian tema |

### 9. Archive System

| Fitur | Deskripsi |
|-------|-----------|
| **Archive Task** | Pindahkan task ke Archive |
| **Restore Task** | Kembalikan task ke To Do |
| **Separate Column** | Archive terpisah dari workflow utama |
| **Auto-hide** | Kolom archive tersembunyi di mobile |

### 10. Priority System

| Level | Warna | Indikator |
|-------|-------|-----------|
| **High** | Merah | Border kiri merah, badge merah |
| **Medium** | Kuning | Border kiri kuning, badge kuning |
| **Low** | Hijau | Border kiri hijau, badge hijau |

### 11. UI/UX Features

| Fitur | Deskripsi |
|-------|-----------|
| **Responsive Design** | Optimal di desktop, tablet, mobile |
| **Glassmorphism** | Efek blur modern |
| **Toast Notification** | Feedback untuk setiap aksi |
| **Empty State** | Tampilan saat kolom kosong |
| **Hover Effects** | Animasi smooth saat hover |
| **Color-coded Columns** | Warna berbeda per kolom |

## Cara Penggunaan

### Menjalankan Aplikasi
```bash
# Buka di browser
start C:/aku/kanban/index.html

# Atau dengan live server
npx live-server C:/aku/kanban
```

### Operasi Task

| Aksi | Cara |
|------|------|
| **Tambah Task** | Klik "Add Task" atau tekan `N` |
| **Edit Task** | Klik tombol pensil saat hover |
| **Hapus Task** | Klik tombol trash atau tekan `Del` |
| **Archive Task** | Klik tombol archive |
| **Move Task** | Drag & drop ke kolom lain |
| **Select Task** | Klik task (outline merah) |

### Form Task

```
┌─────────────────────────────────────┐
│ Task Title: [________________]      │
│ Priority:   [Medium ▼]              │
│ Due Date:   [📅 Select date]        │
│ Tags:       [tag1 ×] [tag2 ×] [___] │
│ Description: [__________________]   │
│                                     │
│ Subtasks:                           │
│ ☑ Subtask 1                    [×]  │
│ ☐ Subtask 2                    [×]  │
│ [Add subtask...]              [+]   │
│                                     │
│         [Cancel]  [Add Task]        │
└─────────────────────────────────────┘
```

## Dependencies (CDN)

| Library | Version | Fungsi |
|---------|---------|--------|
| SortableJS | 1.15.0 | Drag & drop |
| Font Awesome | 6.4.0 | Icons |

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Tips & Tricks

1. **Quick Add**: Tekan `N` untuk buka form task baru
2. **Bulk Archive**: Drag multiple tasks ke Archive
3. **Backup**: Export JSON sebelum clear browser data
4. **Search**: Cari berdasarkan judul atau tag
5. **Mobile**: Swipe horizontal untuk lihat semua kolom

---

Dibuat dengan HTML, CSS, JavaScript vanilla + SortableJS
