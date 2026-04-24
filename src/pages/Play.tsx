import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trophy,
  Rocket,
  Puzzle,
  Globe2,
  ScrollText,
  FlaskConical,
  Palette,
  BookOpen,
  Film,
  Star,
  UtensilsCrossed,
  Cpu,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

type SubBranch = {
  id: string;
  title: string;
  hint: string;
};

type Category = {
  id: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  gradient: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  branches: [SubBranch, SubBranch, SubBranch, SubBranch];
};

const categories: Category[] = [
  {
    id: "sports",
    title: "رياضة",
    description: "كورة، أولمبياد، أبطال وأرقام قياسية",
    icon: Trophy,
    gradient: "from-emerald-500/20 to-teal-500/10",
    badge: "شعبي",
    badgeVariant: "default",
    branches: [
      { id: "football", title: "كورة قدم", hint: "دوريات، كؤوس، نجوم" },
      { id: "olympics", title: "أولمبياد", hint: "ميداليات وأرقام تاريخية" },
      { id: "combat", title: "رياضات قتالية", hint: "ملاكمة، MMA، مصارعة" },
      { id: "individual", title: "رياضات فردية", hint: "تنس، سباحة، جولف" },
    ],
  },
  {
    id: "space",
    title: "فضاء",
    description: "كواكب، مجرات، رواد ومهمات فضائية",
    icon: Rocket,
    gradient: "from-violet-500/20 to-purple-500/10",
    badge: "علمي",
    badgeVariant: "secondary",
    branches: [
      { id: "planets", title: "الكواكب", hint: "مجموعتنا الشمسية" },
      { id: "galaxies", title: "المجرات والنجوم", hint: "ما وراء النظام الشمسي" },
      { id: "missions", title: "المهمات الفضائية", hint: "ناسا، أبولو، مارس" },
      { id: "astronomers", title: "علماء الفلك", hint: "من بطليموس لهوكينج" },
    ],
  },
  {
    id: "puzzles",
    title: "ألغاز",
    description: "لغز، فزّورة، تفكير منطقي وحلول ذكية",
    icon: Puzzle,
    gradient: "from-amber-500/20 to-orange-500/10",
    badge: "تفكير",
    badgeVariant: "default",
    branches: [
      { id: "logic", title: "ألغاز منطقية", hint: "استنتاج وتسلسل" },
      { id: "math", title: "ألغاز رياضية", hint: "أرقام ومعادلات" },
      { id: "riddles", title: "فزازير شعبية", hint: "ألغاز تراثية" },
      { id: "lateral", title: "تفكير جانبي", hint: "حلول خارج الصندوق" },
    ],
  },
  {
    id: "geography",
    title: "جغرافيا",
    description: "دول، عواصم، جبال، بحار ومعالم",
    icon: Globe2,
    gradient: "from-cyan-500/20 to-sky-500/10",
    badge: "العالم",
    badgeVariant: "secondary",
    branches: [
      { id: "capitals", title: "العواصم", hint: "عاصمة كل دولة" },
      { id: "landmarks", title: "معالم شهيرة", hint: "أهرامات، إيفل، تاج محل" },
      { id: "nature", title: "جبال وأنهار", hint: "أعلى، أطول، أكبر" },
      { id: "flags", title: "أعلام الدول", hint: "اعرف الدولة من علمها" },
    ],
  },
  {
    id: "history",
    title: "تاريخ",
    description: "حضارات، حروب، شخصيات وتواريخ مهمة",
    icon: ScrollText,
    gradient: "from-yellow-500/20 to-amber-500/10",
    badge: "كلاسيك",
    badgeVariant: "outline",
    branches: [
      { id: "ancient", title: "الحضارات القديمة", hint: "فراعنة، إغريق، رومان" },
      { id: "islamic", title: "تاريخ إسلامي", hint: "خلافات وفتوحات" },
      { id: "modern", title: "العصر الحديث", hint: "حربان عالميتان وما بعدها" },
      { id: "figures", title: "شخصيات تاريخية", hint: "قادة، علماء، مفكرين" },
    ],
  },
  {
    id: "science",
    title: "علوم",
    description: "فيزياء، كيمياء، أحياء واختراعات",
    icon: FlaskConical,
    gradient: "from-blue-500/20 to-indigo-500/10",
    badge: "جديد",
    badgeVariant: "default",
    branches: [
      { id: "physics", title: "فيزياء", hint: "حركة، طاقة، نسبية" },
      { id: "chemistry", title: "كيمياء", hint: "عناصر وتفاعلات" },
      { id: "biology", title: "أحياء", hint: "خلايا، حيوانات، نباتات" },
      { id: "inventions", title: "اختراعات", hint: "من جربها لأول مرة؟" },
    ],
  },
  {
    id: "art",
    title: "فن",
    description: "لوحات، رسامين، موسيقى وفنون عالمية",
    icon: Palette,
    gradient: "from-pink-500/20 to-rose-500/10",
    branches: [
      { id: "paintings", title: "لوحات شهيرة", hint: "موناليزا وصحبتها" },
      { id: "painters", title: "رسامين عالميين", hint: "بيكاسو، فان جوخ" },
      { id: "music", title: "موسيقى", hint: "كلاسيك وحديث" },
      { id: "architecture", title: "عمارة", hint: "طرز وأنماط معمارية" },
    ],
  },
  {
    id: "religion",
    title: "ثقافة دينية",
    description: "أنبياء، صحابة، أديان ومعلومات عامة",
    icon: BookOpen,
    gradient: "from-emerald-500/20 to-green-500/10",
    badge: "ثقافة",
    badgeVariant: "secondary",
    branches: [
      { id: "prophets", title: "الأنبياء", hint: "قصص وعبر" },
      { id: "companions", title: "الصحابة", hint: "سيرة وأحداث" },
      { id: "quran", title: "قرآن وحديث", hint: "آيات وسور" },
      { id: "religions", title: "أديان العالم", hint: "ثقافة دينية مقارنة" },
    ],
  },
  {
    id: "movies",
    title: "أفلام ومسلسلات",
    description: "هوليوود، عربي، أنمي وممثلين",
    icon: Film,
    gradient: "from-red-500/20 to-orange-500/10",
    badge: "ترفيه",
    badgeVariant: "outline",
    branches: [
      { id: "hollywood", title: "هوليوود", hint: "أبطال وأوسكار" },
      { id: "arabic", title: "أفلام ومسلسلات عربية", hint: "كلاسيك ومعاصر" },
      { id: "anime", title: "أنمي وكرتون", hint: "ناروتو، ون بيس وغيرهم" },
      { id: "series", title: "مسلسلات عالمية", hint: "Netflix و HBO" },
    ],
  },
  {
    id: "celebrities",
    title: "مشاهير",
    description: "فنانين، رياضيين ومؤثرين",
    icon: Star,
    gradient: "from-fuchsia-500/20 to-pink-500/10",
    branches: [
      { id: "singers", title: "مغنيين", hint: "عرب وأجانب" },
      { id: "actors", title: "ممثلين", hint: "نجوم الشاشة" },
      { id: "athletes", title: "رياضيين", hint: "أساطير الرياضة" },
      { id: "influencers", title: "مؤثرين", hint: "نجوم السوشيال ميديا" },
    ],
  },
  {
    id: "food",
    title: "أكل ومطبخ",
    description: "أكلات شعبية، مكونات وطبخ عالمي",
    icon: UtensilsCrossed,
    gradient: "from-orange-500/20 to-red-500/10",
    branches: [
      { id: "arabic-food", title: "أكل عربي", hint: "كشري، كبسة، مسخن" },
      { id: "world-food", title: "مطابخ العالم", hint: "إيطالي، ياباني، هندي" },
      { id: "ingredients", title: "مكونات وتوابل", hint: "بهارات ونكهات" },
      { id: "desserts", title: "حلويات", hint: "شرقي وغربي" },
    ],
  },
  {
    id: "tech",
    title: "تكنولوجيا",
    description: "كمبيوتر، إنترنت، شركات وتطبيقات",
    icon: Cpu,
    gradient: "from-amber-500/20 to-primary/10",
    badge: "Trendy",
    badgeVariant: "default",
    branches: [
      { id: "companies", title: "شركات تقنية", hint: "Apple, Google, Meta" },
      { id: "internet", title: "إنترنت وويب", hint: "تاريخ الشبكة" },
      { id: "ai", title: "ذكاء اصطناعي", hint: "ML, AI, GPT" },
      { id: "gadgets", title: "أجهزة وتطبيقات", hint: "موبايلات وأبس" },
    ],
  },
];

const Play = () => {
  const [selected, setSelected] = useState<Category | null>(null);

  const handleBranch = (cat: Category, branch: SubBranch) => {
    toast.info("التفرع ده هيتفعّل في المرحلة الجاية 🔓", {
      description: `${cat.title} - ${branch.title}`,
    });
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <Navbar />
      <div className="container py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 space-y-3">
          <h1 className="text-3xl md:text-5xl font-extrabold">
            اختار <span className="gradient-text">الفئة</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">
            12 فئة معرفية - وكل فئة فيها 4 تخصصات فرعية. اختار اللي يحمسك دلوقتي
          </p>
        </div>

        {/* Categories grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelected(cat)}
                className="group text-right"
              >
                <Card
                  className={`relative overflow-hidden border-primary/10 bg-gradient-to-br ${cat.gradient} backdrop-blur-sm transition-bounce hover:border-primary/40 hover:shadow-elevated hover:-translate-y-1 h-full`}
                >
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/20 group-hover:scale-110 group-hover:bg-primary/25 transition-bounce">
                        <Icon className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                      </div>
                      {cat.badge && (
                        <Badge variant={cat.badgeVariant ?? "secondary"} className="text-[10px] md:text-xs">
                          {cat.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg md:text-xl font-extrabold leading-tight">
                        {cat.title}
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                        {cat.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-primary/10">
                      <span className="text-[11px] md:text-xs text-muted-foreground">
                        4 تخصصات فرعية
                      </span>
                      <ChevronLeft className="h-4 w-4 text-primary/70 group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="mt-10 text-center">
          <p className="text-xs md:text-sm text-muted-foreground">
            🎯 اضغط على فئة عشان تشوف الـ 4 تخصصات الفرعية بتاعتها
          </p>
        </div>
      </div>

      {/* Branches dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader className="text-right">
                <div className="flex items-center gap-3 mb-2">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/20">
                    <selected.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-extrabold">
                      {selected.title}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      اختار التخصص الفرعي اللي تحب تلعب فيه
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {selected.branches.map((branch, idx) => (
                  <button
                    key={branch.id}
                    onClick={() => handleBranch(selected, branch)}
                    className="text-right group"
                  >
                    <Card
                      className={`border-primary/10 bg-gradient-to-br ${selected.gradient} backdrop-blur-sm transition-bounce hover:border-primary/40 hover:shadow-elevated hover:-translate-y-0.5 h-full`}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px]">
                            فرع {idx + 1}
                          </Badge>
                          <ChevronLeft className="h-4 w-4 text-primary/70 group-hover:-translate-x-1 transition-transform" />
                        </div>
                        <h4 className="text-base md:text-lg font-bold">
                          {branch.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {branch.hint}
                        </p>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Play;
