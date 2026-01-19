"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Plus,
  Search,
  Folder,
  MoreVertical,
  Trash2,
  Edit,
  Loader2,
  Clock,
  Tag,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notesApi } from "@/lib/api";

interface Note {
  id: string;
  title: string;
  content: string;
  folder?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    folder: "",
    tags: "",
  });

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await notesApi.list();
      if (response.success && response.data) {
        setNotes(response.data as Note[]);
      }
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async () => {
    if (!newNote.title || !newNote.content) return;
    try {
      const response = await notesApi.create({
        title: newNote.title,
        content: newNote.content,
        folder: newNote.folder || undefined,
        tags: newNote.tags
          ? newNote.tags.split(",").map((t) => t.trim())
          : undefined,
      });
      if (response.success) {
        fetchNotes();
        setNewNoteOpen(false);
        setNewNote({ title: "", content: "", folder: "", tags: "" });
      }
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  const updateNote = async () => {
    if (!selectedNote) return;
    try {
      const response = await notesApi.update(selectedNote.id, {
        title: selectedNote.title,
        content: selectedNote.content,
      });
      if (response.success) {
        fetchNotes();
        setEditMode(false);
      }
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const response = await notesApi.delete(id);
      if (response.success) {
        fetchNotes();
        if (selectedNote?.id === id) {
          setSelectedNote(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const folders = [...new Set(notes.map((n) => n.folder).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading notes...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Notes
          </h1>
          <p className="text-muted-foreground">Organize your study notes</p>
        </div>
        <Dialog open={newNoteOpen} onOpenChange={setNewNoteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newNote.title}
                  onChange={(e) =>
                    setNewNote({ ...newNote, title: e.target.value })
                  }
                  placeholder="Note title..."
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    Folder (optional)
                  </label>
                  <Input
                    value={newNote.folder}
                    onChange={(e) =>
                      setNewNote({ ...newNote, folder: e.target.value })
                    }
                    placeholder="e.g., Biology"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tags (optional)</label>
                  <Input
                    value={newNote.tags}
                    onChange={(e) =>
                      setNewNote({ ...newNote, tags: e.target.value })
                    }
                    placeholder="e.g., exam, chapter1"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={newNote.content}
                  onChange={(e) =>
                    setNewNote({ ...newNote, content: e.target.value })
                  }
                  placeholder="Write your note..."
                  className="mt-1 min-h-[200px]"
                />
              </div>
              <Button onClick={createNote} className="w-full">
                Create Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 space-y-4"
        >
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="pl-10"
            />
          </div>

          {/* Folders */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Folders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => setSearchQuery("")}
              >
                <FileText className="h-4 w-4" />
                All Notes
                <Badge variant="secondary" className="ml-auto">
                  {notes.length}
                </Badge>
              </Button>
              {folders.map((folder) => (
                <Button
                  key={folder}
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => setSearchQuery(folder || "")}
                >
                  <Folder className="h-4 w-4" />
                  {folder}
                  <Badge variant="secondary" className="ml-auto">
                    {notes.filter((n) => n.folder === folder).length}
                  </Badge>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{notes.length}</p>
                <p className="text-sm text-muted-foreground">Total Notes</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notes List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-4 space-y-3"
        >
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <Card
                key={note.id}
                className={`border-0 shadow-lg cursor-pointer transition-all hover:shadow-xl ${
                  selectedNote?.id === note.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => {
                  setSelectedNote(note);
                  setEditMode(false);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{note.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {note.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </span>
                        {note.folder && (
                          <>
                            <Folder className="h-3 w-3 text-muted-foreground ml-2" />
                            <span className="text-xs text-muted-foreground">
                              {note.folder}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNote(note);
                            setEditMode(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNote(note.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No notes found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery
                    ? "Try a different search term"
                    : "Create your first note to get started"}
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Note Viewer/Editor */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-5"
        >
          {selectedNote ? (
            <Card className="border-0 shadow-xl h-full">
              <CardContent className="p-6">
                {editMode ? (
                  <div className="space-y-4">
                    <Input
                      value={selectedNote.title}
                      onChange={(e) =>
                        setSelectedNote({
                          ...selectedNote,
                          title: e.target.value,
                        })
                      }
                      className="text-xl font-semibold"
                    />
                    <Textarea
                      value={selectedNote.content}
                      onChange={(e) =>
                        setSelectedNote({
                          ...selectedNote,
                          content: e.target.value,
                        })
                      }
                      className="min-h-[400px]"
                    />
                    <div className="flex gap-2">
                      <Button onClick={updateNote}>Save Changes</Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditMode(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">
                          {selectedNote.title}
                        </h2>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(selectedNote.updatedAt).toLocaleString()}
                          </span>
                          {selectedNote.folder && (
                            <span className="flex items-center gap-1">
                              <Folder className="h-4 w-4" />
                              {selectedNote.folder}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMode(true)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                    {selectedNote.tags && selectedNote.tags.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        {selectedNote.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">
                        {selectedNote.content}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-xl h-full flex items-center justify-center">
              <CardContent className="text-center py-16">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Select a note to view
                </h3>
                <p className="text-muted-foreground">
                  Click on a note from the list to view its content
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
