import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Upload, Trash2, ShieldCheck, FileJson, FileSpreadsheet, Crown } from "lucide-react";
import { toast } from "sonner";

type Category = { id: string; name_ar: string; slug: string };
type Question = {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  difficulty: "easy" | "medium" | "hard";
  category_id: string | null;
  is_active: boolean;
};

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form state
  const [form, setForm] = useState({
    question: "",
    option1: "",
    option2: "",
    option3: "",
    option4: "",
    correct_answer: "0",
    difficulty: "medium" as "easy" | "medium" | "hard",
    category_id: "",
    explanation: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Bulk upload
  const [uploading, setUploading] = useState(false);

  // Check admin role
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setChecking(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) console.error(error);
      setIsAdmin(!!data);
      setChecking(false);
    })();
  }, [user, authLoading]);

  // Load data
  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoadingData(true);
    const [catsRes, qsRes] = await Promise.all([
      supabase.from("categories").select("id, name_ar, slug").order("name_ar"),
      supabase.from("questions").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (catsRes.data) setCategories(catsRes.data);
    if (qsRes.data) setQuestions(qsRes.data as unknown as Question[]);
    setLoadingData(false);
  };

  const handleClaimAdmin = async () => {
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_first_admin");
    setClaiming(false);
    if (error) {
      toast.error("حصل خطأ: " + error.message);
      return;
    }
    if (data) {
      toast.success("تمت ترقيتك إلى Admin!");
      setIsAdmin(true);
    } else {
      toast.error("في admin موجود بالفعل");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.category_id) {
      toast.error("اختار فئة");
      return;
    }
    const options = [form.option1, form.option2, form.option3, form.option4].filter(Boolean);
    if (options.length < 2) {
      toast.error("لازم خيارين على الأقل");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("questions").insert({
      question: form.question.trim(),
      options,
      correct_answer: parseInt(form.correct_answer),
      difficulty: form.difficulty,
      category_id: form.category_id,
      explanation: form.explanation.trim() || null,
      created_by: user.id,
    });
    setSubmitting(false);
    if (error) {
      toast.error("فشل: " + error.message);
      return;
    }
    toast.success("تم الإضافة!");
    setForm({
      question: "",
      option1: "",
      option2: "",
      option3: "",
      option4: "",
      correct_answer: "0",
      difficulty: "medium",
      category_id: form.category_id,
      explanation: "",
    });
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("متأكد إنك عايز تمسح السؤال ده؟")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) {
      toast.error("فشل المسح");
      return;
    }
    toast.success("اتمسح");
    setQuestions((q) => q.filter((x) => x.id !== id));
  };

  const handleBulkUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const text = await file.text();
      let rows: Array<Record<string, unknown>> = [];

      if (file.name.endsWith(".json")) {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // CSV parsing
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        rows = lines.slice(1).map((line) => {
          const values = parseCSVLine(line);
          const obj: Record<string, unknown> = {};
          headers.forEach((h, i) => (obj[h] = values[i]));
          return obj;
        });
      }

      const inserts = rows.map((r) => {
        const opts: string[] = [];
        if (Array.isArray(r.options)) {
          opts.push(...(r.options as string[]));
        } else {
          for (const k of ["option1", "option2", "option3", "option4"]) {
            if (r[k]) opts.push(String(r[k]));
          }
        }
        const catSlug = String(r.category_slug || r.category || "").trim();
        const cat = categories.find((c) => c.slug === catSlug || c.name_ar === catSlug);
        return {
          question: String(r.question || "").trim(),
          options: opts,
          correct_answer: parseInt(String(r.correct_answer ?? "0")),
          difficulty: (String(r.difficulty || "medium") as "easy" | "medium" | "hard"),
          category_id: cat?.id || null,
          explanation: r.explanation ? String(r.explanation) : null,
          created_by: user.id,
        };
      }).filter((r) => r.question && r.options.length >= 2 && r.category_id);

      if (inserts.length === 0) {
        toast.error("مفيش أسئلة صالحة في الملف");
        setUploading(false);
        return;
      }

      const { error } = await supabase.from("questions").insert(inserts);
      if (error) {
        toast.error("فشل: " + error.message);
      } else {
        toast.success(`اتضاف ${inserts.length} سؤال!`);
        loadData();
      }
    } catch (err) {
      toast.error("فشل في قراءة الملف: " + (err as Error).message);
    }
    setUploading(false);
  };

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
        <Navbar />
        <div className="container max-w-md mx-auto px-4 py-12">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Crown className="h-7 w-7 text-primary" />
              </div>
              <CardTitle>صفحة الأدمن</CardTitle>
              <CardDescription>
                مفيش عندك صلاحيات admin. لو إنت أول مستخدم في النظام، تقدر تطلب الصلاحية الآن.
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
      <Navbar />
      <div className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">لوحة الأدمن</h1>
            <p className="text-sm text-muted-foreground">إدارة الأسئلة والفئات</p>
          </div>
        </div>

        <Tabs defaultValue="add">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add"><Plus className="h-4 w-4 ml-1" />إضافة</TabsTrigger>
            <TabsTrigger value="upload"><Upload className="h-4 w-4 ml-1" />رفع ملف</TabsTrigger>
            <TabsTrigger value="list">القائمة ({questions.length})</TabsTrigger>
          </TabsList>

          {/* Add single question */}
          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>إضافة سؤال جديد</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>السؤال</Label>
                    <Textarea
                      required
                      value={form.question}
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
                          <SelectItem value="0">الخيار 1</SelectItem>
                          <SelectItem value="1">الخيار 2</SelectItem>
                          <SelectItem value="2">الخيار 3</SelectItem>
                          <SelectItem value="3">الخيار 4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>الصعوبة</Label>
                      <Select value={form.difficulty} onValueChange={(v: "easy" | "medium" | "hard") => setForm({ ...form, difficulty: v })}>
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
                    إضافة السؤال
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk upload */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>رفع أسئلة بالجملة</CardTitle>
                <CardDescription>ارفع ملف CSV أو JSON فيه أسئلة كتير مرة واحدة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <FileSpreadsheet className="h-10 w-10 mx-auto text-primary mb-2" />
                    <h3 className="font-semibold mb-1">CSV</h3>
                    <p className="text-xs text-muted-foreground mb-3">الأعمدة: question, option1, option2, option3, option4, correct_answer, difficulty, category_slug, explanation</p>
                    <input
                      type="file"
                      accept=".csv"
                      id="csv-upload"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleBulkUpload(e.target.files[0])}
                    />
                    <Button asChild variant="outline" size="sm" disabled={uploading}>
                      <label htmlFor="csv-upload" className="cursor-pointer">اختار ملف CSV</label>
                    </Button>
                  </div>

                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <FileJson className="h-10 w-10 mx-auto text-primary mb-2" />
                    <h3 className="font-semibold mb-1">JSON</h3>
                    <p className="text-xs text-muted-foreground mb-3">Array من objects بنفس الحقول</p>
                    <input
                      type="file"
                      accept=".json"
                      id="json-upload"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleBulkUpload(e.target.files[0])}
                    />
                    <Button asChild variant="outline" size="sm" disabled={uploading}>
                      <label htmlFor="json-upload" className="cursor-pointer">اختار ملف JSON</label>
                    </Button>
                  </div>
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
                        <Badge key={c.id} variant="outline">
                          {c.slug} = {c.name_ar}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <details className="text-sm">
                  <summary className="cursor-pointer font-semibold">مثال JSON</summary>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto" dir="ltr">{`[
  {
    "question": "ما هي عاصمة مصر؟",
    "option1": "القاهرة",
    "option2": "الإسكندرية",
    "option3": "الجيزة",
    "option4": "أسوان",
    "correct_answer": 0,
    "difficulty": "easy",
    "category_slug": "geography",
    "explanation": "القاهرة هي عاصمة مصر منذ عام 969م"
  }
]`}</pre>
                </details>
              </CardContent>
            </Card>
          </TabsContent>

          {/* List */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>كل الأسئلة</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : questions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">مفيش أسئلة لسه</p>
                ) : (
                  <div className="space-y-2">
                    {questions.map((q) => {
                      const cat = categories.find((c) => c.id === q.category_id);
                      return (
                        <div key={q.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium mb-1 truncate">{q.question}</p>
                            <div className="flex flex-wrap gap-1.5 text-xs">
                              {cat && <Badge variant="secondary">{cat.name_ar}</Badge>}
                              <Badge variant="outline">{q.difficulty}</Badge>
                              <Badge variant="outline" className="text-success">
                                ✓ {q.options[q.correct_answer]}
                              </Badge>
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(q.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Simple CSV line parser handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += c;
  }
  result.push(current.trim());
  return result;
}

export default Admin;
