import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Users,
  Calendar,
  Zap,
  Trophy,
  Swords,
  Clock,
  Crown,
  Target,
  Flame,
  Dices,
  Sparkles,
  Lock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type GameMode = {
  id: string;
  title: string;
  description: string;
  icon: typeof Brain;
  gradient: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  available: boolean;
  route?: string;
};

const modes: GameMode[] = [
  {
    id: "solo",
    title: "اللعب الفردي",
    description: "اختر فئة وصعوبة وعدد أسئلة وابدأ",
    icon: Brain,
    gradient: "from-amber-500/20 to-orange-500/10",
    badge: "كلاسيك",
    badgeVariant: "default",
    available: false,
  },
  {
    id: "daily",
    title: "التحدي اليومي",
    description: "10 أسئلة جديدة كل يوم + XP مضاعف",
    icon: Calendar,
    gradient: "from-emerald-500/20 to-teal-500/10",
    badge: "+2x XP",
    badgeVariant: "secondary",
    available: false,
  },
  {
    id: "rooms",
    title: "غرف جماعية لايف",
    description: "ادخل بكود وألعب مع أصحابك مباشر",
    icon: Users,
    gradient: "from-violet-500/20 to-purple-500/10",
    badge: "Realtime",
    badgeVariant: "default",
    available: false,
  },
  {
    id: "blitz",
    title: "وضع البرق",
    description: "60 ثانية، أكبر عدد إجابات صح",
    icon: Zap,
    gradient: "from-yellow-500/20 to-amber-500/10",
    badge: "سريع",
    badgeVariant: "secondary",
    available: false,
  },
  {
    id: "survival",
    title: "وضع البقاء",
    description: "غلطة واحدة وتخرج - وصّل لأبعد ما تقدر",
    icon: Flame,
    gradient: "from-red-500/20 to-orange-500/10",
    badge: "صعب",
    badgeVariant: "destructive",
    available: false,
  },
  {
    id: "duel",
    title: "مبارزة 1 ضد 1",
    description: "تحدي مباشر مع لاعب عشوائي أو صديق",
    icon: Swords,
    gradient: "from-blue-500/20 to-cyan-500/10",
    badge: "PvP",
    badgeVariant: "default",
    available: false,
  },
  {
    id: "tournament",
    title: "البطولات الأسبوعية",
    description: "جوائز XP ضخمة وميداليات",
    icon: Trophy,
    gradient: "from-amber-500/20 to-yellow-500/10",
    badge: "أسبوعي",
    badgeVariant: "secondary",
    available: false,
  },
  {
    id: "category-master",
    title: "ملك الفئة",
    description: "اتقن فئة كاملة وافتح لقب خاص",
    icon: Crown,
    gradient: "from-pink-500/20 to-rose-500/10",
    badge: "إنجاز",
    badgeVariant: "outline",
    available: false,
  },
  {
    id: "marathon",
    title: "ماراثون 50 سؤال",
    description: "تحدي طويل بكل الفئات والصعوبات",
    icon: Target,
    gradient: "from-indigo-500/20 to-blue-500/10",
    badge: "ماراثون",
    badgeVariant: "secondary",
    available: false,
  },
  {
    id: "speed",
    title: "ضد الزمن",
    description: "10 ثواني فقط لكل سؤال",
    icon: Clock,
    gradient: "from-cyan-500/20 to-sky-500/10",
    badge: "سرعة",
    badgeVariant: "secondary",
    available: false,
  },
  {
    id: "random",
    title: "عشوائي مفاجئ",
    description: "فئة وصعوبة عشوائية كل سؤال",
    icon: Dices,
    gradient: "from-fuchsia-500/20 to-pink-500/10",
    badge: "مغامرة",
    badgeVariant: "outline",
    available: false,
  },
  {
    id: "ai",
    title: "تحدي الذكاء الاصطناعي",
    description: "أسئلة يولّدها AI لحظياً عن أي موضوع تختاره",
    icon: Sparkles,
    gradient: "from-amber-500/20 to-primary/10",
    badge: "AI",
    badgeVariant: "default",
    available: false,
  },
];

const Play = () => {
  const navigate = useNavigate();

  const handleSelect = (mode: GameMode) => {
    if (mode.available && mode.route) {
      navigate(mode.route);
    } else {
      toast.info("الوضع ده هيتفعّل في المرحلة الجاية 🔓", {
        description: mode.title,
      });
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <Navbar />
      <div className="container py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 space-y-3">
          <h1 className="text-3xl md:text-5xl font-extrabold">
            اختار <span className="gradient-text">وضع اللعب</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">
            12 وضع مختلف - من الكلاسيك للمبارزات اللايف. اختار اللي يناسب مزاجك دلوقتي
          </p>
        </div>

        {/* Modes grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => handleSelect(mode)}
                className="group text-right"
              >
                <Card
                  className={`relative overflow-hidden border-primary/10 bg-gradient-to-br ${mode.gradient} backdrop-blur-sm transition-bounce hover:border-primary/40 hover:shadow-elevated hover:-translate-y-1 h-full`}
                >
                  {!mode.available && (
                    <div className="absolute top-3 left-3 z-10">
                      <div className="rounded-full bg-background/80 backdrop-blur p-1.5">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/20 group-hover:scale-110 group-hover:bg-primary/25 transition-bounce">
                        <Icon className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                      </div>
                      {mode.badge && (
                        <Badge variant={mode.badgeVariant ?? "secondary"} className="text-[10px] md:text-xs">
                          {mode.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg md:text-xl font-extrabold leading-tight">
                        {mode.title}
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                        {mode.description}
                      </p>
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
            🔒 الأوضاع هتتفتح تباعاً مع كل مرحلة من تطوير اللعبة
          </p>
        </div>
      </div>
    </div>
  );
};

export default Play;
