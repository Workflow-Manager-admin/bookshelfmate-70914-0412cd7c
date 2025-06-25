import { useEffect, useMemo, useRef, useState } from "react";

const COLOR_PRIMARY = "#2563eb";
const COLOR_SECONDARY = "#64748b";
const COLOR_ACCENT = "#fbbf24";

// Types
type BookStatus = "Reading" | "Want to Read" | "Finished";
interface Book {
  id: string; // UUID string
  title: string;
  author: string;
  status: BookStatus;
  progress?: number; // 0-100, only for Reading
  favorite?: boolean;
}

const BOOKS_LOCAL_KEY = "bookshelfmate-books";

// Helper to get books from localStorage
function getBooksStorage(): Book[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOOKS_LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Book[]) : [];
  } catch {
    return [];
  }
}

function saveBooksStorage(books: Book[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BOOKS_LOCAL_KEY, JSON.stringify(books));
}

// Helper: status tab configs
const STATUS_OPTIONS: {
  value: BookStatus;
  label: string;
}[] = [
  { value: "Reading", label: "Reading" },
  { value: "Want to Read", label: "Want to Read" },
  { value: "Finished", label: "Finished" },
];

// UUID simple function
function uuid() {
  // Not cryptographically secure, but fine for demo
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ----- Main Page -----
export default function BookshelfIndex() {
  // State
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedTab, setSelectedTab] = useState<BookStatus>("Reading");
  const [modalOpen, setModalOpen] = useState(false);
  const [editBookId, setEditBookId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Fetch books from localStorage at startup
  useEffect(() => {
    setBooks(getBooksStorage());
  }, []);

  // Save to localStorage when books changes
  useEffect(() => {
    saveBooksStorage(books);
  }, [books]);

  // CRUD handlers
  function addBook(book: Omit<Book, "id">) {
    setBooks((prev) => [{ ...book, id: uuid() }, ...prev]);
  }
  function updateBook(id: string, book: Partial<Omit<Book, "id">>) {
    setBooks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...book } : b))
    );
  }
  function deleteBook(id: string) {
    setBooks((prev) => prev.filter((b) => b.id !== id));
  }

  function openEditModal(bookId: string) {
    setEditBookId(bookId);
    setModalOpen(true);
  }

  function openAddModal() {
    setEditBookId(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditBookId(null);
    // clear form fields if editing, on close
    formRef.current?.reset();
  }

  // Data memoized for perf
  const filteredBooks = useMemo(() => {
    let filtered = books.filter((b) => b.status === selectedTab);
    if (search.trim())
      filtered = filtered.filter(
        (b) =>
          b.title.toLowerCase().includes(search.toLowerCase()) ||
          b.author.toLowerCase().includes(search.toLowerCase())
      );
    return filtered;
  }, [books, selectedTab, search]);

  const editBook =
    editBookId !== null ? books.find((b) => b.id === editBookId) : undefined;

  // ---- JSX ----
  return (
    <main className="bg-white min-h-screen pb-8">
      <BookshelfHeader />
      <section className="max-w-2xl mx-auto px-2">
        {/* Tabs */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center my-4 gap-4">
          <TabSelector
            options={STATUS_OPTIONS}
            value={selectedTab}
            onChange={(v) => {
              setSelectedTab(v as BookStatus);
            }}
          />
          <button
            className="rounded-xl py-2 px-4 bg-[var(--primary)] text-white font-bold shadow-md hover:bg-blue-700 transition-all"
            style={{
              backgroundColor: COLOR_PRIMARY,
            }}
            onClick={openAddModal}
            aria-label="Add book"
          >
            + Add Book
          </button>
        </div>
        {/* Search */}
        <div className="mb-4 flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books by title or author"
            className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-sm"
            style={{
              borderColor: COLOR_SECONDARY,
              '--accent': COLOR_ACCENT,
            } as React.CSSProperties}
          />
          <button
            className={
              "ml-2 px-3 py-2 rounded-lg text-xs bg-gray-200 text-gray-700 hover:bg-gray-300"
            }
            onClick={() => setSearch("")}
            aria-label="Clear search"
          >
            Clear
          </button>
        </div>
        {/* Book list */}
        <BookList
          books={filteredBooks}
          onDelete={deleteBook}
          onEdit={openEditModal}
          onToggleFavorite={(id) =>
            updateBook(id, { favorite: !books.find((b) => b.id === id)?.favorite })
          }
        />
        {/* Modal for add/edit */}
        {modalOpen && (
          <BookModal
            ref={formRef}
            onSubmit={(formBook) => {
              if (editBookId) {
                updateBook(editBookId, formBook);
              } else {
                addBook(formBook as Omit<Book, "id">);
              }
              closeModal();
            }}
            onCancel={closeModal}
            editBook={editBook}
          />
        )}
        {/* Empty state */}
        {filteredBooks.length === 0 && (
          <div className="text-center text-gray-400 mt-10 italic">
            No books found in this category.
          </div>
        )}
        {/* Export option */}
        {books.length > 0 && (
          <div className="flex justify-end mt-6">
            <ExportButton books={books} />
          </div>
        )}
      </section>
    </main>
  );
}

// Header component
function BookshelfHeader() {
  return (
    <header
      className="mx-auto px-4 py-6 mb-2 text-center w-full shadow-sm"
      style={{
        backgroundColor: "#fff",
      }}
    >
      <h1
        className="font-bold text-2xl sm:text-3xl mb-1"
        style={{
          color: COLOR_PRIMARY,
        }}
      >
        Bookshelf Tracker
      </h1>
      <p className="text-gray-500 max-w-xl mx-auto text-sm font-normal">
        Track what you&apos;re reading, want to read, and finished. Your list stays safe in your browser!
      </p>
    </header>
  );
}

// Tabs / Segmented control
function TabSelector({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <nav
      className="flex rounded-lg bg-gray-100 p-1 w-full max-w-md mx-auto shadow-xs"
      aria-label="Book status filter tabs"
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          className={
            "flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all" +
            (value === opt.value
              ? " bg-[var(--primary)] text-white shadow-md"
              : " text-gray-500 hover:bg-gray-200")
          }
          style={
            value === opt.value
              ? {
                  backgroundColor: COLOR_PRIMARY,
                }
              : {}
          }
          tabIndex={value === opt.value ? 0 : -1}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </nav>
  );
}

// Book list display
function BookList({
  books,
  onDelete,
  onEdit,
  onToggleFavorite,
}: {
  books: Book[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  // Responsive: grid on larger, stacked on mobile
  if (books.length === 0) return null;
  return (
    <div
      className="grid gap-4 mt-4"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      }}
    >
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          onDelete={onDelete}
          onEdit={onEdit}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}

// Book card (supports favorite, delete, edit, progress)
function BookCard({
  book,
  onDelete,
  onEdit,
  onToggleFavorite,
}: {
  book: Book;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <div
      className="flex flex-col rounded-2xl bg-white shadow-[0_2px_8px_0_rgba(100,116,139,0.12)] border border-gray-100 p-4 gap-2 relative hover:shadow-lg transition-all"
      style={{
        minHeight: 140,
      }}
    >
      <div className="flex justify-between items-start">
        <h2 className="font-semibold text-lg mb-1 text-gray-800">
          {book.title}
        </h2>
        <button
          onClick={() => onToggleFavorite(book.id)}
          aria-label={book.favorite ? "Unmark as favorite" : "Mark as favorite"}
          className="transition-all"
        >
          <span
            style={{
              color: book.favorite ? COLOR_ACCENT : "#cbd5e1",
              fontSize: 22,
              transition: "color 0.2s",
            }}
            title={book.favorite ? "Favorite" : "Mark as favorite"}
          >
            ★
          </span>
        </button>
      </div>
      <div className="text-sm text-gray-500 mb-1 font-medium flex items-center gap-2">
        {book.author}
        <span
          className={
            "inline-block text-xs font-semibold rounded px-2 py-0.5"
          }
          style={{
            backgroundColor: "#f1f5f9",
            color:
              book.status === "Reading"
                ? COLOR_PRIMARY
                : book.status === "Want to Read"
                ? COLOR_SECONDARY
                : "#047857", // green for Finished
          }}
        >
          {book.status}
        </span>
      </div>
      {book.status === "Reading" && typeof book.progress === "number" ? (
        <ProgressBar value={book.progress} />
      ) : null}
      {/* Card Controls */}
      <div className="flex gap-2 mt-auto pt-1">
        <button
          className="flex-1 py-1 px-2 rounded-lg bg-gray-100 text-sm text-gray-600 font-medium hover:bg-[var(--primary)] hover:text-white transition"
          style={{ "--primary": COLOR_PRIMARY } as React.CSSProperties}
          onClick={() => onEdit(book.id)}
          aria-label="Edit"
        >
          Edit
        </button>
        <button
          className="flex-1 py-1 px-2 rounded-lg text-sm bg-gray-100 text-red-500 font-medium hover:bg-red-50 hover:text-red-600 transition"
          onClick={() => {
            if (
              confirm(`Remove "${book.title}" by ${book.author}? This cannot be undone.`)
            )
              onDelete(book.id);
          }}
          aria-label="Delete"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// Book Add/Edit Modal (with form)
const DEFAULT_PROGRESS = 0;

const BookModal = Object.assign(
  function BookModalComp(
    {
      onSubmit,
      onCancel,
      editBook,
    }: {
      onSubmit: (book: Omit<Book, "id" | "favorite"> & { favorite?: boolean }) => void;
      onCancel: () => void;
      editBook?: Book;
    },
    ref: React.Ref<HTMLFormElement>
  ) {
    const [title, setTitle] = useState(editBook?.title || "");
    const [author, setAuthor] = useState(editBook?.author || "");
    const [status, setStatus] = useState<BookStatus>(editBook?.status || "Reading");
    const [progress, setProgress] = useState<number>(
      typeof editBook?.progress === "number" ? editBook.progress : DEFAULT_PROGRESS
    );
    const [favorite, setFavorite] = useState(editBook?.favorite || false);

    // Reset fields if changing editBook
    useEffect(() => {
      setTitle(editBook?.title || "");
      setAuthor(editBook?.author || "");
      setStatus(editBook?.status || "Reading");
      setProgress(
        typeof editBook?.progress === "number" ? editBook.progress : DEFAULT_PROGRESS
      );
      setFavorite(editBook?.favorite || false);
    }, [editBook]);

    function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!title.trim() || !author.trim()) {
        alert("Please fill in both the title and author.");
        return;
      }
      onSubmit({
        title: title.trim(),
        author: author.trim(),
        status,
        progress: status === "Reading" ? progress : undefined,
        favorite,
      });
    }

    return (
      <div className="fixed inset-0 z-30 bg-black bg-opacity-30 flex items-center justify-center px-2">
        <form
          ref={ref}
          className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full flex flex-col gap-4 border border-gray-100"
          onSubmit={handleSubmit}
        >
          <h2 className="text-lg font-semibold mb-2" style={{ color: COLOR_PRIMARY }}>
            {editBook ? "Edit Book" : "Add Book"}
          </h2>
          <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
            Title<span className="text-red-400">*</span>
            <input
              type="text"
              required
              className="rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{
                borderColor: COLOR_SECONDARY,
                "--accent": COLOR_ACCENT,
              } as React.CSSProperties}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
            Author<span className="text-red-400">*</span>
            <input
              type="text"
              required
              className="rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{
                borderColor: COLOR_SECONDARY,
                "--accent": COLOR_ACCENT,
              } as React.CSSProperties}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
            Status
            <select
              value={status}
              className="rounded-md bg-gray-100 border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{
                borderColor: COLOR_SECONDARY,
                "--accent": COLOR_ACCENT,
              } as React.CSSProperties}
              onChange={(e) => {
                setStatus(e.target.value as BookStatus);
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {/* Progress for Reading */}
          {status === "Reading" && (
            <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
              Progress ({progress}%)
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="accent-[var(--primary)]"
                style={
                  {
                    "--primary": COLOR_PRIMARY,
                  } as React.CSSProperties
                }
              />
              <div className="text-xs text-gray-500">{progress}% complete</div>
            </label>
          )}
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1 ml-1">
            <input
              type="checkbox"
              className="accent-[var(--accent)] rounded"
              checked={!!favorite}
              onChange={() => setFavorite((v) => !v)}
              style={{ "--accent": COLOR_ACCENT } as React.CSSProperties}
            />
            Mark as Favorite
          </label>
          <div className="flex gap-2 justify-end pt-3">
            <button
              type="button"
              className="py-2 px-4 rounded-lg text-gray-500 bg-gray-100 hover:bg-gray-200 font-medium transition"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-4 rounded-lg bg-[var(--primary)] text-white font-semibold shadow-md hover:bg-blue-700 transition"
              style={{ backgroundColor: COLOR_PRIMARY }}
            >
              {editBook ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    );
  },
  { displayName: "BookModal" }
);

// Progress bar component
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-lg h-3 mt-1 mb-2">
      <div
        className="rounded-lg h-3 transition-all"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background:
            "linear-gradient(90deg, #fbbf24 0%, #2563eb 95%)",
        }}
      ></div>
    </div>
  );
}

// Export books button (to JSON)
function ExportButton({ books }: { books: Book[] }) {
  function exportBooks() {
    const str = JSON.stringify(books, null, 2);
    const url = URL.createObjectURL(
      new Blob([str], { type: "application/json" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookshelf_export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  return (
    <button
      className="rounded-lg px-4 py-2 bg-[var(--accent)] text-white text-sm font-bold shadow hover:bg-yellow-500 transition"
      style={{
        backgroundColor: COLOR_ACCENT,
      }}
      onClick={exportBooks}
      aria-label="Export book list"
    >
      Export as JSON
    </button>
  );
}
