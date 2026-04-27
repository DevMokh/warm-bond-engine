import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Loader2, Plus, Upload, Trash2, ShieldCheck, FileJson, FileSpreadsheet,
  Crown, Search, Pencil, Download, BarChart3, BookOpen, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";

type Difficulty = "easy" | "medium" | "hard";
type Category = { id: string; name_ar: string; slug: string };
type Question = {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  difficulty: Difficulty;
  category_id: string | null;
  is_active: boolean;
  explanation: string | null;
};

const emptyForm = {
  question: "",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  correct_answer: "0",
  difficulty: "medium" as Difficulty,
  category_id: "",
  explanation: "",
};

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [uploading, setUploading] = useState(false);

  // List filters
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterDiff, setFilterDiff] = useState<string>("all");

  // Edit dialog
  const [editing, setEditing] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);

  // Check admin
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setChecking(false); return; }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
      setChecking(false);
    })();
  }, [user, authLoading]);

  useEffect(() => { if (isAdmin) loadData(); }, [isAdmin]);

  const loadData = async () => {
    setLoadingData(true);
    const [catsRes, qsRes] = await Promise.all([
      supabase.from("categories").select("id, name_ar, slug").order("name_ar"),
      supabase.from("questions").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    if (catsRes.data) setCategories(catsRes.data);
    if (qsRes.data) setQuestions(qsRes.data as unknown as Question[]);
    setLoadingData(false);
  };

  const handleClaimAdmin = async () => {
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_first_admin");
    setClaiming(false);
    if (error) return toast.error("حصل خطأ: " + error.message);
    if (data) { toast.success("تمت ترقيتك إلى Admin!"); setIsAdmin(true); }
    else toast.error("في admin موجود بالفعل");
  };

  const buildPayload = (f: typeof emptyForm) => {
    const options = [f.option1, f.option2, f.option3, f.option4].map((x) => x.trim()).filter(Boolean);
    return {
      question: f.question.trim(),
      options,
      correct_answer: parseInt(f.correct_answer),
      difficulty: f.difficulty,
      category_id: f.category_id || null,
      explanation: f.explanation.trim() || null,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.category_id) return toast.error("اختار فئة");
    const payload = buildPayload(form);
    if (payload.options.length < 2) return toast.error("لازم خيارين على الأقل");
    if (payload.correct_answer >= payload.options.length) return toast.error("رقم الإجابة الصحيحة غلط");
    setSubmitting(true);
    const { error } = await supabase.from("questions").insert({ ...payload, created_by: user.id });
    setSubmitting(false);
    if (error) return toast.error("فشل: " + error.message);
    toast.success("تم الإضافة!");
    setForm({ ...emptyForm, category_id: form.category_id, difficulty: form.difficulty });
    loadData();
  };

  const openEdit = (q: Question) => {
    setEditing(q);
    setEditForm({
      question: q.question,
      option1: q.options[0] || "",
      option2: q.options[1] || "",
      option3: q.options[2] || "",
      option4: q.options[3] || "",
      correct_answer: String(q.correct_answer),
      difficulty: q.difficulty,
      category_id: q.category_id || "",
      explanation: q.explanation || "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const payload = buildPayload(editForm);
    if (payload.options.length < 2) return toast.error("لازم خيارين على الأقل");
    setSavingEdit(true);
    const { error } = await supabase.from("questions").update(payload).eq("id", editing.id);
    setSavingEdit(false);
    if (error) return toast.error("فشل: " + error.message);
    toast.success("اتحفظ!");
    setEditing(null);
    loadData();
  };

  const toggleActive = async (q: Question) => {
    const { error } = await supabase.from("questions").update({ is_active: !q.is_active }).eq("id", q.id);
    if (error) return toast.error("فشل التحديث");
    setQuestions((prev) => prev.map((x) => x.id === q.id ? { ...x, is_active: !x.is_active } : x));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("متأكد إنك عايز تمسح السؤال ده؟")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) return toast.error("فشل المسح");
    toast.success("اتمسح");
    setQuestions((q) => q.filter((x) => x.id !== id));
  };

  const handleBulkUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const text = await file.text();
      let rows: Array<Record<string, unknown>> = [];

      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) throw new Error("الملف فاضي");
        const headers = parseCSVLine(lines[0]);
        rows = lines.slice(1).map((line) => {
          const values = parseCSVLine(line);
          const obj: Record<string, unknown> = {};
          headers.forEach((h, i) => (obj[h] = values[i]));
          return obj;
        });
      }

      const inserts = rows.map((r) => {
        const opts: string[] = [];
        if (Array.isArray(r.options)) opts.push(...(r.options as string[]));
        else for (const k of ["option1", "option2", "option3", "option4"])
          if (r[k]) opts.push(String(r[k]));
        const catSlug = String(r.category_slug || r.category || "").trim();
        const cat = categories.find((c) => c.slug === catSlug || c.name_ar === catSlug);
        return {
          question: String(r.question || "").trim(),
          options: opts.map((s) => s.trim()).filter(Boolean),
          correct_answer: parseInt(String(r.correct_answer ?? "0")),
          difficulty: (String(r.difficulty || "medium") as Difficulty),
          category_id: cat?.id || null,
          explanation: r.explanation ? String(r.explanation) : null,
          created_by: user.id,
        };
      }).filter((r) => r.question && r.options.length >= 2 && r.category_id);

      if (inserts.length === 0) {
        toast.error("مفيش أسئلة صالحة. تأكد من category_slug صح");
        setUploading(false);
        return;
      }

      const { error } = await supabase.from("questions").insert(inserts);
      if (error) toast.error("فشل: " + error.message);
      else { toast.success(`اتضاف ${inserts.length} سؤال!`); loadData(); }
    } catch (err) {
      toast.error("فشل في القراءة: " + (err as Error).message);
    }
    setUploading(false);
  };

  const downloadTemplate = (kind: "csv" | "json") => {
    const sample = [{
      question: "ما هي عاصمة مصر؟",
      option1: "القاهرة", option2: "الإسكندرية", option3: "الجيزة", option4: "أسوان",
      correct_answer: 0, difficulty: "easy",
      category_slug: categories[0]?.slug || "general",
      explanation: "القاهرة هي عاصمة مصر",
    }];
    let blob: Blob;
    let name: string;
    if (kind === "json") {
      blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
      name = "questions_template.json";
    } else {
      const headers = Object.keys(sample[0]);
      const csv = [
        headers.join(","),
        sample.map((r) => headers.map((h) => `"${String((r as Record<string, unknown>)[h]).replace(/"/g, '""')}"`).join(",")).join("\n"),
      ].join("\n");
      blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      name = "questions_template.csv";
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const stats = useMemo(() => {
    const byCategory = new Map<string, number>();
    const byDiff = { easy: 0, medium: 0, hard: 0 };
    let active = 0;
    for (const q of questions) {
      if (q.is_active) active++;
      if (q.category_id) byCategory.set(q.category_id, (byCategory.get(q.category_id) || 0) + 1);
      if (byDiff[q.difficulty] !== undefined) byDiff[q.difficulty]++;
    }
    return { total: questions.length, active, byCategory, byDiff };
  }, [questions]);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (filterCat !== "all" && q.category_id !== filterCat) return false;
      if (filterDiff !== "all" && q.difficulty !== filterDiff) return false;
      if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [questions, search, filterCat, filterDiff]);

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        
        <div className="container max-w-md mx-auto px-4 py-12">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Crown className="h-7 w-7 text-primary" />
              </div>
              <CardTitle>صفحة الأدمن</CardTitle>
              <CardDescription>
                مفيش عندك صلاحيات admin. لو إنت أول مستخدم، تقدر تطلب الصلاحية الآن.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleClaimAdmin} disabled={claiming} className="w-full">
                {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                طلب صلاحية Admin (لأول مستخدم)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      
      <div className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">لوحة الأدمن</h1>
            <p className="text-sm text-muted-foreground">إدارة الأسئلة والفئات</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<BookOpen className="h-4 w-4" />} label="إجمالي" value={stats.total} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="نشط" value={stats.active} tone="success" />
          <StatCard icon={<BarChart3 className="h-4 w-4" />} label="فئات" value={categories.length} />
          <StatCard icon={<XCircle className="h-4 w-4" />} label="معطّل" value={stats.total - stats.active} tone="muted" />
        </div>

        {/* Per-category breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">الأسئلة لكل فئة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Badge key={c.id} variant="outline" className="text-sm">
                  {c.name_ar}: <span className="font-bold mr-1">{stats.byCategory.get(c.id) || 0}</span>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-3 text-xs">
              <Badge className="bg-success/10 text-success hover:bg-success/10">سهل: {stats.byDiff.easy}</Badge>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">متوسط: {stats.byDiff.medium}</Badge>
              <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">صعب: {stats.byDiff.hard}</Badge>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="add">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add"><Plus className="h-4 w-4 ml-1" />إضافة</TabsTrigger>
            <TabsTrigger value="upload"><Upload className="h-4 w-4 ml-1" />رفع</TabsTrigger>
            <TabsTrigger value="list">القائمة ({stats.total})</TabsTrigger>
          </TabsList>

          {/* Add */}
          <TabsContent value="add">
            <Card>
              <CardHeader><CardTitle>إضافة سؤال جديد</CardTitle></CardHeader>
              <CardContent>
                <QuestionForm
                  form={form}
                  setForm={setForm}
                  categories={categories}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                  submitLabel="إضافة السؤال"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>رفع أسئلة بالجملة</CardTitle>
                <CardDescription>ارفع ملف CSV أو JSON</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UploadCard
                    icon={<FileSpreadsheet className="h-10 w-10 mx-auto text-primary mb-2" />}
                    title="CSV"
                    desc="الأعمدة: question, option1..option4, correct_answer, difficulty, category_slug, explanation"
                    accept=".csv"
                    id="csv-upload"
                    uploading={uploading}
                    onFile={handleBulkUpload}
                    onTemplate={() => downloadTemplate("csv")}
                  />
                  <UploadCard
                    icon={<FileJson className="h-10 w-10 mx-auto text-primary mb-2" />}
                    title="JSON"
                    desc="Array من objects بنفس الحقول"
                    accept=".json"
                    id="json-upload"
                    uploading={uploading}
                    onFile={handleBulkUpload}
                    onTemplate={() => downloadTemplate("json")}
                  />
                </div>

                {uploading && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">جاري الرفع...</span>
                  </div>
                )}

                <Card className="bg-muted/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">slugs الفئات المتاحة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((c) => (
                        <Badge key={c.id} variant="outline">{c.slug} = {c.name_ar}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* List */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>كل الأسئلة</CardTitle>
                <CardDescription>اضغط على سؤال للتعديل</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث في الأسئلة..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pr-9"
                    />
                  </div>
                  <Select value={filterCat} onValueChange={setFilterCat}>
                    <SelectTrigger><SelectValue placeholder="الفئة" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الفئات</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterDiff} onValueChange={setFilterDiff}>
                    <SelectTrigger><SelectValue placeholder="الصعوبة" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المستويات</SelectItem>
                      <SelectItem value="easy">سهل</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="hard">صعب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loadingData ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : filtered.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">مفيش نتائج</p>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((q) => {
                      const cat = categories.find((c) => c.id === q.category_id);
                      return (
                        <div
                          key={q.id}
                          className={`border rounded-lg p-3 flex items-start justify-between gap-3 transition-colors ${
                            q.is_active ? "bg-card" : "bg-muted/30 opacity-70"
                          }`}
                        >
                          <button
                            onClick={() => openEdit(q)}
                            className="flex-1 min-w-0 text-right hover:opacity-80"
                          >
                            <p className="font-medium mb-1.5 line-clamp-2">{q.question}</p>
                            <div className="flex flex-wrap gap-1.5 text-xs">
                              {cat && <Badge variant="secondary">{cat.name_ar}</Badge>}
                              <Badge variant="outline">{difficultyLabel(q.difficulty)}</Badge>
                              <Badge variant="outline" className="text-success border-success/40">
                                ✓ {q.options[q.correct_answer]}
                              </Badge>
                            </div>
                          </button>
                          <div className="flex flex-col items-center gap-2">
                            <Switch checked={q.is_active} onCheckedChange={() => toggleActive(q)} />
                            <Button size="icon" variant="ghost" onClick={() => openEdit(q)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(q.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>تعديل السؤال</DialogTitle></DialogHeader>
            <QuestionForm
              form={editForm}
              setForm={setEditForm}
              categories={categories}
              onSubmit={(e) => { e.preventDefault(); saveEdit(); }}
              submitting={savingEdit}
              submitLabel="حفظ التعديلات"
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "success" | "muted" }) => (
  <Card>
    <CardContent className="p-3">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        {icon}<span>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${tone === "success" ? "text-success" : tone === "muted" ? "text-muted-foreground" : ""}`}>
        {value}
      </div>
    </CardContent>
  </Card>
);

const UploadCard = ({
  icon, title, desc, accept, id, uploading, onFile, onTemplate,
}: {
  icon: React.ReactNode; title: string; desc: string; accept: string; id: string;
  uploading: boolean; onFile: (f: File) => void; onTemplate: () => void;
}) => (
  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
    {icon}
    <h3 className="font-semibold mb-1">{title}</h3>
    <p className="text-xs text-muted-foreground mb-3">{desc}</p>
    <input
      type="file" accept={accept} id={id} className="hidden"
      onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
    />
    <div className="flex gap-2 justify-center flex-wrap">
      <Button asChild variant="outline" size="sm" disabled={uploading}>
        <label htmlFor={id} className="cursor-pointer">اختار ملف</label>
      </Button>
      <Button variant="ghost" size="sm" onClick={onTemplate}>
        <Download className="h-3.5 w-3.5 ml-1" />قالب
      </Button>
    </div>
  </div>
);

const QuestionForm = ({
  form, setForm, categories, onSubmit, submitting, submitLabel,
}: {
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm) => void;
  categories: Category[];
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  submitLabel: string;
}) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div>
      <Label>السؤال</Label>
      <Textarea
        required value={form.question}
        onChange={(e) => setForm({ ...form, question: e.target.value })}
        placeholder="مثلاً: إيه عاصمة مصر؟"
      />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((n) => (
        <div key={n}>
          <Label>الخيار {n} {n <= 2 && <span className="text-destructive">*</span>}</Label>
          <Input
            required={n <= 2}
            value={form[`option${n}` as keyof typeof form] as string}
            onChange={(e) => setForm({ ...form, [`option${n}`]: e.target.value })}
          />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <Label>الإجابة الصحيحة</Label>
        <Select value={form.correct_answer} onValueChange={(v) => setForm({ ...form, correct_answer: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map((n) => (
              <SelectItem key={n} value={String(n - 1)}>الخيار {n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>الصعوبة</Label>
        <Select value={form.difficulty} onValueChange={(v: Difficulty) => setForm({ ...form, difficulty: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">سهل</SelectItem>
            <SelectItem value="medium">متوسط</SelectItem>
            <SelectItem value="hard">صعب</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>الفئة</Label>
        <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
          <SelectTrigger><SelectValue placeholder="اختار..." /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    <div>
      <Label>الشرح (اختياري)</Label>
      <Textarea
        value={form.explanation}
        onChange={(e) => setForm({ ...form, explanation: e.target.value })}
        placeholder="شرح الإجابة الصحيحة..."
      />
    </div>
    <Button type="submit" disabled={submitting} className="w-full">
      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      {submitLabel}
    </Button>
  </form>
);

const difficultyLabel = (d: Difficulty) =>
  d === "easy" ? "سهل" : d === "hard" ? "صعب" : "متوسط";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(current.trim()); current = "";
    } else current += c;
  }
  result.push(current.trim());
  return result;
}

export default Admin;
